'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') loadCreator();
  }, [status]);

  async function loadCreator() {
    const res = await fetch('/api/creator/register');
    const data = await res.json();
    if (data.creator) {
      setForm({
        paymentAddress: data.creator.payment_address || '',
        subscriptionPriceTon: data.creator.subscription_price_ton?.toString() || '5',
        subscriptionDurationDays: data.creator.subscription_duration_days?.toString() || '30',
        telegramChannelLink: data.creator.telegram_channel_link || '',
        telegramChannelName: data.creator.telegram_channel_name || '',
        publicProfileUrl: data.creator.public_profile_url || '',
        publicProfileName: data.creator.public_profile_name || '',
        publicTwitterUrl: data.creator.public_twitter_url || '',
        isActive: data.creator.is_active ?? true,
        freeTrialEnabled: data.creator.free_trial_enabled ?? false,
        freeTrialDays: data.creator.free_trial_days?.toString() || '3',
        referralEnabled: data.creator.referral_enabled ?? false,
        referralBonusDays: data.creator.referral_bonus_days?.toString() || '7',
        referralFriendDiscount: data.creator.referral_friend_discount_pct?.toString() || '0',
        reviewsEnabled: data.creator.reviews_enabled ?? true,
        reviewBonusDays: data.creator.review_bonus_days?.toString() || '1',
      });
    }
    setLoading(false);
  }

  function set(field: string, value: any) {
    setForm((f: any) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/creator/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_address: form.paymentAddress,
          subscription_price_ton: parseFloat(form.subscriptionPriceTon),
          subscription_duration_days: parseInt(form.subscriptionDurationDays),
          telegram_channel_link: form.telegramChannelLink || null,
          telegram_channel_name: form.telegramChannelName || null,
          public_profile_url: form.publicProfileUrl || null,
          public_profile_name: form.publicProfileName || null,
          public_twitter_url: form.publicTwitterUrl || null,
          is_active: form.isActive,
          free_trial_enabled: form.freeTrialEnabled,
          free_trial_days: parseInt(form.freeTrialDays) || 3,
          referral_enabled: form.referralEnabled,
          referral_bonus_days: parseInt(form.referralBonusDays) || 7,
          referral_friend_discount_pct: parseInt(form.referralFriendDiscount) || 0,
          reviews_enabled: form.reviewsEnabled,
          review_bonus_days: parseInt(form.reviewBonusDays) || 1,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <main style={{ minHeight: '100dvh', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
        <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Settings</h1>
      </div>

      {[
        { label: 'TON Wallet Address', field: 'paymentAddress', placeholder: 'UQA...' },
        { label: 'Subscription Price (TON)', field: 'subscriptionPriceTon', placeholder: '5.0', type: 'number' },
        { label: 'Duration (days)', field: 'subscriptionDurationDays', placeholder: '30', type: 'number' },
        { label: 'Private Channel Name', field: 'telegramChannelName', placeholder: 'My Premium Channel' },
        { label: 'Channel Invite Link', field: 'telegramChannelLink', placeholder: 'https://t.me/+xxxxxxxxxx' },
        { label: 'Public Profile URL (for Ranking)', field: 'publicProfileUrl', placeholder: 'https://t.me/mypublicchannel' },
        { label: 'Display Name (for Ranking)', field: 'publicProfileName', placeholder: 'My Creator Name' },
      ].map(f => (
        <div key={f.field} className="input-wrap">
          <label className="input-label">{f.label}</label>
          <input className="input" type={f.type || 'text'} placeholder={f.placeholder}
            value={form[f.field] || ''} onChange={e => set(f.field, e.target.value)} />
        </div>
      ))}

      {/* Free Trial */}
      <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
          <div onClick={() => set('freeTrialEnabled', !form.freeTrialEnabled)} style={{
            width: 44, height: 24, borderRadius: '12px', position: 'relative',
            background: form.freeTrialEnabled ? 'var(--green)' : 'var(--border)', transition: 'background 0.2s',
          }}>
            <div style={{ position: 'absolute', top: 2, left: form.freeTrialEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>🎁 Free Trial</span>
        </label>
        {form.freeTrialEnabled && (
          <div className="input-wrap">
            <label className="input-label">Trial Duration (days)</label>
            <input className="input" type="number" min="1" max="30" value={form.freeTrialDays || '3'} onChange={e => set('freeTrialDays', e.target.value)} />
          </div>
        )}
      </div>

      {/* Referral */}
      <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
          <div onClick={() => set('referralEnabled', !form.referralEnabled)} style={{
            width: 44, height: 24, borderRadius: '12px', position: 'relative',
            background: form.referralEnabled ? 'var(--green)' : 'var(--border)', transition: 'background 0.2s',
          }}>
            <div style={{ position: 'absolute', top: 2, left: form.referralEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>👥 Referral Program</span>
        </label>
        {form.referralEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="input-wrap">
              <label className="input-label">Bonus Days for Referrer</label>
              <input className="input" type="number" min="1" value={form.referralBonusDays || '7'} onChange={e => set('referralBonusDays', e.target.value)} />
            </div>
            <div className="input-wrap">
              <label className="input-label">Friend Discount (%)</label>
              <input className="input" type="number" min="0" max="50" value={form.referralFriendDiscount || '0'} onChange={e => set('referralFriendDiscount', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
          <div onClick={() => set('reviewsEnabled', !form.reviewsEnabled)} style={{
            width: 44, height: 24, borderRadius: '12px', position: 'relative',
            background: form.reviewsEnabled ? 'var(--green)' : 'var(--border)', transition: 'background 0.2s',
          }}>
            <div style={{ position: 'absolute', top: 2, left: form.reviewsEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>⭐ Reviews</span>
        </label>
        {form.reviewsEnabled && (
          <div className="input-wrap">
            <label className="input-label">Review Bonus Days</label>
            <input className="input" type="number" min="0" max="7" value={form.reviewBonusDays || '1'} onChange={e => set('reviewBonusDays', e.target.value)} />
          </div>
        )}
      </div>

      <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
        <div onClick={() => set('isActive', !form.isActive)} style={{
          width: 44, height: 24, borderRadius: '12px', position: 'relative',
          background: form.isActive ? 'var(--green)' : 'var(--border)', transition: 'background 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 2, left: form.isActive ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
          }} />
        </div>
        <span style={{ fontSize: '14px' }}>
          Accept payments {form.isActive
            ? <span style={{ color: 'var(--green)' }}>(active)</span>
            : <span style={{ color: 'var(--text-muted)' }}>(paused)</span>}
        </span>
      </label>

      {error && (
        <div style={{ padding: '10px', background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</> :
         saved ? '✓ Saved!' : 'Save Changes'}
      </button>
    </main>
  );
}
