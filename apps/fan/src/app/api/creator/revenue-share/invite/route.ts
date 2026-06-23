import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/creator/revenue-share/invite
// 내 초대 코드 조회 (없으면 생성)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, revenue_share_enabled, revenue_share_pct, pending_revenue_share_ton, total_revenue_share_paid_ton')
    .eq('telegram_id', session.user.telegramId)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // 기존 초대 링크 조회
  let { data: link } = await supabaseAdmin
    .from('creator_referral_links')
    .select('*')
    .eq('referrer_creator_id', creator.id)
    .single();

  // 없으면 생성
  if (!link) {
    const code = 'CR-' + randomBytes(5).toString('hex').toUpperCase();
    const { data: newLink } = await supabaseAdmin
      .from('creator_referral_links')
      .insert({
        referrer_creator_id: creator.id,
        invite_code: code,
      })
      .select()
      .single();
    link = newLink;
  }

  // 피추천 크리에이터 목록 조회
  const { data: referredCreators } = await supabaseAdmin
    .from('creators')
    .select('id, public_profile_name, telegram_channel_name, created_at, pending_revenue_share_ton')
    .eq('referred_by_creator_id', creator.id)
    .order('created_at', { ascending: false });

  // 각 피추천 크리에이터의 이번 달 수익 조회
  const referredWithEarnings = await Promise.all(
    (referredCreators || []).map(async (rc) => {
      const { data: earnings } = await supabaseAdmin
        .from('revenue_share_earnings')
        .select('share_ton, created_at')
        .eq('earner_creator_id', creator.id)
        .eq('source_creator_id', rc.id);

      const totalEarned = earnings?.reduce((s, e) => s + e.share_ton, 0) || 0;
      const thisMonthEarned = earnings?.filter(e => {
        const d = new Date(e.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((s, e) => s + e.share_ton, 0) || 0;

      return {
        ...rc,
        total_earned_ton: totalEarned,
        this_month_earned_ton: thisMonthEarned,
      };
    })
  );

  // 최근 수익 내역 (20건)
  const { data: recentEarnings } = await supabaseAdmin
    .from('revenue_share_earnings')
    .select(`
      id, share_ton, share_pct, source_fee_ton, status, created_at,
      source_creator_id
    `)
    .eq('earner_creator_id', creator.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    inviteCode: link?.invite_code,
    inviteUrl: `${req.headers.get('origin') || ''}/creator/onboard?ref=${link?.invite_code}`,
    revenueShareEnabled: creator.revenue_share_enabled,
    revenueSharePct: creator.revenue_share_pct,
    pendingTon: creator.pending_revenue_share_ton || 0,
    totalPaidTon: creator.total_revenue_share_paid_ton || 0,
    referredCreators: referredWithEarnings,
    recentEarnings: recentEarnings || [],
    stats: {
      referredCount: referredWithEarnings.length,
      totalEarnedTon: referredWithEarnings.reduce((s, r) => s + r.total_earned_ton, 0),
      thisMonthEarnedTon: referredWithEarnings.reduce((s, r) => s + r.this_month_earned_ton, 0),
    },
  });
}
