'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

interface Props {
  onSuccess?: () => void;
  callbackUrl?: string;
}

export default function TelegramLoginButton({ onSuccess, callbackUrl }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [autoLogging, setAutoLogging] = useState(false);
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'TON_pass_bot';

  useEffect(() => {
    // Try Mini App auto-login first
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user;
      setAutoLogging(true);
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
        callbackUrl,
      }).then(result => {
        if (result?.ok && onSuccess) onSuccess();
        setAutoLogging(false);
      });
      return;
    }

    // Fallback: Telegram Login Widget for browser
    if (!ref.current) return;

    (window as any).onTelegramAuth = async (user: any) => {
      const result = await signIn('telegram', {
        ...user,
        is_mini_app: 'false',
        redirect: false,
        callbackUrl,
      });
      if (result?.ok && onSuccess) onSuccess();
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    ref.current.innerHTML = '';
    ref.current.appendChild(script);
  }, [botName, callbackUrl, onSuccess]);

  if (autoLogging) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div className="spinner" />
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Signing in with Telegram…</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <div ref={ref} />
      <p style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
        Log in with your Telegram account.<br />
        We only access your public profile info.
      </p>
    </div>
  );
}
