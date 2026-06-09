import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const creatorSlug = searchParams.get('slug');
  if (!creatorSlug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  // Get creator
  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, referral_enabled, referral_bonus_days, referral_friend_discount_pct')
    .eq('link_slug', creatorSlug)
    .single();

  if (!creator?.referral_enabled) {
    return NextResponse.json({ enabled: false });
  }

  // Get fan's active payment
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('creator_id', creator.id)
    .eq('fan_telegram_id', session.user.telegramId)
    .eq('status', 'approved')
    .single();

  if (!payment) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 403 });
  }

  // Get or create referral code
  let { data: referral } = await supabaseAdmin
    .from('referral_codes')
    .select('*')
    .eq('payment_id', payment.id)
    .single();

  if (!referral) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    const { data: newReferral } = await supabaseAdmin
      .from('referral_codes')
      .insert({
        payment_id: payment.id,
        creator_id: creator.id,
        fan_telegram_id: session.user.telegramId,
        code,
      })
      .select()
      .single();
    referral = newReferral;
  }

  return NextResponse.json({
    enabled: true,
    code: referral?.code,
    uses: referral?.uses || 0,
    bonusDays: creator.referral_bonus_days,
    friendDiscount: creator.referral_friend_discount_pct,
  });
}

// Apply referral code
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code, creatorSlug } = await req.json();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const { data: referral } = await supabaseAdmin
    .from('referral_codes')
    .select('*, creators(referral_bonus_days, referral_friend_discount_pct, subscription_price_ton)')
    .eq('code', code.toUpperCase())
    .single();

  if (!referral) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  // Can't use own code
  if (referral.fan_telegram_id === session.user.telegramId) {
    return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
  }

  const creator = (referral as any).creators;
  const discount = creator.referral_friend_discount_pct / 100;
  const originalPrice = creator.subscription_price_ton;
  const discountedPrice = originalPrice * (1 - discount);

  return NextResponse.json({
    valid: true,
    code: referral.code,
    referralId: referral.id,
    discountPct: creator.referral_friend_discount_pct,
    originalPrice,
    discountedPrice: parseFloat(discountedPrice.toFixed(2)),
    bonusDays: creator.referral_bonus_days,
  });
}
