import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyNewPayment } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorSlug } = await req.json();

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, free_trial_enabled, free_trial_days, telegram_channel_link, telegram_channel_name, telegram_chat_id')
    .eq('link_slug', creatorSlug)
    .eq('is_active', true)
    .single();

  if (!creator?.free_trial_enabled || !creator.free_trial_days) {
    return NextResponse.json({ error: 'Free trial not available' }, { status: 403 });
  }

  // fan_telegram_id 기준으로 중복 체크 (fan_twitter_id도 같이 체크)
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('creator_id', creator.id)
    .eq('fan_telegram_id', session.user.telegramId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Free trial already used' }, { status: 409 });
  }

  // pending_approval로 저장 → 크리에이터 대시보드 Pending 탭에 표시됨
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({
      creator_id: creator.id,
      fan_telegram_id: session.user.telegramId,
      fan_telegram_username: session.user.telegramUsername,
      fan_twitter_id: session.user.telegramId,
      fan_twitter_username: session.user.telegramUsername || session.user.telegramName,
      fan_twitter_avatar: session.user.telegramAvatar,
      amount_ton: 0,
      fee_ton: 0,
      total_ton: 0,
      ton_tx_confirmed: true,
      status: 'pending_approval',   // ← pending으로 넣어 크리에이터가 승인하도록
      is_free_trial: true,
    })
    .select()
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
  }

  // 크리에이터에게 알림 (결제 알림과 동일하게)
  if (creator.telegram_chat_id) {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://ton-pass.vercel.app';
    await notifyNewPayment({
      chatId: creator.telegram_chat_id,
      fanUsername: session.user.telegramUsername || session.user.telegramName,
      amountTon: 0,
      dashboardUrl: `${baseUrl}/dashboard`,
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    trialDays: creator.free_trial_days,
    telegramChannelLink: creator.telegram_channel_link,
    telegramChannelName: creator.telegram_channel_name,
  });
}
