import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ ok: false });

  await supabaseAdmin.rpc('increment_page_views', { slug_input: slug });

  return NextResponse.json({ ok: true });
}
