import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyNewPayment } from '@/lib/telegram';
import { calculateFee } from '@ton-pass/shared';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tempId, creatorSlug } = await req.json();

  if (!tempId || !creatorSlug) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('link_slug', creatorSlug)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Double-check no duplicate
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('creator_id', creator.id)
    .eq('fan_twitter_id', session.user.telegramId)
    .in('status', ['pending_approval', 'approved'])
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'You already have an active or pending subscription' },
      { status: 409 },
    );
  }

  const fees = calculateFee(creator.subscription_price_ton);

  // Save to DB after wallet confirmed
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({
      creator_id: creator.id,
      fan_twitter_id: session.user.telegramId,
      fan_twitter_username: session.user.telegramUsername || session.user.telegramName,
      fan_twitter_avatar: session.user.telegramAvatar,
      fan_telegram_username: session.user.telegramUsername,
      fan_telegram_id: session.user.telegramId,
      amount_ton: fees.amount,
      fee_ton: fees.fee,
      total_ton: fees.total,
      ton_tx_hash: tempId,
      ton_tx_confirmed: true,
      status: 'pending_approval',
    })
    .select()
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: 'Failed to save payment' }, { status: 500 });
  }

  // Notify creator via Telegram
  if (creator.telegram_chat_id) {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://ton-pass.vercel.app';
    await notifyNewPayment({
      chatId: creator.telegram_chat_id,
      fanUsername: session.user.telegramUsername || session.user.telegramName,
      amountTon: fees.amount,
      dashboardUrl: `${baseUrl}/dashboard`,
    });
  }

  return NextResponse.json({
    success: true,
    paymentId: payment.id,
    telegramChannelLink: creator.telegram_channel_link,
    telegramChannelName: creator.telegram_channel_name,
  });
}
