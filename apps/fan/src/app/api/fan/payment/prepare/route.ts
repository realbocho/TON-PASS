import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateFee } from '@ton-pass/shared';
import { toNano } from '@/lib/ton';
import { randomUUID } from 'crypto';

const PLATFORM_WALLET = 'UQAfdeijx6QgEcO97eVfSsTYtC20_-bfLePj7Bl2162XIkjG';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorSlug } = await req.json();

  // Get creator + referrer info
  const { data: creator, error } = await supabaseAdmin
    .from('creators')
    .select('*, referred_by:referred_by_creator_id(payment_address, revenue_share_enabled, revenue_share_pct)')
    .eq('link_slug', creatorSlug)
    .eq('is_active', true)
    .single();

  if (error || !creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // fan_telegram_id 기준 중복 체크
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id, status, expires_at')
    .eq('creator_id', creator.id)
    .eq('fan_telegram_id', session.user.telegramId)
    .in('status', ['pending_approval', 'approved'])
    .single();

  if (existing) {
    if (existing.status === 'approved' && existing.expires_at) {
      const daysLeft = (new Date(existing.expires_at).getTime() - Date.now()) / 86400000;
      if (daysLeft > 3) {
        return NextResponse.json(
          { error: 'You already have an active subscription. Renewal is available 3 days before expiry.' },
          { status: 409 },
        );
      }
      // 갱신 허용 - 기존 만료 처리
      await supabaseAdmin
        .from('payments')
        .update({ status: 'expired' })
        .eq('id', existing.id);
    } else if (existing.status === 'pending_approval') {
      return NextResponse.json(
        { error: 'You already have a pending subscription.' },
        { status: 409 },
      );
    }
  }

  const fees = calculateFee(creator.subscription_price_ton);
  const tempId = randomUUID();

  // 추천인 revenue share 계산 (운영자 수수료의 일부를 추천인 지갑으로 직송)
  const referrer = (creator as any).referred_by;
  let referrerShareNano = BigInt(0);
  let platformNano = toNano(fees.fee);

  if (referrer?.payment_address && referrer?.revenue_share_enabled) {
    const sharePct = referrer.revenue_share_pct ?? 20;
    referrerShareNano = toNano(fees.fee) * BigInt(sharePct) / BigInt(100);
    platformNano = toNano(fees.fee) - referrerShareNano;
  }

  const messages: { address: string; amountNano: string; comment: string }[] = [
    {
      address: creator.payment_address,
      amountNano: toNano(fees.amount).toString(),
      comment: `TONPASS-${tempId}`,
    },
    {
      address: PLATFORM_WALLET,
      amountNano: platformNano.toString(),
      comment: `FEE-${tempId}`,
    },
  ];

  if (referrer?.payment_address && referrerShareNano > BigInt(0)) {
    messages.push({
      address: referrer.payment_address,
      amountNano: referrerShareNano.toString(),
      comment: `REF-${tempId}`,
    });
  }

  return NextResponse.json({
    tempId,
    tonPayment: {
      messages,
      amountTon: fees.amount,
      feeTon: fees.fee,
      totalTon: fees.total,
    },
  });
}
