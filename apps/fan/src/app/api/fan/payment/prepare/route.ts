import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateFee } from '@ton-pass/shared';
import { toNano } from '@/lib/ton';
import { randomUUID } from 'crypto';

const PLATFORM_WALLET = 'UQAfdeijx6QgEcO97eVfSsTYtC20_-bfLePj7Bl2162XIkjG';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.telegramId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { creatorSlug } = await req.json();

  const { data: creator, error } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('link_slug', creatorSlug)
    .eq('is_active', true)
    .single();

  if (error || !creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Check existing active subscription
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id, status')
    .eq('creator_id', creator.id)
    .eq('fan_twitter_id', session.user.telegramId)
    .in('status', ['pending_approval', 'approved'])
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'You already have an active or pending subscription' },
      { status: 409 },
    );
  }

  const fees = calculateFee(creator.subscription_price_ton);
  const tempId = randomUUID();

  return NextResponse.json({
    tempId,
    tonPayment: {
      messages: [
        {
          address: creator.payment_address,
          amountNano: toNano(fees.amount).toString(),
          comment: `TONPASS-${tempId}`,
        },
        {
          address: PLATFORM_WALLET,
          amountNano: toNano(fees.fee).toString(),
          comment: `FEE-${tempId}`,
        },
      ],
      amountTon: fees.amount,
      feeTon: fees.fee,
      totalTon: fees.total,
    },
  });
}
