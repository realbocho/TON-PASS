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

  // Get creator
  const { data: creator, error: creatorError } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('link_slug', creatorSlug)
    .eq('is_active', true)
    .single();

  if (creatorError || !creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Check if fan already has an active/pending subscription
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id, status')
    .eq('creator_id', creator.id)
    .eq('fan_twitter_id', session.user.telegramId)
    .in('status', ['pending_payment', 'pending_approval', 'approved'])
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'You already have an active or pending subscription' },
      { status: 409 },
    );
  }

  const fees = calculateFee(creator.subscription_price_ton);

  // Create payment record
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({
      creator_id: creator.id,
      fan_twitter_id: session.user.telegramId,
      fan_twitter_username: session.user.telegramUsername,
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
  const creatorAmountNano = toNano(fees.amount).toString();
  const feeAmountNano = toNano(fees.fee).toString();

  return NextResponse.json({
    payment,
    tonPayment: {
      // Two separate messages: creator gets subscription amount, platform gets 5% fee
      messages: [
        {
          address: creator.payment_address,
          amountNano: creatorAmountNano,
          comment,
        },
        {
          address: PLATFORM_WALLET,
          amountNano: feeAmountNano,
          comment: `FEE-${payment.id}`,
        },
      ],
      amountTon: fees.amount,
      feeTon: fees.fee,
      totalTon: fees.total,
    },
  });
}
