import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyExpiringSubscriptions } from '@/lib/telegram';

// Called by cron-job.org every day at 09:00 UTC
// Endpoint: GET /api/cron/check-expiry
// Header: x-cron-secret: <your secret>

export async function GET(req: NextRequest) {
  // Validate cron secret
  const secret = req.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;
  
  // Debug: log both values (remove after testing)
  console.log('Received secret:', secret);
  console.log('Expected secret:', cronSecret);
  
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      received: secret,
      expected_length: cronSecret?.length 
    }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://ton-pass.vercel.app';
  const results = { notified: 0, expired: 0, errors: 0 };

  // 1. Auto-expire past-due subscriptions
  const { data: overdue, error: overdueError } = await supabaseAdmin
    .from('payments')
    .update({ status: 'expired' })
    .eq('status', 'approved')
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (!overdueError) {
    results.expired = overdue?.length || 0;
  }

  // 2. Get subscriptions expiring in <=3 days, notification not yet sent
  const threeDaysFromNow = new Date(Date.now() + 3 * 86400 * 1000).toISOString();

  const { data: expiring } = await supabaseAdmin
    .from('payments')
    .select('id, fan_twitter_username, expires_at, creator_id, creators(telegram_chat_id, twitter_username, link_slug)')
    .eq('status', 'approved')
    .eq('notification_sent', false)
    .lte('expires_at', threeDaysFromNow)
    .gt('expires_at', new Date().toISOString());

  if (expiring && expiring.length > 0) {
    // Group by creator
    const byCreator = new Map<string, typeof expiring>();
    for (const p of expiring) {
      const list = byCreator.get(p.creator_id) || [];
      list.push(p);
      byCreator.set(p.creator_id, list);
    }

    for (const [creatorId, payments] of byCreator) {
      const creator = (payments[0] as any).creators;
      if (!creator?.telegram_chat_id) continue;

      const daysLeft = payments.map(p => ({
        username: p.fan_twitter_username,
        daysLeft: (new Date(p.expires_at!).getTime() - Date.now()) / 86400000,
      }));

      try {
        await notifyExpiringSubscriptions({
          chatId: creator.telegram_chat_id,
          expiringFans: daysLeft,
          dashboardUrl: `${baseUrl}/dashboard`,
        });

        // Mark as notified
        await supabaseAdmin
          .from('payments')
          .update({ notification_sent: true })
          .in('id', payments.map(p => p.id));

        results.notified += payments.length;
      } catch {
        results.errors++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
