'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { useParams } from 'next/navigation';
import TelegramLoginButton from '@/components/TelegramLoginButton';

interface CreatorData {
  id: string;
  twitter_username: string;
  twitter_avatar?: string;
  subscription_price_ton: number;
  subscription_duration_days: number;
  payment_address: string;
  link_slug: string;
  telegram_channel_link: string;
  telegram_channel_name: string;
  public_profile_url?: string;
  public_profile_name?: string;
}

interface FeesData {
  amount: number;
  fee: number;
  total: number;
}

type Step = 'loading' | 'info' | 'connect-telegram' | 'pay' | 'confirming' | 'success' | 'error';

export default function PayPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [fees, setFees] = useState<FeesData | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [channelLink, setChannelLink] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) {
      tg.ready();
      tg.expand();
    }
    fetchCreator();
    fetch('/api/fan/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }, [slug]);

  async function fetchCreator() {
    try {
      const res = await fetch(`/api/fan/creator/${slug}`);
      if (!res.ok) throw new Error('Creator not found');
      const data = await res.json();
      setCreator(data.creator);
      setFees(data.fees);
      setStep('info');
    } catch {
      setStep('error');
      setError('Creator not found or link is invalid.');
    }
  }

  function handleProceed() {
    if (!session) {
      setStep('connect-telegram');
      return;
    }
    setStep('pay');
  }

  function encodeComment(text: string): string {
    const bytes = new TextEncoder().encode(text);
    const cell = new Uint8Array(4 + bytes.length);
    cell[0] = 0; cell[1] = 0; cell[2] = 0; cell[3] = 0;
    cell.set(bytes, 4);
    return btoa(String.fromCharCode(...cell));
  }

  async function handlePayWithTon() {
    if (!session || !creator || !fees) return;

    try {
      const res = await fetch('/api/fan/payment/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorSlug: slug }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to prepare payment');
      }

      const { tonPayment, tempId } = await res.json();

      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: tonPayment.messages.map((msg: any) => ({
          address: msg.address,
          amount: msg.amountNano,
        })),
      };

      setStep('confirming');
      await tonConnectUI.sendTransaction(tx);

      const verifyRes = await fetch('/api/fan/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempId, creatorSlug: slug }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) throw new Error(verifyData.error || 'Failed to confirm payment');

      setChannelLink(verifyData.telegramChannelLink);
      setChannelName(verifyData.telegramChannelName);
      setStep('success');
    } catch (err: any) {
      if (err.message?.includes('User rejects') || err.message?.includes('user rejected')) {
        setStep('pay');
        return;
      }
      setError(err.message || 'Payment failed');
      setStep('error');
    }
  }

  if (step === 'loading') return <LoadingScreen />;
  if (step === 'error') return <ErrorScreen message={error} />;
  if (!creator || !fees) return null;

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {creator.twitter_avatar && (
          <img src={creator.twitter_avatar} alt={creator.twitter_username}
            style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--border)' }} />
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>
            {creator.public_profile_name || creator.twitter_username}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Private Telegram Channel Access
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            background: 'var(--ton-dim)', color: 'var(--ton)', border: '1px solid rgba(0,152,234,0.2)',
          }}>TON</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* INFO */}
        {step === 'info' && (
          <div className="fade-up">
            <PriceCard creator={creator} fees={fees} />

            <div style={{ marginTop: '16px' }} className="card">
              <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                How it works
              </h3>
              {[
                ['1', 'Log in with your Telegram account'],
                ['2', 'Pay with your TON wallet'],
                ['3', 'Creator sends you a private invite link'],
                ['4', 'Join the private Telegram channel'],
              ].map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent-dim)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700,
                  }}>{n}</div>
                  <div style={{ fontSize: '13px', paddingTop: '2px' }}>{t}</div>
                </div>
              ))}
            </div>

            {/* Channel info */}
            {creator.telegram_channel_name && (
              <div style={{
                marginTop: '12px', padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,152,234,0.08)',
                border: '1px solid rgba(0,152,234,0.2)',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '20px' }}>📢</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{creator.telegram_channel_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Private Telegram Channel</div>
                </div>
              </div>
            )}

            {/* Terms */}
            <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '12px', cursor: 'pointer' }}>
              <div onClick={() => setAgreed(!agreed)} style={{
                width: 20, height: 20, borderRadius: '5px', flexShrink: 0,
                border: `2px solid ${agreed ? 'var(--accent)' : 'var(--border)'}`,
                background: agreed ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '1px', transition: 'all 0.15s',
              }}>
                {agreed && <span style={{ fontSize: '12px', color: '#000', fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                I understand the creator will manually send me an invite link after payment.
                A <strong style={{ color: 'var(--text)' }}>5% platform fee</strong> is included in the total.{' '}
                <strong style={{ color: 'var(--text)' }}>TON-PASS and any associated exchanges are not affiliated with, responsible for, or connected to any trades or financial transactions beyond this platform fee.</strong>
              </span>
            </label>

            <button className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: '20px' }} disabled={!agreed} onClick={handleProceed}>
              Continue →
            </button>

            <div style={{
              marginTop: '16px', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.6, textAlign: 'center' }}>
                ⚠️ <strong style={{ color: 'var(--text-muted)' }}>Disclaimer:</strong> TON-PASS is a content access management platform only.
                This service is not affiliated with any investment or trading activities.
                Payments are solely for private Telegram channel subscriptions.
              </p>
            </div>
          </div>
        )}

        {/* CONNECT TELEGRAM */}
        {step === 'connect-telegram' && (
          <div className="fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px' }}>✈️</div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Connect Telegram</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
                We need your Telegram account so the creator can send you the private channel invite link.
              </p>
            </div>
            <TelegramLoginButton onSuccess={() => setStep('pay')} />
            <button className="btn btn-ghost btn-full" onClick={() => setStep('info')}>← Back</button>
          </div>
        )}

        {/* PAY */}
        {step === 'pay' && session && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                {session.user.telegramAvatar && (
                  <img src={session.user.telegramAvatar} style={{ width: 36, height: 36, borderRadius: '50%' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {session.user.telegramUsername ? `@${session.user.telegramUsername}` : session.user.telegramName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--green)' }}>✓ Telegram connected</div>
                </div>
              </div>
              <div className="divider" />
              <FeeBreakdown fees={fees} duration={creator.subscription_duration_days} />
            </div>

            {/* No wallet guide */}
            {!walletAddress && (
              <div style={{
                padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '12px',
                background: 'rgba(0,152,234,0.06)', border: '1px solid rgba(0,152,234,0.15)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ton)', marginBottom: '10px' }}>
                  💡 Don't have a TON wallet?
                </div>
                {[
                  'Open Telegram → Search @wallet → Start',
                  'Tap TON → tap Receive',
                  'Your TON wallet is ready! Come back here to pay.',
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--ton-dim)', color: 'var(--ton)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
                <a href="https://t.me/wallet" target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', marginTop: '12px', padding: '8px',
                  borderRadius: 'var(--radius-sm)', background: 'var(--ton-dim)',
                  color: 'var(--ton)', fontSize: '12px', fontWeight: 600,
                  border: '1px solid rgba(0,152,234,0.2)',
                }}>
                  Open @wallet on Telegram →
                </a>
              </div>
            )}

            {!walletAddress ? (
              <button className="btn btn-ton btn-full btn-lg" onClick={() => tonConnectUI.openModal()}>
                🔗 Connect TON Wallet
              </button>
            ) : (
              <div>
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--green-dim)', border: '1px solid rgba(0,229,153,0.2)',
                  fontSize: '12px', color: 'var(--green)', marginBottom: '12px',
                  display: 'flex', gap: '8px', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '14px' }}>✓</span>
                  Wallet: {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
                </div>
                <button className="btn btn-ton btn-full btn-lg" onClick={handlePayWithTon}>
                  💎 Pay {fees.total.toFixed(2)} TON
                </button>
              </div>
            )}
          </div>
        )}

        {/* CONFIRMING */}
        {step === 'confirming' && (
          <div className="fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Processing Payment</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Confirming your TON transaction…</p>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <SuccessScreen
            channelLink={channelLink}
            channelName={channelName}
            telegramUsername={session?.user?.telegramUsername}
          />
        )}
      </div>

      {/* Powered by banner */}
      <PoweredByBanner />
    </main>
  );
}

