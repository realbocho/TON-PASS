'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RankingItem {
  rank: number;
  username: string;
  avatar?: string;
  twitterUrl: string;
  payUrl: string;
  slug: string;
  avgRating: number;
  reviewCount: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.ready();
      (window as any).Telegram.WebApp.expand();
    }
    fetchRanking();
  }, []);

  async function fetchRanking() {
    try {
      const res = await fetch('/api/ranking');
      const data = await res.json();
      setRanking(data.ranking || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--accent-dim), var(--ton-dim))',
          border: '1px solid var(--border-bright)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0,
        }}>
          🏆
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Creator Rankings</h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Discover amazing creators and unlock exclusive private content — all powered by TON.
          </p>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && ranking.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              No creators yet. Be the first!
            </p>
          </div>
        )}

        {ranking.map((item) => (
          <div
            key={item.rank}
            className="card fade-up"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px',
              borderColor: item.rank <= 3 ? 'rgba(255,214,10,0.15)' : 'var(--border)',
              background: item.rank === 1
                ? 'linear-gradient(135deg, rgba(255,214,10,0.05), var(--bg-card))'
                : item.rank === 2
                ? 'linear-gradient(135deg, rgba(192,192,192,0.05), var(--bg-card))'
                : item.rank === 3
                ? 'linear-gradient(135deg, rgba(205,127,50,0.05), var(--bg-card))'
                : 'var(--bg-card)',
            }}
          >
            {/* Rank */}
            <div style={{
              width: 32, flexShrink: 0, textAlign: 'center',
              fontSize: item.rank <= 3 ? '22px' : '14px',
              fontWeight: 700,
              color: item.rank <= 3 ? 'var(--yellow)' : 'var(--text-dim)',
              fontFamily: item.rank > 3 ? 'JetBrains Mono' : undefined,
            }}>
              {item.rank <= 3 ? medals[item.rank] : `#${item.rank}`}
            </div>

            {/* Avatar */}
            <a
              href={item.twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0 }}
            >
              {item.avatar ? (
                <img
                  src={item.avatar}
                  alt={item.username}
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: item.rank <= 3 ? '2px solid var(--yellow)' : '2px solid var(--border)',
                  }}
                />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  👤
                </div>
              )}
            </a>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={item.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block' }}
              >
                <div style={{
                  fontWeight: 700, fontSize: '15px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  @{item.username}
                </div>
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                {item.avgRating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--yellow)' }}>{'⭐'.repeat(Math.round(item.avgRating))}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.avgRating.toFixed(1)} ({item.reviewCount})
                    </span>
                  </div>
                )}
                {item.avgRating === 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>No reviews yet</div>
                )}
              </div>
            </div>

            {/* Subscribe button */}
            <Link
              href={item.payUrl}
              className="btn btn-ton btn-sm"
              style={{ flexShrink: 0 }}
            >
              Subscribe
            </Link>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px', textAlign: 'center',
        borderTop: '1px solid var(--border)',
        fontSize: '11px', color: 'var(--text-dim)',
      }}>
        Rankings are based on page visits · Updated in real-time
      </div>
    </main>
  );
}
