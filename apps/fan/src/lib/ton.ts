// TON blockchain utilities for TON-PASS

export const TON_DECIMALS = 1_000_000_000; // 1 TON = 10^9 nanoTON

export interface TonPaymentPayload {
  creatorAddress: string;
  amountNano: string; // nanoTON as string
  comment: string;    // payment ID as memo
}

/**
 * Convert TON to nanoTON
 */
export function toNano(ton: number): bigint {
  return BigInt(Math.round(ton * TON_DECIMALS));
}

/**
 * Convert nanoTON to TON
 */
export function fromNano(nano: bigint | string): number {
  return Number(BigInt(nano)) / TON_DECIMALS;
}

/**
 * Build a TON payment comment (used to match tx to payment)
 * Format: TONPASS-{paymentId}
 */
export function buildPaymentComment(paymentId: string): string {
  return `TONPASS-${paymentId}`;
}

/**
 * Parse payment ID from comment
 */
export function parsePaymentComment(comment: string): string | null {
  const match = comment.match(/^TONPASS-([a-f0-9-]{36})$/);
  return match ? match[1] : null;
}

/**
 * Verify a TON transaction against expected payment
 * Called from the webhook/polling endpoint
 */
export async function verifyTonTransaction(params: {
  txHash: string;
  expectedAddress: string;
  expectedAmountNano: string;
  expectedComment: string;
}): Promise<{ valid: boolean; error?: string }> {
  try {
    // Use TON Center API (mainnet)
    const apiKey = process.env.TON_API_KEY || '';
    const baseUrl = process.env.TON_NETWORK === 'testnet'
      ? 'https://testnet.toncenter.com/api/v2'
      : 'https://toncenter.com/api/v2';

    const res = await fetch(
      `${baseUrl}/getTransactions?address=${params.expectedAddress}&limit=50${apiKey ? `&api_key=${apiKey}` : ''}`,
    );
    const data = await res.json();

    if (!data.ok) {
      return { valid: false, error: 'Failed to fetch TON transactions' };
    }

    const txs: any[] = data.result || [];
    const tx = txs.find((t: any) => {
      // Match by incoming message
      const inMsg = t.in_msg;
      if (!inMsg) return false;
      const commentHex = inMsg.message || '';
      const decodedComment = hexToUtf8(commentHex);
      return decodedComment === params.expectedComment;
    });

    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    const inMsg = tx.in_msg;
    const receivedNano = inMsg.value?.toString() || '0';

    if (BigInt(receivedNano) < BigInt(params.expectedAmountNano)) {
      return { valid: false, error: 'Insufficient amount' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

function hexToUtf8(hex: string): string {
  try {
    const bytes = hex.match(/.{1,2}/g) || [];
    return decodeURIComponent(bytes.map(b => '%' + b).join(''));
  } catch {
    return '';
  }
}
