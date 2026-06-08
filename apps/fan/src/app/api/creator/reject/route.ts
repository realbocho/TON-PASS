import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.twitterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await req.json();

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id')
    .eq('twitter_id', session.user.telegramId)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('creator_id', creator.id)
    .in('status', ['pending_approval', 'approved'])
    .single();

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  // TODO: Initiate actual TON refund via TON SDK
  // For now, mark as refunded and the creator handles it manually
  // In production, integrate TONweb to send refund tx automatically

  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'refunded',
      rejected_at: new Date().toISOString(),
      refunded_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) {
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
