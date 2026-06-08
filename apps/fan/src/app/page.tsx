'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [shown, setShown] = useState(false);
  const [hasCreator, setHasCreator] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !tg.initData) {
      const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'TON_pass_bot';
      window.location.href = `https://t.me/${botName}/app`;
      return;
    }
    tg.ready();
    tg.expand();
    setTimeout(() => setShown(true), 300);

    // Check if already registered
    fetch('/api/creator/register')
      .then(r => r.json())
      .then(d => { if (d.creator) setHasCreator(true); })
      .catch(() => {});
  }, []);

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes shimmer {
          0%   { box-shadow: 0 0 0px rgba(0,212,255,0); border-color: rgba(0,212,255,0.2); }
          50%  { box-shadow: 0 0 24px rgba(0,212,255,0.5), 0 0 48px rgba(0,212,255,0.2); border-color: rgba(0,212,255,0.8); }
          100% { box-shadow: 0 0 0px rgba(0,212,255,0); border-color: rgba(0,212,255,0.2); }
        }
        @keyframes shimmerTon {
          0%   { box-shadow: 0 0 0px rgba(0,152,234,0); border-color: rgba(0,152,234,0.2); }
          50%  { box-shadow: 0 0 24px rgba(0,152,234,0.5), 0 0 48px rgba(0,152,234,0.2); border-color: rgba(0,152,234,0.8); }
          100% { box-shadow: 0 0 0px rgba(0,152,234,0); border-color: rgba(0,152,234,0.2); }
        }
        @keyframes textPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .btn-ranking-shine {
          animation: shimmer 2s ease-in-out infinite;
          border: 1px solid rgba(0,212,255,0.2);
          position: relative;
          overflow: hidden;
        }
        .btn-ranking-shine::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -75%;
          width: 50%;
          height: 200%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255,255,255,0.12),
            transparent
          );
          animation: sweep 2.5s ease-in-out infinite;
          transform: skewX(-20deg);
        }
        @keyframes sweep {
          0% { left: -75%; }
          100% { left: 125%; }
        }
        .promo-text {
          animation: textPulse 3s ease-in-out infinite;
        }
        .logo-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Background glows */}
      <div style={{
        position: 'absolute', top: '-10%', left: '50%',
        transform: 'translateX(-50%)',
        width: '700px', height: '700px',
        background: 'radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-20%',
        width: '400px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(0,152,234,0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div
        className="fade-up"
        style={{ textAlign: 'center', maxWidth: '360px', width: '100%', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '28px' }}>
          <div
            className="logo-float"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '76px', height: '76px', borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,152,234,0.15))',
              border: '1px solid var(--border-bright)',
              marginBottom: '16px',
              fontSize: '34px',
            }}
          >
            🔐
          </div>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              TON<span style={{ color: 'var(--accent)' }}>PASS</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Borderless private Telegram channel monetization
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
          {['No KYC', 'TON Chain', '5% Fee', 'Instant'].map(f => (
            <span key={f} style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', letterSpacing: '0.04em',
            }}>
              {f}
            </span>
          ))}
        </div>

        {/* How it works flow */}
        <div style={{
          marginBottom: '24px',
          padding: '18px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', textAlign: 'center' }}>
            ⚡ How it works
          </div>
          {[
            { step: '1', color: 'var(--accent)', label: 'Set up your page', desc: 'Wallet · price · private account' },
            { step: '2', color: 'var(--green)', label: 'Share your link', desc: 'Paste it anywhere — Telegram, Twitter, Instagram...' },
            { step: '3', color: 'var(--ton)', label: 'Fan pays with TON', desc: 'They connect Telegram + wallet and confirm' },
            { step: '4', color: '#a78bfa', label: 'You send the invite link', desc: 'Approve in dashboard → DM the fan the channel link' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `${item.color}20`,
                  border: `1px solid ${item.color}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '12px', color: item.color,
                }}>
                  {item.step}
                </div>
                {i < 3 && <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '3px 0' }} />}
              </div>
              <div style={{ paddingTop: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{item.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: i < 3 ? '0' : '0' }}>{item.desc}</div>
              </div>
            </div>
          ))}
          <div style={{
            marginTop: '14px', padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(0,229,153,0.08)',
            border: '1px solid rgba(0,229,153,0.15)',
            fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center',
          }}>
            🎉 <strong style={{ color: 'var(--text)' }}>Just a link.</strong> No payment gateway. No KYC.
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link href="/dashboard" className="btn btn-primary btn-lg btn-full">
            🎨 Creator Dashboard
          </Link>
          {hasCreator ? (
            <div
              className="btn btn-ghost btn-lg btn-full"
              style={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
            >
              ✨ Already Set Up
            </div>
          ) : (
            <Link href="/creator/onboard" className="btn btn-ghost btn-lg btn-full">
              ✨ Set Up My Page
            </Link>
          )}

          {/* Ranking button - shimmering */}
          <Link
            href="/ranking"
            className="btn btn-ghost btn-lg btn-full btn-ranking-shine"
            style={{ flexDirection: 'column', gap: '4px', padding: '14px 20px', height: 'auto' }}
          >
            <span style={{ fontSize: '16px' }}>🏆 Creator Rankings</span>
            <span
              className="promo-text"
              style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}
            >
              Discover amazing creators and unlock exclusive private content — all powered by TON.
            </span>
          </Link>
        </div>

        <p style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Share your <code style={{ color: 'var(--accent)' }}>tonpass.app/pay/yourname</code> link anywhere.<br />
          Fans pay → you approve → done.
        </p>
      </div>
    </main>
  );
}
