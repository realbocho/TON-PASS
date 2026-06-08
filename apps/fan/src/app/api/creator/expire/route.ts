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

  const { error } = await supabaseAdmin
    .from('payments')
    .update({ status: 'expired' })
    .eq('id', paymentId)
    .eq('creator_id', creator.id)
    .in('status', ['approved', 'pending_approval']);

  if (error) {
    return NextResponse.json({ error: 'Failed to expire' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
