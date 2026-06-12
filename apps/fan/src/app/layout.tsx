'use client';

import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';

const manifestUrl =
  process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL ||
  'https://ton-pass.vercel.app/tonconnect-manifest.json';

const TGA_TOKEN = 'eyJhcHBfbmFtZSI6InRvbnBhc3MiLCJhcHBfdXJsIjoiaHR0cHM6Ly90Lm1lL1RPTl9wYXNzX2JvdCIsImFwcF9kb21haW4iOiJodHRwczovL3Rvbi1wYXNzLnZlcmNlbC5hcHAifQ==!3/V/NrtRx0eLM01FlfGc0INDfIVN8QDUaFMrmReMxEc=';

function TelegramInit() {
  const { status } = useSession();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Telegram Analytics - load unconditionally so it isn't skipped
    // if Telegram WebApp script hasn't finished loading yet (race condition)
    const script = document.createElement('script');
    script.src = 'https://tganalytics.xyz/index.js';
    script.async = true;
    script.onload = () => {
      (window as any).telegramAnalytics?.init({ token: TGA_TOKEN, appName: 'tonpass' });
    };
    document.head.appendChild(script);

    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) return;

    tg.ready();
    tg.expand();

    // Handle startapp via initDataUnsafe (middleware handles URL params)
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = 
      tg.initDataUnsafe?.start_param ||
      urlParams.get('tgWebAppStartParam') ||
      urlParams.get('startapp') ||
      '';
    if (startParam.startsWith('p-')) {
      const slug = startParam.replace('p-', '');
      if (!window.location.pathname.startsWith('/pay/')) {
        window.location.replace(`/pay/${slug}`);
        return;
      }
    }
  }, []);

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
