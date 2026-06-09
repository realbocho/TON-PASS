import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Get reviews for a creator
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id')
    .eq('link_slug', slug)
    .single();

  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, content, is_anonymous, fan_telegram_username, fan_telegram_avatar, created_at')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: stats } = await supabaseAdmin
    .from('creator_stats')
    .select('avg_rating, review_count')
    .eq('id', creator.id)
    .single();

  return NextResponse.json({
    reviews: reviews || [],
    avgRating: parseFloat(stats?.avg_rating || '0'),
    reviewCount: stats?.review_count || 0,
  });
}

// Submit a review
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorSlug, rating, content, isAnonymous } = await req.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, reviews_enabled, review_bonus_days')
    .eq('link_slug', creatorSlug)
    .single();

  if (!creator?.reviews_enabled) {
    return NextResponse.json({ error: 'Reviews disabled' }, { status: 403 });
  }

  // Must have approved subscription
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, expires_at')
    .eq('creator_id', creator.id)
    .eq('fan_telegram_id', session.user.telegramId)
    .eq('status', 'approved')
    .single();

  if (!payment) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 403 });
  }

  // Check already reviewed
  const { data: existing } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('creator_id', creator.id)
    .eq('fan_telegram_id', session.user.telegramId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });
  }

  // Submit review
  const { error } = await supabaseAdmin
    .from('reviews')
    .insert({
      creator_id: creator.id,
      payment_id: payment.id,
      fan_telegram_id: session.user.telegramId,
      fan_telegram_username: isAnonymous ? null : session.user.telegramUsername,
      fan_telegram_avatar: isAnonymous ? null : session.user.telegramAvatar,
      rating,
      content: content || null,
      is_anonymous: isAnonymous || false,
    });

  if (error) {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }

  // Apply bonus days
  let bonusApplied = false;
  if (creator.review_bonus_days > 0 && payment.expires_at) {
    const newExpiry = new Date(
      new Date(payment.expires_at).getTime() + creator.review_bonus_days * 86400 * 1000
    );
    await supabaseAdmin
      .from('payments')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', payment.id);
    bonusApplied = true;
  }

  return NextResponse.json({
    success: true,
    bonusApplied,
    bonusDays: creator.review_bonus_days,
  });
}