function PriceCard({ creator, fees }: { creator: CreatorData; fees: FeesData }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--ton-dim), var(--accent-dim))',
      border: '1px solid rgba(0,152,234,0.2)',
      borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        {creator.subscription_duration_days}-Day Access
      </div>
      <div style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--ton)' }}>
        {fees.total.toFixed(2)}
        <span style={{ fontSize: '20px', marginLeft: '6px', color: 'var(--text-muted)' }}>TON</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>incl. 5% platform fee</div>
    </div>
  );
}

function FeeBreakdown({ fees, duration }: { fees: FeesData; duration: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[
        { label: 'Subscription', value: `${fees.amount.toFixed(2)} TON` },
        { label: 'Platform fee (5%)', value: `${fees.fee.toFixed(4)} TON` },
        { label: 'Duration', value: `${duration} days` },
      ].map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{r.label}</span>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
      <div className="divider" />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700 }}>Total</span>
        <span style={{ fontWeight: 700, color: 'var(--ton)', fontFamily: 'JetBrains Mono' }}>
          {fees.total.toFixed(4)} TON
        </span>
      </div>
    </div>
  );
}

function SuccessScreen({ channelLink, channelName, telegramUsername }: {
  channelLink?: string | null;
  channelName?: string | null;
  telegramUsername?: string;
}) {
  function copyUsername() {
    if (telegramUsername) navigator.clipboard?.writeText(`@${telegramUsername}`);
  }

  return (
    <div className="fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Payment Confirmed!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
          Your payment has been received. The creator will send you a private channel invite link shortly.
        </p>
      </div>

      <div className="card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Next steps
        </p>
        {[
          { icon: '1️⃣', text: 'The creator will review your payment in their dashboard.' },
          { icon: '2️⃣', text: 'They will send you a private Telegram channel invite link.' },
          { icon: '3️⃣', text: 'Click the link to join the private channel.' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{s.icon}</span>
            <span style={{ fontSize: '13px', lineHeight: 1.5 }}>{s.text}</span>
          </div>
        ))}
      </div>

      {telegramUsername && (
        <button className="btn btn-ghost btn-full" onClick={copyUsername}>
          📋 Copy My Telegram ID (@{telegramUsername})
        </button>
      )}

      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
        Keep an eye on your Telegram messages.<br />
        The creator will send the invite link within 24 hours.
      </p>
    </div>
  );
}

function PoweredByBanner() {
  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
      <a href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '10px 18px', borderRadius: '30px',
        background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,152,234,0.08))',
        border: '1px solid rgba(0,212,255,0.2)',
        fontSize: '12px', fontWeight: 600, color: 'var(--accent)',
      }}>
        <span style={{ fontSize: '14px' }}>⚡</span>
        <span>Create your own Telegram subscription link — free with TON-PASS</span>
      </a>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Oops</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{message}</p>
      </div>
    </div>
  );
}
