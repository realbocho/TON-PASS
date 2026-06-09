'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TelegramLoginButton from '@/components/TelegramLoginButton';

export default function OnboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    paymentAddress: '',
    subscriptionPriceTon: '5',
    subscriptionDurationDays: '30',
    telegramChannelLink: '',
    telegramChannelName: '',
    publicProfileUrl: '',
    publicProfileName: '',
    freeTrialEnabled: false,
    freeTrialDays: '3',
    referralEnabled: false,
    referralBonusDays: '7',
    referralFriendDiscount: '0',
    reviewsEnabled: true,
    reviewBonusDays: '1',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.paymentAddress || !form.subscriptionPriceTon || !form.telegramChannelLink) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/creator/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentAddress: form.paymentAddress,
          subscriptionPriceTon: parseFloat(form.subscriptionPriceTon),
          subscriptionDurationDays: parseInt(form.subscriptionDurationDays),
          telegramChannelLink: form.telegramChannelLink,
          telegramChannelName: form.telegramChannelName || null,
          publicProfileUrl: form.publicProfileUrl || null,
          publicProfileName: form.publicProfileName || null,
          notificationChatId: session?.user?.telegramId,
          freeTrialEnabled: form.freeTrialEnabled,
          freeTrialDays: parseInt(form.freeTrialDays) || 3,
          referralEnabled: form.referralEnabled,
          referralBonusDays: parseInt(form.referralBonusDays) || 7,
          referralFriendDiscount: parseInt(form.referralFriendDiscount) || 0,
          reviewsEnabled: form.reviewsEnabled,
          reviewBonusDays: parseInt(form.reviewBonusDays) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to set up. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') return null;

  if (status === 'unauthenticated') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>Creator Sign In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            Connect your Telegram to set up TON-PASS.
          </p>
          <TelegramLoginButton callbackUrl="/creator/onboard" />
        </div>
      </div>
    );
  }

  const price = parseFloat(form.subscriptionPriceTon) || 0;
  const fee = price * 0.10;
  const fanPays = price + fee;

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          {session?.user?.telegramAvatar && (
            <img src={session.user.telegramAvatar} style={{ width: 32, height: 32, borderRadius: '50%' }} />
          )}
          <span style={{ fontWeight: 600 }}>
            {session?.user?.telegramUsername ? `@${session.user.telegramUsername}` : session?.user?.telegramName}
          </span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Set Up Your Page</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          Configure your TON-PASS payment link
        </p>
      </div>



      {/* Pre-setup guide */}
      <div style={{ marginBottom: '24px', padding: '16px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(0,152,234,0.06))', border: '1px solid rgba(0,212,255,0.15)' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
          📋 Before You Start
        </div>
        {[
          { icon: '🔒', title: 'Create a Private Telegram Channel', steps: ['Open Telegram → New Channel', 'Set it to Private', 'Add your exclusive content inside', 'Go to Add Members → Create Invite Link (set usage limit to 1 per fan)'] },
          { icon: '🔗', title: 'Get Your Invite Link', steps: ['In your channel → Manage Channel → Invite Links', 'Create a new invite link', 'You\'ll send unique invite links to each paying fan via DM'] },
          { icon: '💎', title: 'Set Up a TON Wallet', steps: ['Open Telegram → Search @wallet → Start', 'Tap TON → Receive → copy your address'] },
          { icon: '📣', title: 'Promote with Teaser Content', steps: ['Post preview content on your public Telegram/Twitter', 'Add your TON-PASS payment link', 'Fans click → pay → you approve → send invite'] },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: i < 3 ? '14px' : 0 }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>{item.title}</div>
                {item.steps.map((s, j) => (
                  <div key={j} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--accent)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>›</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Pricing */}
        <section>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>01 — Pricing</div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <label className="input-label">Price (TON) *</label>
              <input className="input" type="number" step="0.1" min="0.1" placeholder="5.0"
                value={form.subscriptionPriceTon} onChange={e => set('subscriptionPriceTon', e.target.value)} />
            </div>
            <div className="input-wrap" style={{ flex: 1 }}>
              <label className="input-label">Duration *</label>
              <select className="input" value={form.subscriptionDurationDays} onChange={e => set('subscriptionDurationDays', e.target.value)}>
                {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
          </div>
          {price > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--ton-dim)', border: '1px solid rgba(0,152,234,0.15)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>You receive</span>
                <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{price.toFixed(2)} TON</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fan pays total</span>
                <span style={{ fontWeight: 700, color: 'var(--ton)', fontFamily: 'JetBrains Mono' }}>{fanPays.toFixed(2)} TON</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Platform fee (5%)</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{fee.toFixed(4)} TON</span>
              </div>
            </div>
          )}
        </section>

        {/* TON Wallet */}
        <section>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>02 — TON Wallet</div>
          <div className="input-wrap">
            <label className="input-label">Your TON Wallet Address *</label>
            <input className="input" placeholder="UQA...abc" value={form.paymentAddress} onChange={e => set('paymentAddress', e.target.value)} />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Payments sent directly to this address</span>
          </div>
        </section>

        {/* Telegram Channel */}
        <section>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>03 — Private Telegram Channel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="input-wrap">
              <label className="input-label">Channel Name *</label>
              <input className="input" placeholder="My Premium Channel" value={form.telegramChannelName} onChange={e => set('telegramChannelName', e.target.value)} />
            </div>
            <div className="input-wrap">
              <label className="input-label">Invite Link (for reference) *</label>
              <input className="input" placeholder="https://t.me/+xxxxxxxxxx" value={form.telegramChannelLink} onChange={e => set('telegramChannelLink', e.target.value)} />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>You will send individual invite links to each fan manually via DM</span>
            </div>
          </div>
        </section>

        {/* Public Profile */}
        <section>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>04 — Public Profile (for Ranking)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="input-wrap">
              <label className="input-label">Display Name</label>
              <input className="input" placeholder="My Creator Name" value={form.publicProfileName} onChange={e => set('publicProfileName', e.target.value)} />
            </div>
            <div className="input-wrap">
              <label className="input-label">Public Profile URL</label>
              <input className="input" placeholder="https://t.me/mypublicchannel" value={form.publicProfileUrl} onChange={e => set('publicProfileUrl', e.target.value)} />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Your public Telegram channel, Twitter, or any public page</span>
            </div>
          </div>
        </section>

        {/* Free Trial */}
        <section>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>05 — Free Trial</div>
          <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
              <div onClick={() => set('freeTrialEnabled', !form.freeTrialEnabled)} style={{
                width: 44, height: 24, borderRadius: '12px', position: 'relative',
                background: form.freeTrialEnabled ? 'var(--green)' : 'var(--border)', transition: 'background 0.2s',
              }}>
                <div style={{ position: 'absolute', top: 2, left: form.freeTrialEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>🎁 Free Trial</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Let fans try before they pay</div>
              </div>
            </label>
            {form.freeTrialEnabled && (
              <div className="input-wrap">
                <label className="input-label">Trial Duration (days)</label>
                <select className="input" value={form.freeTrialDays} onChange={e => set('freeTrialDays', e.target.value)}>
                  {[1,3,5,7].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Referral */}
        <section>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>06 — Referral Program</div>
          <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
              <div onClick={() => set('referralEnabled', !form.referralEnabled)} style={{
                width: 44, height: 24, borderRadius: '12px', position: 'relative',
                background: form.referralEnabled ? 'var(--green)' : 'var(--border)', transition: 'background 0.2s',
              }}>
                <div style={{ position: 'absolute', top: 2, left: form.referralEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>👥 Referral Program</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reward fans who invite friends</div>
              </div>
            </label>
            {form.referralEnabled && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="input-wrap" style={{ flex: 1 }}>
                  <label className="input-label">Bonus Days (referrer)</label>
                  <input className="input" type="number" min="1" value={form.referralBonusDays} onChange={e => set('referralBonusDays', e.target.value)} />
                </div>
                <div className="input-wrap" style={{ flex: 1 }}>
                  <label className="input-label">Friend Discount (%)</label>
                  <input className="input" type="number" min="0" max="50" value={form.referralFriendDiscount} onChange={e => set('referralFriendDiscount', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Reviews */}
        <section>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>07 — Reviews</div>
          <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
              <div onClick={() => set('reviewsEnabled', !form.reviewsEnabled)} style={{
                width: 44, height: 24, borderRadius: '12px', position: 'relative',
                background: form.reviewsEnabled ? 'var(--green)' : 'var(--border)', transition: 'background 0.2s',
              }}>
                <div style={{ position: 'absolute', top: 2, left: form.reviewsEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>⭐ Reviews</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Let fans review your channel</div>
              </div>
            </label>
            {form.reviewsEnabled && (
              <div className="input-wrap">
                <label className="input-label">Review Bonus Days</label>
                <input className="input" type="number" min="0" max="7" value={form.reviewBonusDays} onChange={e => set('reviewBonusDays', e.target.value)} />
              </div>
            )}
          </div>
        </section>

        {error && (
          <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--red-dim)', border: '1px solid rgba(255,77,106,0.2)', color: 'var(--red)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary btn-full btn-lg" onClick={handleSubmit} disabled={loading} style={{ marginTop: 'auto' }}>
          {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Saving…</> : '🚀 Create My Payment Page'}
        </button>
      </div>
    </main>
  );
}
