import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('creators')
    .select('twitter_username, twitter_avatar, public_twitter_url, link_slug')
    .eq('is_active', true)
    .order('page_views', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch ranking' }, { status: 500 });
  }

  // Build public twitter URL: use custom if set, else default to twitter.com/username
  const ranking = (data || []).map((c, i) => ({
    rank: i + 1,
    username: c.twitter_username,
    avatar: c.twitter_avatar,
    twitterUrl: c.public_profile_url || c.public_twitter_url || `https://t.me/${c.twitter_username}`,
    payUrl: `/pay/${c.link_slug}`,
  }));

  return NextResponse.json({ ranking });
}
