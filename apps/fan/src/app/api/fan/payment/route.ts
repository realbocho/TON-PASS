import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateFee } from '@ton-pass/shared';
import { toNano, buildPaymentComment } from '@/lib/ton';

// Platform wallet (W5) - receives 5% fee
const PLATFORM_WALLET = 'UQAfdeijx6QgEcO97eVfSsTYtC20_-bfLePj7Bl2162XIkjG';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorSlug } = await req.json();

  // Get creator + referrer info
  const { data: creator, error: creatorError } = await supabaseAdmin
    .from('creators')
    .select('*, referred_by:referred_by_creator_id(payment_address, revenue_share_enabled, revenue_share_pct)')
    .eq('link_slug', creatorSlug)
    .eq('is_active', true)
    .single();

  if (creatorError || !creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // fan_telegram_id 기준 중복 체크 (fan_twitter_id도 fallback)
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id, status')
    .eq('creator_id', creator.id)
    .eq('fan_telegram_id', session.user.telegramId)
    .in('status', ['pending_payment', 'pending_approval', 'approved'])
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'You already have an active or pending subscription' },
      { status: 409 },
    );
  }

  const fees = calculateFee(creator.subscription_price_ton);

  // 추천인 revenue share 계산
  const referrer = (creator as any).referred_by;
  let referrerShareNano = BigInt(0);
  let platformNano = toNano(fees.fee);

  if (referrer?.payment_address && referrer?.revenue_share_enabled) {
    const sharePct = referrer.revenue_share_pct ?? 20;
    // 수수료의 sharePct% → 추천인, 나머지 → 운영자
    referrerShareNano = toNano(fees.fee) * BigInt(sharePct) / BigInt(100);
    platformNano = toNano(fees.fee) - referrerShareNano;
  }

  // Create payment record
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({
      creator_id: creator.id,
      fan_telegram_id: session.user.telegramId,
      fan_telegram_username: session.user.telegramUsername,
      fan_twitter_id: session.user.telegramId,
      fan_twitter_username: session.user.telegramUsername || session.user.telegramName,
      fan_twitter_avatar: session.user.telegramAvatar,
      amount_ton: fees.amount,
      fee_ton: fees.fee,
      total_ton: fees.total,
      status: 'pending_payment',
    })
    .select()
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }

  const comment = buildPaymentComment(payment.id);

  const messages: { address: string; amountNano: string; comment: string }[] = [
    {
      address: creator.payment_address,
      amountNano: toNano(fees.amount).toString(),
      comment,
    },
    {
      address: PLATFORM_WALLET,
      amountNano: platformNano.toString(),
      comment: `FEE-${payment.id}`,
    },
  ];

  // 추천인 몫 메시지 추가
  if (referrer?.payment_address && referrerShareNano > BigInt(0)) {
    messages.push({
      address: referrer.payment_address,
      amountNano: referrerShareNano.toString(),
      comment: `REF-${payment.id}`,
    });
  }

  return NextResponse.json({
    payment,
    tonPayment: {
      messages,
      amountTon: fees.amount,
      feeTon: fees.fee,
      totalTon: fees.total,
    },
  });
}
