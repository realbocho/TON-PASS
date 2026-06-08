import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      telegramId: string;
      telegramUsername: string;
      telegramName: string;
      telegramAvatar: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    telegramId?: string;
    telegramUsername?: string;
    telegramName?: string;
    telegramAvatar?: string;
  }
}
