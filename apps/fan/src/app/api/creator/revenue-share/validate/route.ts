import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/creator/revenue-share/validate?code=CR-XXXXX
// 온보딩 시 초대 코드 검증
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const { data: link } = await supabaseAdmin
    .from('creator_referral_links')
    .select(`
      id, invite_code, signup_count, total_earned_ton,
      referrer_creator_id,
      creators!creator_referral_links_referrer_creator_id_fkey (
        id, public_profile_name, telegram_channel_name, revenue_share_pct
      )
    `)
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!link) {
    return NextResponse.json({ valid: false, error: 'Invalid invite code' }, { status: 404 });
  }

  const referrer = (link as any).creators;

  return NextResponse.json({
    valid: true,
    code: link.invite_code,
    referrerName: referrer?.public_profile_name || referrer?.telegram_channel_name || '크리에이터',
    revenueSharePct: referrer?.revenue_share_pct || 20,
    signupCount: link.signup_count,
  });
}
