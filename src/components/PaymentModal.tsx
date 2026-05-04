import { useState, useEffect } from 'react';
import { invokeOrFallback } from '../services/platform';
import { web_complete_order_payment, CompletePaymentRequest } from '../services/db-web';
import { formatAmount } from '../utils/format';
import { useActiveRestaurant } from '../services/restaurant-config';

/**
 * Payment Method Enum
 * Defines all available payment methods
 */
enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile',
  SPLIT = 'split',
}

/**
 * Payment Request Interface
 * Data sent to the API for payment processing
 */
interface PaymentRequest {
  orderId: string;
  restaurantId: string;
  cashSessionId?: string;
  payments: Array<{
    method: 'cash' | 'card' | 'mobile_money';
    amount: number;
    tendered?: number;
    change?: number;
    transaction_id?: string;
    metadata?: string;
  }>;
  paidAt: string;
}

/**
 * Payment Response Interface
 * Data received from the API after payment processing
 */
interface PaymentResponse {
  order_id: string;
  total_due: number;
  total_paid: number;
  payment_status: string;
  payment_method?: string;
  payments: Array<{
    id: string;
    order_id: string;
    cash_session_id?: string;
    method: string;
    amount: number;
    tendered?: number;
    change?: number;
    status: string;
    transaction_id?: string;
    metadata?: string;
    created_at: string;
    updated_at: string;
  }>;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  orderId: string;
  onPaymentSuccess?: (receipt: PaymentResponse) => void | Promise<void>;
}

type PaymentAction = 'complete' | 'mark-paid' | 'deliver';

