import { useState, useEffect } from 'react';

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
  orderNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  tendered?: number; // Amount given (for cash)
  change?: number; // Change to return (for cash)
  timestamp: string;
}

/**
 * Payment Response Interface
 * Data received from the API after payment processing
 */
interface PaymentResponse {
  success: boolean;
  transactionId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  change?: number;
  timestamp: string;
  receiptData: {
    items: Array<{ name: string; price: number; quantity: number }>;
    subtotal: number;
    tax: number;
    total: number;
  };
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  orderNumber: string;
  onPaymentSuccess?: (receipt: PaymentResponse) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  total,
  orderNumber,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState('0.00');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [splitAmounts, setSplitAmounts] = useState({ amount1: '', amount2: '' });

  // Calculate values
  const tendered = parseFloat(amount) || 0;
  const change = tendered - total;
  const isValidAmount = selectedMethod === PaymentMethod.CASH ? tendered >= total : amount !== '0.00';
  const canProceed = selectedMethod === PaymentMethod.SPLIT
    ? splitAmounts.amount1 && splitAmounts.amount2 &&
      (parseFloat(splitAmounts.amount1) + parseFloat(splitAmounts.amount2) >= total)
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
    setAmount(value.toFixed(2));
  };

  /**
   * Process payment through API
   */
  const handlePayment = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Validate amount for cash payment
      if (selectedMethod === PaymentMethod.CASH && tendered < total) {
        setMessage({
          type: 'error',
          text: `Insufficient amount. Need at least $${total.toFixed(2)}`,
        });
        setLoading(false);
        return;
      }

      // Prepare payment request
      const paymentRequest: PaymentRequest = {
        orderNumber,
        amount: selectedMethod === PaymentMethod.SPLIT
          ? parseFloat(splitAmounts.amount1) + parseFloat(splitAmounts.amount2)
          : tendered,
        paymentMethod: selectedMethod,
        ...(selectedMethod === PaymentMethod.CASH && {
          tendered,
          change: change > 0 ? change : 0,
        }),
        timestamp: new Date().toISOString(),
      };

      // Make API call
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        throw new Error(`Payment failed: ${response.statusText}`);
      }

      const data: PaymentResponse = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Payment successful! Transaction ID: ${data.transactionId}`,
        });

        // Call success callback if provided
        if (onPaymentSuccess) {
          onPaymentSuccess(data);
        }

        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          setAmount('0.00');
          setSplitAmounts({ amount1: '', amount2: '' });
        }, 2000);
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
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
          <p className="text-white text-lg font-bold">Cash</p>
          <p className={selectedMethod === PaymentMethod.CASH ? 'text-blue-400 text-sm' : 'text-slate-400 text-sm'}>
            {selectedMethod === PaymentMethod.CASH ? 'Calculate change' : 'Physical currency'}
          </p>
        </div>
      </button>

      <button
        onClick={() => {
          setSelectedMethod(PaymentMethod.CARD);
          setAmount(total.toFixed(2));
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
          <p className="text-slate-200 text-lg font-bold">Credit Card</p>
          <p className="text-slate-400 text-sm">Visa, Mastercard, Amex (Stripe)</p>
        </div>
      </button>

      <button
        onClick={() => {
          setSelectedMethod(PaymentMethod.MOBILE_MONEY);
          setAmount(total.toFixed(2));
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
          setSplitAmounts({ amount1: '', amount2: '' });
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
          <p className="text-slate-200 text-lg font-bold">Split Payment</p>
          <p className="text-slate-400 text-sm">Multiple payment methods</p>
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
              <h1 className="text-lg font-semibold text-slate-200">Payment: Order #{orderNumber}</h1>
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
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Due</p>
                <h2 className="text-5xl font-bold text-white tracking-tight">${total.toFixed(2)}</h2>
              </div>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-200 font-medium">${(total / 1.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="text-slate-400">Tax (10%)</span>
                  <span className="text-slate-200 font-medium">${(total * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="text-slate-400 font-semibold">Remaining Balance</span>
                  <span className={`font-bold text-lg ${tendered >= total ? 'text-green-400' : 'text-orange-400'}`}>
                    ${Math.max(0, total - tendered).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Payment Methods */}
            <div className="col-span-4 bg-[#151f2a] border-r border-slate-700/50 p-6 flex flex-col overflow-y-auto">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-6">Payment Method</p>
              <div className="space-y-4 flex-1">
                {renderPaymentMethods()}
              </div>
            </div>

            {/* Right: Amount Input */}
            <div className="col-span-5 bg-[#111a22] p-6 flex flex-col">
              {selectedMethod === PaymentMethod.SPLIT ? (
                // Split payment UI
                <div className="flex flex-col gap-4">
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Split Payment</p>
                  <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                    <p className="text-slate-400 text-xs mb-2">Method 1 Amount</p>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={splitAmounts.amount1}
                      onChange={e => setSplitAmounts({ ...splitAmounts, amount1: e.target.value })}
                      className="w-full bg-transparent text-3xl font-mono text-white outline-none"
                    />
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50">
                    <p className="text-slate-400 text-xs mb-2">Method 2 Amount</p>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={splitAmounts.amount2}
                      onChange={e => setSplitAmounts({ ...splitAmounts, amount2: e.target.value })}
                      className="w-full bg-transparent text-3xl font-mono text-white outline-none"
                    />
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 border border-slate-700/50 mt-4">
                    <p className="text-slate-400 text-xs mb-2">Total Payment</p>
                    <p className="text-3xl font-mono text-white">
                      ${(parseFloat(splitAmounts.amount1 || '0') + parseFloat(splitAmounts.amount2 || '0')).toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                // Regular amount input
                <>
                  <div className="bg-black/40 rounded-xl p-4 mb-4 border border-slate-700/50 flex flex-col items-end">
                    <span className="text-slate-400 text-sm mb-1">
                      {selectedMethod === PaymentMethod.CASH ? 'Tendered Amount' : 'Amount'}
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
                    {selectedMethod === PaymentMethod.CASH ? 'Tendered' : 'Amount'}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    ${selectedMethod === PaymentMethod.SPLIT
                      ? (parseFloat(splitAmounts.amount1 || '0') + parseFloat(splitAmounts.amount2 || '0')).toFixed(2)
                      : tendered.toFixed(2)}
                  </span>
                </div>
                <div className="col-span-4 flex flex-col border-l border-slate-800 pl-8">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                    {selectedMethod === PaymentMethod.CASH ? 'Change Due' : 'Status'}
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
                      ? `$${Math.max(0, change).toFixed(2)}`
                      : change >= 0
                        ? 'Ready'
                        : 'Pending'}
                  </span>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="col-span-5 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="h-14 px-6 rounded-lg border border-slate-600 text-slate-300 font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={!canProceed || loading}
                className={`h-14 px-8 rounded-lg text-white text-lg font-bold shadow-[0_4px_20px_-4px_rgba(43,140,238,0.5)] transition-all flex items-center gap-2 ${
                  canProceed && !loading
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    : 'bg-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'check_circle'}</span>
                {loading ? 'Processing...' : 'Complete Payment'}
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
