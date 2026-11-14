import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ShieldCheck, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { PortalLayout } from '../components/PortalLayout';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { formatCurrencyAmount } from '../lib/walletEngine';

export const WalletPage: React.FC = () => {
  const { lang, t, accessToken } = useApp();
  const [wallet, setWallet] = useState<any>({ current_balance: 0, available_balance: 0, currency: 'EGP' });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentConfigured, setPaymentConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    apiFetch<{ wallet: any; transactions: any[]; paymentProviderConfigured: boolean }>('/api/wallet', {
      token: accessToken,
    })
      .then((res) => {
        if (res.ok && res.data) {
          setWallet(res.data.wallet);
          setTransactions(res.data.transactions || []);
          setPaymentConfigured(Boolean(res.data.paymentProviderConfigured));
        }
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <PortalLayout title={t.wallet.title}>
      <SeoHead
        titleAr="المحفظة الإلكترونية — EDUVERSE"
        titleEn="Student Wallet — EDUVERSE"
        descriptionAr="إدارة المحفظة الإلكترونية وسجل المعاملات المالية."
        descriptionEn="Manage your student wallet and transaction history."
        noIndex
      />

      {!accessToken ? (
        <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-8 text-center space-y-4">
          <p className="text-sm font-bold">
            {lang === 'ar' ? 'يرجى تسجيل الدخول لعرض محفظتك.' : 'Sign in to view your wallet.'}
          </p>
          <Link to="/login" className="inline-flex px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-bold">
            {t.nav.login}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#171B2D] to-[#2563EB] text-white p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-semibold">{t.wallet.currentBalance}</span>
                <Wallet className="w-5 h-5 text-[#14B8A6]" />
              </div>
              <p className="text-3xl font-extrabold font-mono-tabular">
                {formatCurrencyAmount(Number(wallet.current_balance), wallet.currency || 'EGP', lang)}
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">{t.wallet.availableBalance}</span>
                <ShieldCheck className="w-5 h-5 text-[#635BFF]" />
              </div>
              <p className="text-3xl font-extrabold font-mono-tabular text-[#635BFF]">
                {formatCurrencyAmount(Number(wallet.available_balance), wallet.currency || 'EGP', lang)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] p-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4 text-[#635BFF] shrink-0" />
            <span>
              {t.wallet.serverSecurityNote}{' '}
              {!paymentConfigured &&
                (lang === 'ar'
                  ? '— بوابة الدفع الإلكتروني الخارجية غير مربوطة حالياً (يتم الشحن عبر الإدارة أو عند تفعيل PAYMENT_PROVIDER).'
                  : '— External payment gateway is awaiting PAYMENT_PROVIDER configuration.')}
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#151A2C] border border-slate-200 dark:border-[#252C44] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#252C44]">
              <h2 className="text-base font-bold">{t.wallet.transactionsTitle}</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">{t.common.loading}</div>
            ) : transactions.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">{t.wallet.emptyTx}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-[#0D111D] text-slate-500">
                    <tr>
                      <th className="text-start px-4 py-3 font-semibold">{t.wallet.columns.date}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t.wallet.columns.reference}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t.wallet.columns.type}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t.wallet.columns.description}</th>
                      <th className="text-end px-4 py-3 font-semibold">{t.wallet.columns.amount}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t.wallet.columns.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252C44]">
                    {transactions.map((tx) => {
                      const isCredit = tx.tx_type !== 'payment';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-[#1E243B]/40">
                          <td className="px-4 py-3 font-mono-tabular text-xs whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                          </td>
                          <td className="px-4 py-3 font-mono-tabular text-xs">{tx.reference_code}</td>
                          <td className="px-4 py-3 font-semibold">
                            <span className="inline-flex items-center gap-1">
                              {isCredit ? (
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                              )}
                              {t.wallet.txTypes[tx.tx_type as keyof typeof t.wallet.txTypes] || tx.tx_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tx.description}</td>
                          <td className="px-4 py-3 text-end font-mono-tabular font-bold">
                            {formatCurrencyAmount(Number(tx.amount), tx.currency || 'EGP', lang)}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold">
                            {t.wallet.txStatus[tx.status as keyof typeof t.wallet.txStatus] || tx.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
};