export default function PaymentModal({
  isOpen,
  onClose,
  total,
  orderId,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState('0.00');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [loadingAction, setLoadingAction] = useState<PaymentAction | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod; amount: string }>>([]);

  const { id: restaurantId } = useActiveRestaurant();
  const loading = loadingAction !== null;

  // Calculate values
  const tendered = parseFloat(amount) || 0;
  const change = tendered - total;
  const isValidAmount = selectedMethod === PaymentMethod.CASH ? tendered >= total : amount !== '0.00';

  const splitTotal = splitPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount || '0') || 0), 0);

  const canProceed =
    selectedMethod === PaymentMethod.SPLIT
      ? splitPayments.length > 0 && splitPayments.every(p => parseFloat(p.amount || '0') > 0) && splitTotal >= total
      : isValidAmount;

  // Reset message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!isOpen) return null;

  /**
   * Handle numeric input for amount
   */
  const handleNumberClick = (num: string) => {
    if (num === '.' && amount.includes('.')) return;

    if (amount === '0.00') {
      setAmount(num === '.' ? '0.' : num);
    } else {
      const newAmount = amount + num;
      // Limit to 2 decimal places
      if (num === '.') {
        setAmount(newAmount);
      } else if (amount.includes('.')) {
        const [dollars, cents] = amount.split('.');
        if (cents.length < 2) {
          setAmount(newAmount);
        }
      } else {
        setAmount(newAmount);
      }
    }
  };

  /**
   * Handle backspace for amount input
   */
  const handleBackspace = () => {
    if (amount.length > 1) {
      setAmount(amount.slice(0, -1));
    } else {
      setAmount('0.00');
    }
  };

  /**
   * Handle quick amount buttons
   */
  const handleQuickAmount = (value: number) => {
    setAmount(String(value));
  };

  /**
   * Process payment through API
   */
  const handlePayment = async (action: PaymentAction = 'complete') => {
    const useEnteredPayment = action === 'complete' || canProceed;
    const effectiveMethod = useEnteredPayment ? selectedMethod : PaymentMethod.CASH;
    const effectiveTendered = useEnteredPayment ? tendered : total;
    const effectiveChange = effectiveTendered - total;
    const effectiveSplitPayments =
      useEnteredPayment && effectiveMethod === PaymentMethod.SPLIT ? splitPayments : [];
    const effectiveSplitTotal = effectiveSplitPayments.reduce(
      (sum, payment) => sum + (parseFloat(payment.amount || '0') || 0),
      0
    );

    try {
      setLoadingAction(action);
      setMessage(null);

      const paidAt = new Date().toISOString();

      // Validate amount for cash payment
      if (effectiveMethod === PaymentMethod.CASH && effectiveTendered < total) {
        setMessage({
          type: 'error',
          text: `Montant insuffisant. Minimum requis: ${formatAmount(total)}`,
        });
        setLoadingAction(null);
        return;
      }

      if (effectiveMethod === PaymentMethod.SPLIT) {
        if (effectiveSplitPayments.length === 0) {
          setMessage({
            type: 'error',
            text: 'Veuillez ajouter au moins un paiement.',
          });
          setLoadingAction(null);
          return;
        }

        const hasInvalidAmount = effectiveSplitPayments.some(p => parseFloat(p.amount || '0') <= 0);
        if (hasInvalidAmount) {
          setMessage({
            type: 'error',
            text: 'Tous les montants doivent être supérieurs à 0.',
          });
          setLoadingAction(null);
          return;
        }

        if (effectiveSplitTotal + 0.000001 < total) {
          setMessage({
            type: 'error',
            text: `Le total des paiements doit couvrir au moins ${formatAmount(total)}`,
          });
          setLoadingAction(null);
          return;
        }
      }

      const methodToDbMethod = (m: PaymentMethod): 'cash' | 'card' | 'mobile_money' => {
        switch (m) {
          case PaymentMethod.CASH:
            return 'cash';
          case PaymentMethod.CARD:
            return 'card';
          case PaymentMethod.MOBILE_MONEY:
            return 'mobile_money';
          default:
            return 'cash';
        }
      };

      // Prepare payment request
      const paymentRequest: PaymentRequest = {
        orderId,
        restaurantId,
        payments:
          effectiveMethod === PaymentMethod.SPLIT
            ? effectiveSplitPayments.map(sp => ({
                method: methodToDbMethod(sp.method),
                amount: parseFloat(sp.amount),
                ...(sp.method === PaymentMethod.CASH
                  ? {
                      tendered: parseFloat(sp.amount),
                      change: 0,
                    }
                  : {}),
              }))
            : [
                {
                  method: methodToDbMethod(effectiveMethod),
                  amount: total,
                  ...(effectiveMethod === PaymentMethod.CASH
                    ? {
                        tendered: effectiveTendered,
                        change: effectiveChange > 0 ? effectiveChange : 0,
                      }
                    : {}),
                },
              ],
        paidAt,
      };

      const tauriRequest = {
        order_id: paymentRequest.orderId,
        restaurant_id: paymentRequest.restaurantId,
        cash_session_id: paymentRequest.cashSessionId ?? null,
        payments: paymentRequest.payments.map(p => ({
          method: p.method,
          amount: p.amount,
          tendered: p.tendered ?? null,
          change: p.change ?? null,
          transaction_id: p.transaction_id ?? null,
          metadata: p.metadata ?? null,
        })),
        paid_at: paymentRequest.paidAt,
        final_status: action === 'deliver' ? 'delivered' : null,
      } satisfies CompletePaymentRequest;

      const data: PaymentResponse = await invokeOrFallback(
        'complete_order_payment',
        { request: tauriRequest },
        () => web_complete_order_payment(tauriRequest)
      );

      if (data.payment_status === 'paid') {
        setMessage({
          type: 'success',
          text: `Paiement réussi! Montant payé: ${formatAmount(data.total_paid)}`,
        });

        if (action === 'deliver') {
          setMessage({
            type: 'success',
            text: `Commande livree. Montant paye: ${formatAmount(data.total_paid)}`,
          });
        }

        // Call success callback if provided
        if (onPaymentSuccess) {
          await onPaymentSuccess(data);
        }

        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          setAmount('0.00');
          setSplitPayments([]);
        }, 2000);
      } else {
        throw new Error('Le traitement du paiement a échoué');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Le paiement a échoué. Veuillez réessayer.';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  /**
   * Render payment method selector with radio buttons
   */
  const renderPaymentMethods = () => (
    <>
      <button
        onClick={() => {
          setSelectedMethod(PaymentMethod.CASH);
          setAmount('0.00');
        }}
        className={`group relative flex items-center p-5 rounded-xl border-2 transition-all w-full ${
          selectedMethod === PaymentMethod.CASH
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 bg-[#233342] hover:border-slate-500'
        }`}
      >
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full border-2 mr-4 transition-colors ${
            selectedMethod === PaymentMethod.CASH
              ? 'border-blue-500 bg-blue-500'
              : 'border-slate-500 bg-transparent'
          }`}
        >
          {selectedMethod === PaymentMethod.CASH && (
            <span className="text-white text-xs font-bold">✓</span>
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-white text-lg font-bold">Espèces</p>
          <p className={selectedMethod === PaymentMethod.CASH ? 'text-blue-400 text-sm' : 'text-slate-400 text-sm'}>
            {selectedMethod === PaymentMethod.CASH ? 'Calculer la monnaie' : 'Paiement en espèces'}
          </p>
        </div>
      </button>

      <button
        onClick={() => {
          setSelectedMethod(PaymentMethod.CARD);
          setAmount(String(total));
        }}
        className={`flex items-center p-5 rounded-xl border-2 transition-all w-full ${
          selectedMethod === PaymentMethod.CARD
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 bg-[#233342] hover:border-slate-500'
        }`}
      >
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full border-2 mr-4 transition-colors ${
            selectedMethod === PaymentMethod.CARD
              ? 'border-blue-500 bg-blue-500'
              : 'border-slate-500 bg-transparent'
          }`}
        >
          {selectedMethod === PaymentMethod.CARD && (
            <span className="text-white text-xs font-bold">✓</span>
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-slate-200 text-lg font-bold">Carte bancaire</p>
          <p className="text-slate-400 text-sm">Visa, Mastercard, Amex</p>
        </div>
      </button>

      <button
        onClick={() => {
          setSelectedMethod(PaymentMethod.MOBILE_MONEY);
          setAmount(String(total));
        }}
        className={`flex items-center p-5 rounded-xl border-2 transition-all w-full ${
          selectedMethod === PaymentMethod.MOBILE_MONEY
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 bg-[#233342] hover:border-slate-500'
        }`}
      >
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full border-2 mr-4 transition-colors ${
            selectedMethod === PaymentMethod.MOBILE_MONEY
              ? 'border-blue-500 bg-blue-500'
              : 'border-slate-500 bg-transparent'
          }`}
        >
          {selectedMethod === PaymentMethod.MOBILE_MONEY && (
            <span className="text-white text-xs font-bold">✓</span>
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-slate-200 text-lg font-bold">Mobile Money</p>
          <p className="text-slate-400 text-sm">Orange Money, MTN, Airtel</p>
        </div>
      </button>

      <button
        onClick={() => {
          setSelectedMethod(PaymentMethod.SPLIT);
          setSplitPayments([{ method: PaymentMethod.CASH, amount: '' }]);
        }}
        className={`flex items-center p-5 rounded-xl border-2 transition-all w-full ${
          selectedMethod === PaymentMethod.SPLIT
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 bg-[#233342] hover:border-slate-500'
        }`}
      >
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full border-2 mr-4 transition-colors ${
            selectedMethod === PaymentMethod.SPLIT
              ? 'border-blue-500 bg-blue-500'
              : 'border-slate-500 bg-transparent'
          }`}
        >
          {selectedMethod === PaymentMethod.SPLIT && (
            <span className="text-white text-xs font-bold">✓</span>
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-slate-200 text-lg font-bold">Paiement partagé</p>
          <p className="text-slate-400 text-sm">Plusieurs méthodes de paiement</p>
        </div>
      </button>
    </>
  );

  /**
   * Render cash input keypad
   */
  const renderNumpad = () => (
    <>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => handleQuickAmount(total)}
          className="h-12 bg-[#233342] hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold transition-all"
        >
          Exact
        </button>
        <button
          onClick={() => handleQuickAmount(50)}
          className="h-12 bg-[#233342] hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold transition-all"
        >
          $50
        </button>
        <button
          onClick={() => handleQuickAmount(100)}
          className="h-12 bg-[#233342] hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold transition-all"
        >
          $100
        </button>
        <button
          onClick={() => handleQuickAmount(200)}
          className="h-12 bg-[#233342] hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold transition-all"
        >
          $200
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(num => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="bg-[#233342] hover:bg-slate-600 rounded-xl text-2xl font-semibold text-white transition-colors shadow-sm aspect-square flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleBackspace}
          className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-xl text-red-400 transition-colors flex items-center justify-center col-span-1"
        >
          <span className="material-symbols-outlined text-3xl">backspace</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl h-[85vh] bg-[#151f2a] rounded-xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-16 border-b border-slate-700/50 flex items-center justify-between px-8 bg-[#111a22]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400">receipt_long</span>
              <h1 className="text-lg font-semibold text-slate-200">Paiement: commande #{orderId}</h1>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={loading}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            {/* Left: Summary */}
            <div className="col-span-3 bg-[#111a22] border-r border-slate-700/50 flex flex-col p-6">
              <div className="mb-8">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total à payer</p>
                <h2 className="text-5xl font-bold text-white tracking-tight">{formatAmount(total)}</h2>
              </div>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="text-slate-400">Sous-total</span>
                  <span className="text-slate-200 font-medium">{formatAmount(total / 1.1)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="text-slate-400">Taxe (10%)</span>
                  <span className="text-slate-200 font-medium">{formatAmount(total * 0.1)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="text-slate-400 font-semibold">Solde restant</span>
                  <span className={`font-bold text-lg ${tendered >= total ? 'text-green-400' : 'text-orange-400'}`}>
                    {formatAmount(Math.max(0, total - tendered))}
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Payment Methods */}
            <div className="col-span-4 bg-[#151f2a] border-r border-slate-700/50 p-6 flex flex-col overflow-y-auto">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-6">Méthode de paiement</p>
              <div className="space-y-4 flex-1">
                {renderPaymentMethods()}
              </div>
            </div>

            {/* Right: Amount Input */}
            <div className="col-span-5 bg-[#111a22] p-6 flex flex-col">
              {selectedMethod === PaymentMethod.SPLIT ? (
                // Split payment UI
                <div className="flex flex-col gap-4 h-full">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Paiement partagé</p>
                    <button
                      onClick={() => setSplitPayments([...splitPayments, { method: PaymentMethod.CASH, amount: '' }])}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      Ajouter
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {splitPayments.map((payment, index) => (
                      <div key={index} className="bg-black/40 rounded-xl p-4 border border-slate-700/50 relative">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-slate-400 text-xs">Paiement {index + 1}</p>
                          {splitPayments.length > 1 && (
                            <button
                              onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== index))}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          )}
                        </div>
                        <select
                          title={`Méthode de paiement ${index + 1}`}
                          value={payment.method}
                          onChange={e => {
                            const newPayments = [...splitPayments];
                            newPayments[index].method = e.target.value as PaymentMethod;
                            setSplitPayments(newPayments);
                          }}
                          className="w-full mb-3 bg-[#233342] text-white rounded-lg px-3 py-2 border border-slate-700"
                        >
                          <option value={PaymentMethod.CASH}>Espèces</option>
                          <option value={PaymentMethod.CARD}>Carte bancaire</option>
                          <option value={PaymentMethod.MOBILE_MONEY}>Mobile Money</option>
                        </select>
                        <input
                          type="number"
                          title={`Montant paiement ${index + 1}`}
                          placeholder="0.00"
                          value={payment.amount}
                          onChange={e => {
                            const newPayments = [...splitPayments];
                            newPayments[index].amount = e.target.value;
                            setSplitPayments(newPayments);
                          }}
                          className="w-full bg-transparent text-2xl font-mono text-white outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50 mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-slate-400 text-xs">Total des paiements</p>
                      <p className="text-slate-400 text-xs">Dû: {formatAmount(total)}</p>
                    </div>
                    <p className={`text-3xl font-mono font-bold ${
                      splitTotal >= total ? 'text-green-400' : 'text-orange-400'
                    }`}>
                      {formatAmount(splitTotal)}
                    </p>
                    {splitTotal < total && (
                      <p className="text-red-400 text-xs mt-2">Manquant: {formatAmount(total - splitTotal)}</p>
                    )}
                  </div>
                </div>
              ) : (
                // Regular amount input
                <>
                  <div className="bg-black/40 rounded-xl p-4 mb-4 border border-slate-700/50 flex flex-col items-end">
                    <span className="text-slate-400 text-sm mb-1">
                      {selectedMethod === PaymentMethod.CASH ? 'Montant reçu' : 'Montant'}
                    </span>
                    <span className="text-4xl font-mono text-white tracking-wider flex items-center">
                      <span className="text-slate-500 mr-2">$</span>
                      {amount}
                      <span className="w-0.5 h-8 bg-blue-500 animate-pulse ml-1"></span>
                    </span>
                  </div>

                  {selectedMethod === PaymentMethod.CASH && renderNumpad()}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="h-24 bg-[#0d141c] border-t border-slate-700/50 grid grid-cols-12 items-center px-8 gap-8">
            {/* Message Display */}
            {message && (
              <div
                className={`col-span-5 px-4 py-2 rounded-lg text-sm font-medium ${
                  message.type === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Status Display */}
            {!message && (
              <>
                <div className="col-span-3 flex flex-col">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                    {selectedMethod === PaymentMethod.CASH ? 'Reçu' : 'Montant'}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {selectedMethod === PaymentMethod.SPLIT
                      ? formatAmount(splitTotal)
                      : formatAmount(tendered)}
                  </span>
                </div>
                <div className="col-span-4 flex flex-col border-l border-slate-800 pl-8">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                    {selectedMethod === PaymentMethod.CASH ? 'Monnaie à rendre' : 'Statut'}
                  </span>
                  <span
                    className={`text-3xl font-bold drop-shadow-[0_0_8px_rgba(74,222,128,0.25)] ${
                      selectedMethod === PaymentMethod.CASH
                        ? change > 0
                          ? 'text-green-400'
                          : 'text-slate-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {selectedMethod === PaymentMethod.CASH
                      ? formatAmount(Math.max(0, change))
                      : change >= 0
                        ? 'Prêt'
                        : 'En attente'}
                  </span>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="col-span-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-12 px-5 rounded-lg border border-slate-600 text-slate-300 font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handlePayment('mark-paid')}
                disabled={loading}
                className={`h-12 px-5 rounded-lg text-white font-bold shadow-[0_4px_20px_-4px_rgba(43,140,238,0.5)] transition-all flex items-center gap-2 ${
                  !loading
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    : 'bg-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined">
                  {loadingAction === 'mark-paid' ? 'hourglass_empty' : 'check_circle'}
                </span>
                {loadingAction === 'mark-paid' ? 'Traitement...' : 'Marquer payé'}
              </button>
              <button
                type="button"
                onClick={() => handlePayment('deliver')}
                disabled={loading}
                className={`h-12 px-5 rounded-lg text-white font-bold shadow-[0_4px_20px_-4px_rgba(22,163,74,0.45)] transition-all flex items-center gap-2 ${
                  !loading
                    ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                    : 'bg-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined">
                  {loadingAction === 'deliver' ? 'hourglass_empty' : 'local_shipping'}
                </span>
                {loadingAction === 'deliver' ? 'Livraison...' : 'Livrer directement'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Export types for use in other components
export type { PaymentRequest, PaymentResponse };
export { PaymentMethod };
