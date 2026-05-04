import React from 'react';
import { PaymentMethod } from '../services/payment-methods.service';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  onSetDefault,
  onDelete,
}) => {
  const getCardIcon = () => {
    switch (paymentMethod.brand?.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
  };

  const getTypeLabel = () => {
    switch (paymentMethod.type) {
      case 'card':
        return 'Carte bancaire';
      case 'paypal':
        return 'PayPal';
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      default:
        return paymentMethod.type;
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border-2 ${
      paymentMethod.is_default ? 'border-blue-500' : 'border-gray-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{getCardIcon()}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold">{getTypeLabel()}</h3>
              {paymentMethod.is_default && (
                <span className="flex items-center gap-1 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                  ⭐ Par défaut
                </span>
              )}
            </div>
            {paymentMethod.brand && (
              <p className="text-gray-400 text-sm capitalize">{paymentMethod.brand}</p>
            )}
            {paymentMethod.last_4_digits && (
              <p className="text-gray-300 text-sm">•••• {paymentMethod.last_4_digits}</p>
            )}
            {paymentMethod.expiry_month && paymentMethod.expiry_year && (
              <p className="text-gray-400 text-xs mt-1">
                Expire: {String(paymentMethod.expiry_month).padStart(2, '0')}/{paymentMethod.expiry_year}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!paymentMethod.is_default && (
            <button
              onClick={() => onSetDefault(paymentMethod.id)}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors text-xl"
              title="Définir par défaut"
            >
              ⭐
            </button>
          )}
          <button
            onClick={() => onDelete(paymentMethod.id)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors text-xl"
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodCard;
