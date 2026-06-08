import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { data: creator, error } = await supabaseAdmin
    .from('creators')
    .select(
      'id, twitter_username, twitter_avatar, subscription_price_ton, subscription_duration_days, payment_address, link_slug, telegram_channel_link, telegram_channel_name, public_profile_url, public_profile_name, is_active',
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

  return NextResponse.json({ creator, fees });
}
