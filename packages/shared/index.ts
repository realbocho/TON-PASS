// ============================================
// TON-PASS Shared Types & Constants
// ============================================

export const TON_PASS_FEE_RATE = 0.05; // 5%
export const EXPIRY_WARNING_DAYS = 3;

export type PaymentStatus =
  | 'pending_payment'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'refunded';

export interface Creator {
  id: string;
  twitter_id: string;
  twitter_username: string;
  twitter_avatar?: string;
  telegram_chat_id?: string;
  private_account_url?: string;
  private_account_username?: string;
  subscription_price_ton: number;
  subscription_duration_days: number;
  payment_address: string;
  link_slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  creator_id: string;
  fan_twitter_id: string;
  fan_twitter_username: string;
  fan_twitter_avatar?: string;
  amount_ton: number;
  fee_ton: number;
  total_ton: number;
  ton_tx_hash?: string;
  ton_tx_confirmed: boolean;
  status: PaymentStatus;
  subscribed_at?: string;
  expires_at?: string;
  approved_at?: string;
  rejected_at?: string;
  refunded_at?: string;
  refund_tx_hash?: string;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithCreator extends Payment {
  creator_username: string;
  private_account_username?: string;
}

// Calculate fee and total
export function calculateFee(amountTon: number): {
  amount: number;
  fee: number;
  total: number;
} {
  const fee = amountTon * TON_PASS_FEE_RATE;
  return {
    amount: amountTon,
    fee: parseFloat(fee.toFixed(9)),
    total: parseFloat((amountTon + fee).toFixed(9)),
  };
}

// Format TON amount for display
export function formatTon(amount: number): string {
  return `${amount.toFixed(2)} TON`;
}

// Generate payment link URL
export function getPaymentUrl(slug: string, baseUrl: string): string {
  return `${baseUrl}/pay/${slug}`;
}
