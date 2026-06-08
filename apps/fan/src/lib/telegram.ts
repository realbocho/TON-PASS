// Telegram Bot notifications for TON-PASS

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    return data.ok;
  } catch {
    return false;
  }
}

// Notify creator of new payment pending approval
export async function notifyNewPayment(params: {
  chatId: string;
  fanUsername: string;
  amountTon: number;
  dashboardUrl: string;
}): Promise<boolean> {
  const text =
    `💰 <b>New Payment Received!</b>\n\n` +
    `Fan: @${params.fanUsername}\n` +
    `Amount: ${params.amountTon.toFixed(2)} TON\n\n` +
    `<a href="${params.dashboardUrl}">👉 Approve in Dashboard</a>`;

  return sendTelegramMessage(params.chatId, text);
}

// Notify creator of expiring subscriptions
export async function notifyExpiringSubscriptions(params: {
  chatId: string;
  expiringFans: Array<{ username: string; daysLeft: number }>;
  dashboardUrl: string;
}): Promise<boolean> {
  const fanList = params.expiringFans
    .map(f => `• @${f.username} — ${f.daysLeft.toFixed(0)} day(s) left`)
    .join('\n');

  const text =
    `⏰ <b>Subscriptions Expiring Soon</b>\n\n` +
    `${fanList}\n\n` +
    `Please unfollow expired fans on Twitter.\n` +
    `<a href="${params.dashboardUrl}">👉 Manage in Dashboard</a>`;

  return sendTelegramMessage(params.chatId, text);
}

// Send renewal reminder directly to fan (via Telegram if they have a bot chat)
export async function notifyFanRenewal(params: {
  chatId: string;
  creatorUsername: string;
  expiresAt: string;
  paymentUrl: string;
}): Promise<boolean> {
  const text =
    `⚠️ <b>Subscription Expiring Soon</b>\n\n` +
    `Your subscription to @${params.creatorUsername}'s private account ` +
    `expires on <b>${new Date(params.expiresAt).toLocaleDateString()}</b>.\n\n` +
    `<a href="${params.paymentUrl}">🔄 Renew Now</a>`;

  return sendTelegramMessage(params.chatId, text);
}
