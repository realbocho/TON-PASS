import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/creator/revenue-share/invite
// 내 초대 코드 + 초대한 크리에이터 목록 반환
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, revenue_share_enabled, revenue_share_pct')
    .eq('telegram_id', session.user.telegramId)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // 초대 링크 조회, 없으면 생성
  let { data: link } = await supabaseAdmin
    .from('creator_referral_links')
    .select('invite_code, signup_count')
    .eq('referrer_creator_id', creator.id)
    .single();

  if (!link) {
    const code = 'CR-' + randomBytes(5).toString('hex').toUpperCase();
    const { data: newLink } = await supabaseAdmin
      .from('creator_referral_links')
      .insert({ referrer_creator_id: creator.id, invite_code: code })
      .select('invite_code, signup_count')
      .single();
    link = newLink;
  }

  // 초대한 크리에이터 목록
  const { data: referredCreators } = await supabaseAdmin
    .from('creators')
    .select('id, public_profile_name, telegram_channel_name, created_at, is_active')
    .eq('referred_by_creator_id', creator.id)
    .order('created_at', { ascending: false });

  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'TON_pass_bot';

  return NextResponse.json({
    inviteCode: link?.invite_code,
    inviteUrl: `https://t.me/${botName}/tps?startapp=ref-${link?.invite_code}`,
    revenueShareEnabled: creator.revenue_share_enabled,
    revenueSharePct: creator.revenue_share_pct ?? 20,
    signupCount: link?.signup_count ?? 0,
    referredCreators: (referredCreators || []).map(rc => ({
      id: rc.id,
      name: rc.public_profile_name || rc.telegram_channel_name || 'Creator',
      joinedAt: rc.created_at,
      isActive: rc.is_active,
    })),
  });
}
