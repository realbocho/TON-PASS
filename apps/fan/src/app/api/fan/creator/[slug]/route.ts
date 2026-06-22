import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { data: creator, error } = await supabaseAdmin
    .from('creators')
    .select(
      'id, twitter_username, twitter_avatar, subscription_price_ton, subscription_duration_days, payment_address, link_slug, telegram_channel_link, telegram_channel_name, public_profile_url, public_profile_name, is_active, free_trial_enabled, free_trial_days',
    )
    .eq('link_slug', params.slug)
    .single();

  if (error || !creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  if (!creator.is_active) {
    return NextResponse.json({ error: 'Creator is not active' }, { status: 403 });
  }

  const { calculateFee } = await import('@ton-pass/shared');
  const fees = calculateFee(creator.subscription_price_ton);

  const trialInfo = creator.free_trial_enabled
    ? { enabled: true, days: creator.free_trial_days }
    : { enabled: false, days: 0 };

  const response = NextResponse.json({ creator, fees, trialInfo });
  // 캐싱 완전 비활성화 - 설정 변경이 즉시 반영되도록
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}
