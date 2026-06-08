'use client';

import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';

const manifestUrl =
  process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL ||
  'https://ton-pass.vercel.app/tonconnect-manifest.json';

const TGA_TOKEN = 'eyJhcHBfbmFtZSI6InRvbl9wYXNzIiwiYXBwX3VybCI6Imh0dHBzOi8vdC5tZS9UT05fcGFzc19ib3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly90b24tcGFzcy52ZXJjZWwuYXBwIn0=!oUOT2W2zad3JOwTtnpyTwEpry0koy/HfORw7CTLtoD4=';

function TelegramInit() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Init Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Telegram Analytics
    const script = document.createElement('script');
    script.src = 'https://tganalytics.xyz/index.js';
    script.async = true;
    script.type = 'text/javascript';
    script.onload = () => {
      (window as any).telegramAnalytics?.init({
        token: TGA_TOKEN,
        appName: 'ton_pass',
      });
    };
    document.head.appendChild(script);

    // Auto-login from Mini App
    if (status === 'unauthenticated' && tg?.initDataUnsafe?.user) {
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
    }
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
          <TonConnectUIProvider manifestUrl={manifestUrl}>
            <TelegramInit />
            {children}
          </TonConnectUIProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
