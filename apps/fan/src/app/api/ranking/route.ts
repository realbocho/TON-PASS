import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 실시간 데이터 응답을 위해 캐싱 완전 비활성화
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Get stats with ranking score
  const { data: stats, error } = await supabaseAdmin
    .from('creator_stats')
    .select('id, avg_rating, review_count, rank_score')
    .order('rank_score', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch ranking' }, { status: 500 });
  }

  const ids = (stats || []).map((d: any) => d.id);
  if (ids.length === 0) return NextResponse.json({ ranking: [] });

  const { data: creators } = await supabaseAdmin
    .from('creators')
    .select('id, twitter_username, twitter_avatar, public_profile_url, public_twitter_url, link_slug')
    .in('id', ids)
    .eq('is_active', true)
    .eq('show_in_ranking', true);

  const creatorMap = Object.fromEntries((creators || []).map((c: any) => [c.id, c]));
  const statMap = Object.fromEntries((stats || []).map((d: any) => [d.id, d]));

  const ranking = ids
    .filter((id: string) => creatorMap[id])
    .map((id: string, i: number) => {
      const c = creatorMap[id];
      const s = statMap[id];
      return {
        rank: i + 1,
        username: c.twitter_username,
        avatar: c.twitter_avatar,
        twitterUrl: c.public_profile_url || c.public_twitter_url || null,
        payUrl: `/pay/${c.link_slug}`,
        slug: c.link_slug,
        avgRating: parseFloat(s?.avg_rating || '0'),
        reviewCount: parseInt(s?.review_count || '0'),
      };
    });

  const response = NextResponse.json({ ranking });
  // 브라우저 및 CDN 캐싱 완전 비활성화
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}
