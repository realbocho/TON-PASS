import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = await req.json();

  const allowed = [
    'payment_address',
    'subscription_price_ton',
    'subscription_duration_days',
    'telegram_channel_link',
    'telegram_channel_name',
    'public_profile_url',
    'public_profile_name',
    'public_twitter_url',
    'is_active',
    'free_trial_enabled',
    'free_trial_days',
    'referral_enabled',
    'referral_bonus_days',
    'referral_friend_discount_pct',
    'reviews_enabled',
    'review_bonus_days',
  ];

  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k)),
  );

  const { data, error } = await supabaseAdmin
    .from('creators')
    .update(filtered)
    .eq('telegram_id', session.user.telegramId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ creator: data });
}
