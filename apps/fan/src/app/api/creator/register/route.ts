import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function generateSlug(name: string): string {
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${suffix}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    paymentAddress,
    subscriptionPriceTon,
    subscriptionDurationDays,
    telegramChannelLink,
    telegramChannelName,
    publicProfileUrl,
    publicProfileName,
    notificationChatId,
    freeTrialEnabled,
    freeTrialDays,
    referralEnabled,
    referralBonusDays,
    referralFriendDiscount,
    reviewsEnabled,
    reviewBonusDays,
    showInRanking,
  } = await req.json();

  if (!paymentAddress || !subscriptionPriceTon || !telegramChannelLink) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: creator, error } = await supabaseAdmin
    .from('creators')
    .upsert(
      {
        telegram_id: session.user.telegramId,
        twitter_username: session.user.telegramUsername || session.user.telegramName,
        twitter_avatar: session.user.telegramAvatar,
        payment_address: paymentAddress,
        subscription_price_ton: subscriptionPriceTon,
        subscription_duration_days: subscriptionDurationDays || 30,
        telegram_channel_link: telegramChannelLink,
        telegram_channel_name: telegramChannelName || '',
        public_profile_url: publicProfileUrl || null,
        public_profile_name: publicProfileName || null,
        telegram_chat_id: notificationChatId || session.user.telegramId,
        link_slug: generateSlug(session.user.telegramUsername || session.user.telegramName || 'user'),
        is_active: true,
        free_trial_enabled: freeTrialEnabled || false,
        free_trial_days: freeTrialDays || 3,
        referral_enabled: referralEnabled || false,
        referral_bonus_days: referralBonusDays || 7,
        referral_friend_discount_pct: referralFriendDiscount || 0,
        reviews_enabled: reviewsEnabled ?? true,
        review_bonus_days: reviewBonusDays || 1,
        show_in_ranking: showInRanking ?? true,
      },
      { onConflict: 'telegram_id', ignoreDuplicates: false },
    )
    .select()
    .single();

  if (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }

  return NextResponse.json({ creator });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('telegram_id', session.user.telegramId)
    .single();

  return NextResponse.json({ creator: creator || null });
}
