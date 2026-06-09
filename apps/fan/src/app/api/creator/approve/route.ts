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
    .select('id, status')
    .eq('id', paymentId)
    .eq('creator_id', creator.id)
    .eq('status', 'pending_approval')
    .single();

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + creator.subscription_duration_days * 86400 * 1000);

  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'approved',
      approved_at: now.toISOString(),
      subscribed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', paymentId);

  if (error) {
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
