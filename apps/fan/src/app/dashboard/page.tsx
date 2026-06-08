'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import TelegramLoginButton from '@/components/TelegramLoginButton';

interface Payment {
  id: string;
  fan_twitter_username: string;
  fan_twitter_avatar?: string;
  fan_telegram_username?: string;
  fan_telegram_id?: string;
  amount_ton: number;
  status: string;
  created_at: string;
  expires_at?: string;
}

interface Stats {
  pendingCount: number;
  activeCount: number;
  expiringSoonCount: number;
  totalRevenue: number;
}

type Tab = 'pending' | 'active' | 'expiring';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<Payment[]>([]);
  const [active, setActive] = useState<Payment[]>([]);
  const [expiring, setExpiring] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const creatorRes = await fetch('/api/creator/register');
      const creatorData = await creatorRes.json();
      if (!creatorData.creator) {
        router.push('/creator/onboard');
        return;
      }
      setCreator(creatorData.creator);

      const res = await fetch('/api/creator/dashboard');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPending(data.pending);
      setActive(data.active);
      setExpiring(data.expiringSoon);
      setStats(data.stats);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === 'authenticated') fetchData();
    else if (status === 'unauthenticated') setLoading(false);
  }, [status, fetchData]);

  async function handleApprove(paymentId: string) {
    setActionLoading(paymentId);
    try {
      await fetch('/api/creator/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(paymentId: string) {
    if (!confirm('Reject and refund this payment?')) return;
    setActionLoading(paymentId);
    try {
      await fetch('/api/creator/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExpire(paymentId: string) {
    setActionLoading(paymentId);
    try {
      await fetch('/api/creator/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  function openTelegram(username: string) {
    window.open(`https://t.me/${username.replace('@', '')}`, '_blank');
  }

  function copyLink() {
    if (creator?.link_slug) {
      const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'TON_pass_bot';
      const tgLink = `https://t.me/${botName}/tps?startapp=pay_${creator.link_slug}`;
      navigator.clipboard?.writeText(tgLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (status === 'loading' || loading) return <LoadingScreen />;

  if (status === 'unauthenticated') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>Creator Login</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            Sign in with Telegram to access your dashboard.
          </p>
          <TelegramLoginButton callbackUrl="/dashboard" />
        </div>
      </div>
    );
  }

  const tabList = [
    { id: 'pending' as Tab, label: 'Pending', count: stats?.pendingCount || 0, dot: 'var(--yellow)' },
    { id: 'active' as Tab, label: 'Active', count: stats?.activeCount || 0, dot: 'var(--green)' },
    { id: 'expiring' as Tab, label: 'Expiring', count: stats?.expiringSoonCount || 0, dot: 'var(--red)' },
  ];

  const currentList = tab === 'pending' ? pending : tab === 'active' ? active : expiring;

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {session?.user?.telegramAvatar && (
          <img src={session.user.telegramAvatar} style={{ width: 36, height: 36, borderRadius: '50%' }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>
            {session?.user?.telegramUsername ? `@${session.user.telegramUsername}` : session?.user?.telegramName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Creator Dashboard</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/creator/settings')}>⚙️</button>
      </div>

      {/* Payment link */}
      {creator?.link_slug && (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              t.me/TON_pass_bot/tps?startapp=pay_{creator.link_slug}
            </span>
            <button className="btn btn-primary btn-sm" onClick={copyLink} style={{ flexShrink: 0, minWidth: '80px' }}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div style={{ padding: '12px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 700, color: 'var(--ton)' }}>
              {stats.totalRevenue.toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>TON EARNED</div>
          </div>
          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 700, color: 'var(--green)' }}>
              {stats.activeCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>ACTIVE SUBS</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: '6px' }}>
        {tabList.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 'var(--radius-sm)',
            border: `1px solid ${tab === t.id ? 'var(--border-bright)' : 'var(--border)'}`,
            background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
            color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            {t.count > 0 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot }} />}
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: `${t.dot}22`, color: t.dot,
                padding: '1px 7px', borderRadius: '10px', fontSize: '10px',
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {currentList.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px' }}>
              {tab === 'pending' ? '⏳' : tab === 'active' ? '✅' : '🔔'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {tab === 'pending' ? 'No pending approvals' : tab === 'active' ? 'No active subscriptions' : 'No subscriptions expiring soon'}
            </div>
          </div>
        )}

        {tab === 'pending' && pending.map(p => (
          <PendingCard key={p.id} payment={p}
            onApprove={() => handleApprove(p.id)}
            onReject={() => handleReject(p.id)}
            onOpenTelegram={() => openTelegram(p.fan_telegram_username || p.fan_twitter_username)}
            loading={actionLoading === p.id}
          />
        ))}

        {tab === 'active' && active.map(p => (
          <ActiveCard key={p.id} payment={p}
            onOpenTelegram={() => openTelegram(p.fan_telegram_username || p.fan_twitter_username)}
          />
        ))}

        {tab === 'expiring' && expiring.map(p => (
          <ExpiringCard key={p.id} payment={p}
            onOpenTelegram={() => openTelegram(p.fan_telegram_username || p.fan_twitter_username)}
            onExpire={() => handleExpire(p.id)}
            loading={actionLoading === p.id}
          />
        ))}
      </div>
    </main>
  );
}

function PendingCard({ payment, onApprove, onReject, onOpenTelegram, loading }: any) {
  return (
    <div className="card fade-up" style={{ borderColor: 'rgba(255,214,10,0.2)' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={onOpenTelegram}>
          {payment.fan_twitter_avatar ? (
            <img src={payment.fan_twitter_avatar} style={{ width: 40, height: 40, borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👤</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, cursor: 'pointer', fontSize: '15px' }} onClick={onOpenTelegram}>
            {payment.fan_telegram_username ? `@${payment.fan_telegram_username}` : payment.fan_twitter_username}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--ton)' }}>
            {payment.amount_ton.toFixed(2)} TON
          </div>
          <span className="badge badge-pending">Pending</span>
        </div>
      </div>

      {/* Instruction */}
      <div style={{
        padding: '8px 10px', borderRadius: 'var(--radius-sm)',
        background: 'rgba(255,214,10,0.05)', border: '1px solid rgba(255,214,10,0.15)',
        fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5,
      }}>
        💬 After approving, send the fan your private channel invite link via Telegram DM.
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-ghost btn-sm" onClick={onOpenTelegram} style={{ flex: 1 }}>
          ✈️ Message on Telegram
        </button>
        <button className="btn btn-green btn-sm" onClick={onApprove} disabled={loading} style={{ flex: 1 }}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '✓ Approve'}
        </button>
        <button className="btn btn-red btn-sm" onClick={onReject} disabled={loading} style={{ flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}

function ActiveCard({ payment, onOpenTelegram }: any) {
  const daysLeft = payment.expires_at
    ? Math.ceil((new Date(payment.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={onOpenTelegram}>
          {payment.fan_twitter_avatar
            ? <img src={payment.fan_twitter_avatar} style={{ width: 38, height: 38, borderRadius: '50%' }} />
            : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, cursor: 'pointer' }} onClick={onOpenTelegram}>
            {payment.fan_telegram_username ? `@${payment.fan_telegram_username}` : payment.fan_twitter_username}
          </div>
          {payment.expires_at && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Expires {format(new Date(payment.expires_at), 'MMM d, yyyy')}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--ton)' }}>
            {payment.amount_ton.toFixed(2)} TON
          </div>
          {daysLeft !== null && (
            <div style={{ fontSize: '11px', color: daysLeft <= 5 ? 'var(--yellow)' : 'var(--text-muted)' }}>
              {daysLeft}d left
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpiringCard({ payment, onOpenTelegram, onExpire, loading }: any) {
  const daysLeft = payment.expires_at
    ? Math.ceil((new Date(payment.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="card" style={{ borderColor: 'rgba(255,77,106,0.2)' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ cursor: 'pointer' }} onClick={onOpenTelegram}>
          {payment.fan_twitter_avatar
            ? <img src={payment.fan_twitter_avatar} style={{ width: 40, height: 40, borderRadius: '50%' }} />
            : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, cursor: 'pointer' }} onClick={onOpenTelegram}>
            {payment.fan_telegram_username ? `@${payment.fan_telegram_username}` : payment.fan_twitter_username}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px' }}>
            ⚠️ Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', padding: '8px 10px', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)' }}>
        Remove the fan from your Telegram channel first, then mark as expired.
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-ghost btn-sm" onClick={onOpenTelegram} style={{ flex: 1 }}>
          ✈️ Open on Telegram
        </button>
        <button className="btn btn-red btn-sm" onClick={onExpire} disabled={loading} style={{ flex: 1 }}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '✓ Mark Expired'}
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading dashboard…</div>
      </div>
    </div>
  );
}
