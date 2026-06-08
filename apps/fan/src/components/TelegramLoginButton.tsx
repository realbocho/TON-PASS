'use client';

import { useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';

interface Props {
  onSuccess?: () => void;
  callbackUrl?: string;
}

export default function TelegramLoginButton({ onSuccess, callbackUrl }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'TON_pass_bot';

  useEffect(() => {
    if (!ref.current) return;

    (window as any).onTelegramAuth = async (user: any) => {
      const result = await signIn('telegram', {
        ...user,
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
