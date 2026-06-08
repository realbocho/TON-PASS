'use client';

import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const manifestUrl =
  process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL ||
  'https://ton-pass.vercel.app/tonconnect-manifest.json';

const TGA_TOKEN = 'eyJhcHBfbmFtZSI6InRvbl9wYXNzIiwiYXBwX3VybCI6Imh0dHBzOi8vdC5tZS9UT05fcGFzc19ib3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly90b24tcGFzcy52ZXJjZWwuYXBwIn0=!oUOT2W2zad3JOwTtnpyTwEpry0koy/HfORw7CTLtoD4=';

function TelegramInit() {
  const { status } = useSession();
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (initialized.current) return;
    initialized.current = true;

    const tg = (window as any).Telegram?.WebApp;
    const isTelegramApp = !!tg?.initData;

    // Not in Telegram → redirect once
    if (!isTelegramApp) {
      const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'TON_pass_bot';
      const payMatch = window.location.pathname.match(/^\/pay\/(.+)$/);
      if (payMatch) {
        window.location.replace(`https://t.me/${botName}/tps?startapp=pay_${payMatch[1]}`);
      } else {
        window.location.replace(`https://t.me/${botName}/tps`);
      }
      return;
    }

    // Inside Telegram Mini App
    tg.ready();
    tg.expand();

    // Telegram Analytics
    const script = document.createElement('script');
    script.src = 'https://tganalytics.xyz/index.js';
    script.async = true;
    script.onload = () => {
      (window as any).telegramAnalytics?.init({
        token: TGA_TOKEN,
        appName: 'ton_pass',
      });
    };
    document.head.appendChild(script);

    // Handle startapp → route to pay page
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam?.startsWith('pay_')) {
      const slug = startParam.replace('pay_', '');
      if (!window.location.pathname.startsWith('/pay/')) {
        router.replace(`/pay/${slug}`);
      }
    }
  }, []); // Empty deps - run only once on mount

  // Auto-login - separate effect
  useEffect(() => {
    if (status !== 'unauthenticated') return;
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initDataUnsafe?.user) return;

    const user = tg.initDataUnsafe.user;
    signIn('telegram', {
      id: String(user.id),
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      photo_url: user.photo_url || '',
      auth_date: String(Math.floor(Date.now() / 1000)),
      hash: '',
      is_mini_app: 'true',
      redirect: false,
    });
  }, [status]);

  return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0f" />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>
        <SessionProvider>
          <TonConnectUIProvider
            manifestUrl={manifestUrl}
            actionsConfiguration={{
              twaReturnUrl: 'https://t.me/TON_pass_bot/tps',
            }}
          >
            <TelegramInit />
            {children}
          </TonConnectUIProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
