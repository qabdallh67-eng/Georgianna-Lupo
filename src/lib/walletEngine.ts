export type WalletTxType = 'deposit' | 'payment' | 'refund' | 'adjustment';
export type WalletTxStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface WalletLedgerState {
  currentBalance: number;
  availableBalance: number;
  processedReferences: Set<string>;
}

export interface WalletTxInput {
  txType: WalletTxType;
  amount: number;
  referenceCode: string;
  status: WalletTxStatus;
}

export interface WalletTxResult {
  ok: boolean;
  errorCode?: 'INVALID_AMOUNT' | 'DUPLICATE_REFERENCE' | 'INSUFFICIENT_BALANCE';
  nextState: WalletLedgerState;
}

export function formatCurrencyAmount(
  amount: number,
  currency: string = 'EGP',
  locale: 'ar' | 'en' = 'ar'
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
  const label =
    locale === 'ar'
      ? currency === 'EGP'
        ? 'ج.م'
        : currency === 'SAR'
          ? 'ر.س'
          : currency
      : currency;
  return `${formatted} ${label}`;
}

export function processWalletTransaction(
  state: WalletLedgerState,
  tx: WalletTxInput
): WalletTxResult {
  if (!Number.isFinite(tx.amount) || tx.amount <= 0) {
    return { ok: false, errorCode: 'INVALID_AMOUNT', nextState: state };
  }

  const ref = tx.referenceCode.trim();
  if (!ref || state.processedReferences.has(ref)) {
    return { ok: false, errorCode: 'DUPLICATE_REFERENCE', nextState: state };
  }

  if (tx.status !== 'completed') {
    const nextRefs = new Set(state.processedReferences);
    nextRefs.add(ref);
    return {
      ok: true,
      nextState: {
        ...state,
        processedReferences: nextRefs,
      },
    };
  }

  let nextCurrent = state.currentBalance;
  let nextAvailable = state.availableBalance;

  if (tx.txType === 'deposit' || tx.txType === 'refund' || tx.txType === 'adjustment') {
    nextCurrent = Math.round((nextCurrent + tx.amount) * 100) / 100;
    nextAvailable = Math.round((nextAvailable + tx.amount) * 100) / 100;
  } else if (tx.txType === 'payment') {
    if (state.availableBalance < tx.amount) {
      return { ok: false, errorCode: 'INSUFFICIENT_BALANCE', nextState: state };
    }
    nextCurrent = Math.round((nextCurrent - tx.amount) * 100) / 100;
    nextAvailable = Math.round((nextAvailable - tx.amount) * 100) / 100;
  }

  const nextRefs = new Set(state.processedReferences);
  nextRefs.add(ref);

  return {
    ok: true,
    nextState: {
      currentBalance: nextCurrent,
      availableBalance: nextAvailable,
      processedReferences: nextRefs,
    },
  };
}
