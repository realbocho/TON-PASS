import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorSlug } = await req.json();

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, free_trial_enabled, free_trial_days, telegram_channel_link, telegram_channel_name, private_account_username')
    .eq('link_slug', creatorSlug)
    .eq('is_active', true)
    .single();

  if (!creator?.free_trial_enabled || !creator.free_trial_days) {
    return NextResponse.json({ error: 'Free trial not available' }, { status: 403 });
  }

  // Check if already used free trial
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('creator_id', creator.id)
    .eq('fan_telegram_id', session.user.telegramId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Free trial already used' }, { status: 409 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + creator.free_trial_days * 86400 * 1000);

  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({
      creator_id: creator.id,
      fan_telegram_id: session.user.telegramId,
      fan_twitter_id: session.user.telegramId,
      fan_twitter_username: session.user.telegramUsername || session.user.telegramName,
      fan_twitter_avatar: session.user.telegramAvatar,
      fan_telegram_username: session.user.telegramUsername,
      amount_ton: 0,
      fee_ton: 0,
      total_ton: 0,
      ton_tx_confirmed: true,
      status: 'approved',
      is_free_trial: true,
      subscribed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      approved_at: now.toISOString(),
    })
    .select()
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    trialDays: creator.free_trial_days,
    expiresAt: expiresAt.toISOString(),
    telegramChannelLink: creator.telegram_channel_link,
    telegramChannelName: creator.telegram_channel_name,
  });
}
