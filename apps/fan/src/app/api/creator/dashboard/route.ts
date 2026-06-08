import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.twitterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get creator
  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id')
    .eq('twitter_id', session.user.telegramId)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Pending approvals
  const { data: pending } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true });

  // Active subscriptions
  const { data: active } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('status', 'approved')
    .order('expires_at', { ascending: true });

  // Expiring in 3 days
  const expiringSoon = active?.filter(p => {
    if (!p.expires_at) return false;
    const daysLeft = (new Date(p.expires_at).getTime() - Date.now()) / 86400000;
    return daysLeft <= 3;
  }) || [];

  // Stats
  const { data: allPayments } = await supabaseAdmin
    .from('payments')
    .select('amount_ton, fee_ton, status, created_at')
    .eq('creator_id', creator.id)
    .in('status', ['approved', 'pending_approval']);

  const totalRevenue = allPayments?.reduce((s, p) => s + p.amount_ton, 0) || 0;
  const totalFees = allPayments?.reduce((s, p) => s + p.fee_ton, 0) || 0;

  return NextResponse.json({
    pending: pending || [],
    active: active || [],
    expiringSoon,
    stats: {
      pendingCount: pending?.length || 0,
      activeCount: active?.length || 0,
      expiringSoonCount: expiringSoon.length,
      totalRevenue,
      totalFees,
    },
  });
}
