import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await req.json();

  // Verify creator owns this payment
  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, subscription_duration_days')
    .eq('telegram_id', session.user.telegramId)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, status, review_bonus_days_pending')
    .eq('id', paymentId)
    .eq('creator_id', creator.id)
    .eq('status', 'pending_approval')
    .single();

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  const now = new Date();
  // review_bonus_days_pending: 리뷰를 pending_approval 상태에서 먼저 작성한 경우 보너스 일수 반영
  const reviewBonus = (payment as any).review_bonus_days_pending ?? 0;
  const totalDays = creator.subscription_duration_days + reviewBonus;
  const expiresAt = new Date(now.getTime() + totalDays * 86400 * 1000);

  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'approved',
      approved_at: now.toISOString(),
      subscribed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      review_bonus_days_pending: 0,  // 적용 후 초기화
    })
    .eq('id', paymentId);

  if (error) {
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
  }

  // Revenue Share 적립: 이 크리에이터를 추천한 크리에이터에게 수수료의 일부 지급
  // DB 함수(process_revenue_share)가 referred_by_creator_id 확인 후 적립
  try {
    await supabaseAdmin.rpc('process_revenue_share', { p_payment_id: paymentId });
  } catch (rsError) {
    // revenue share 실패는 무시 (결제 승인 자체는 성공)
    console.error('Revenue share processing failed:', rsError);
  }

  return NextResponse.json({ success: true });
}
