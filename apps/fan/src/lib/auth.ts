import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        id: { label: 'Telegram ID', type: 'text' },
        first_name: { label: 'First Name', type: 'text' },
        last_name: { label: 'Last Name', type: 'text' },
        username: { label: 'Username', type: 'text' },
        photo_url: { label: 'Photo URL', type: 'text' },
        auth_date: { label: 'Auth Date', type: 'text' },
        hash: { label: 'Hash', type: 'text' },
        is_mini_app: { label: 'Is Mini App', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.id) return null;

        // If coming from Telegram Mini App, skip hash verification
        // (initDataUnsafe is already verified by Telegram)
        if (credentials.is_mini_app !== 'true') {
          // Verify Telegram Login Widget hash
          const crypto = require('crypto');
          const botToken = process.env.TELEGRAM_BOT_TOKEN!;
          const secretKey = crypto.createHash('sha256').update(botToken).digest();

          const dataCheckArr = Object.entries(credentials)
            .filter(([k]) => k !== 'hash' && k !== 'is_mini_app')
            .filter(([, v]) => v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

          const hmac = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckArr)
            .digest('hex');

          const authDate = parseInt(credentials.auth_date || '0');
          const now = Math.floor(Date.now() / 1000);

          if (hmac !== credentials.hash || now - authDate > 86400) {
            return null;
          }
        }

        return {
          id: credentials.id,
          name: [credentials.first_name, credentials.last_name].filter(Boolean).join(' ') || null,
          image: credentials.photo_url || null,
          telegramId: credentials.id,
          telegramUsername: credentials.username || '',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.telegramId = (user as any).telegramId;
        token.telegramUsername = (user as any).telegramUsername;
        token.telegramName = user.name ?? undefined;
        token.telegramAvatar = user.image ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        telegramId: token.telegramId as string,
        telegramUsername: token.telegramUsername as string,
        telegramName: token.telegramName as string,
        telegramAvatar: token.telegramAvatar as string,
      };
      return session;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};
