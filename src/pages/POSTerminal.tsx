import { useState } from 'react';
import PaymentModal from '../components/PaymentModal';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

const PRODUCTS = [
  { id: '1', name: 'Green Salad', price: 12.00, category: 'starters', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
  { id: '2', name: 'Soup of Day', price: 9.50, category: 'starters', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400' },
  { id: '3', name: 'Garlic Bread', price: 6.00, category: 'starters', image: 'https://images.unsplash.com/photo-1619985663461-8e5e2c750f5a?w=400' },
  { id: '4', name: 'Steak Frites', price: 28.00, category: 'mains', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400' },
  { id: '5', name: 'Cheeseburger', price: 18.50, category: 'mains', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
  { id: '6', name: 'Grilled Salmon', price: 24.00, category: 'mains', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
  { id: '7', name: 'Cola Zero', price: 3.50, category: 'drinks', image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400' },
  { id: '8', name: 'Lemonade', price: 4.00, category: 'drinks', image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f0d?w=400' },
];

export default function POSTerminal() {
  const [activeCategory, setActiveCategory] = useState('starters');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { id: '4', name: 'Steak Frites', price: 28.00, quantity: 2, note: 'Medium Rare' },
    { id: '7', name: 'Cola Zero', price: 3.50, quantity: 1 },
    { id: '2', name: 'Soup of Day', price: 9.50, quantity: 1 },
    { id: '3', name: 'Garlic Bread', price: 6.00, quantity: 1 },
  ]);

  const addToOrder = (product: typeof PRODUCTS[0]) => {
    const existing = orderItems.find(item => item.id === product.id);
    if (existing) {
      setOrderItems(orderItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setOrderItems([...orderItems, { ...product, quantity: 1 }]);
    }
  };

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  const filteredProducts = PRODUCTS.filter(p => p.category === activeCategory);

  return (
    <div className="flex h-full overflow-hidden">
      <section className="flex flex-col w-3/4 border-r border-[#30363b] bg-[#16191c]">
        <div className="px-6 pt-6 pb-2">
          <div className="flex gap-4 overflow-x-auto pb-4">
            <button
              onClick={() => setActiveCategory('starters')}
              className={`flex items-center gap-3 px-8 py-5 rounded-2xl border-2 transition-all font-bold text-lg min-w-[160px] justify-center shadow-lg active:scale-95 ${
                activeCategory === 'starters'
                  ? 'bg-blue-900/30 border-blue-800 text-blue-200'
                  : 'bg-[#22262a] border-[#30363b] text-[#a4adb6] hover:bg-[#30363b]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">restaurant</span>
              Starters
            </button>
            <button
              onClick={() => setActiveCategory('mains')}
              className={`flex items-center gap-3 px-8 py-5 rounded-2xl border-2 transition-all font-bold text-lg min-w-[160px] justify-center active:scale-95 ${
                activeCategory === 'mains'
                  ? 'bg-blue-900/30 border-blue-800 text-blue-200'
                  : 'bg-[#22262a] border-[#30363b] text-[#a4adb6] hover:bg-[#30363b]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">dinner_dining</span>
              Mains
            </button>
            <button
              onClick={() => setActiveCategory('drinks')}
              className={`flex items-center gap-3 px-8 py-5 rounded-2xl border-2 transition-all font-bold text-lg min-w-[160px] justify-center active:scale-95 ${
                activeCategory === 'drinks'
                  ? 'bg-blue-900/30 border-blue-800 text-blue-200'
                  : 'bg-[#22262a] border-[#30363b] text-[#a4adb6] hover:bg-[#30363b]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">local_bar</span>
              Drinks
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToOrder(product)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#1e2327] border-2 border-[#30363b] hover:border-blue-500/80 hover:bg-[#252b30] transition-all h-56 active:scale-95 shadow-md"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>
                <img
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                  src={product.image}
                  alt={product.name}
                />
                <div className="relative z-20 p-4 flex justify-end">
                  <span className="bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-lg font-bold text-white shadow-lg">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                <div className="relative z-20 p-5 mt-auto w-full">
                  <div className="h-1.5 w-12 bg-blue-500 rounded-full mb-3 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                  <h3 className="text-white font-bold text-2xl leading-tight text-left shadow-black drop-shadow-lg">
                    {product.name}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col w-1/4 bg-[#1e2327] border-l border-[#30363b]">
        <div className="flex items-center justify-between p-4 border-b border-[#30363b] bg-[#22262a]">
          <div className="flex flex-col">
            <span className="text-sm text-[#a4adb6] uppercase font-bold tracking-wider">Table 12</span>
            <span className="text-base font-bold text-white">Michael S.</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-[#a4adb6] block font-medium">Order #8832</span>
            <span className="text-sm text-[#577798] font-bold uppercase">Dine In</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#252b30] z-10 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-xs font-bold text-[#a4adb6] uppercase tracking-wider w-[50%]">Item</th>
                <th className="py-3 px-2 text-xs font-bold text-[#a4adb6] uppercase tracking-wider text-center w-[20%]">Qty</th>
                <th className="py-3 px-4 text-xs font-bold text-[#a4adb6] uppercase tracking-wider text-right w-[30%]">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363b]">
              {orderItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#2a3036] group cursor-pointer h-16">
                  <td className="py-3 px-4">
                    <p className="font-bold text-white text-lg">{item.name}</p>
                    {item.note && <p className="text-sm text-[#a4adb6] font-medium">{item.note}</p>}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#30363b] text-white font-bold text-lg">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-white text-lg">
                    ${(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-none bg-[#171a1c] border-t border-[#30363b] p-4 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex justify-between text-[#a4adb6] text-base font-medium">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#a4adb6] text-base font-medium">
              <span>Tax (10%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end mt-2 pt-2 border-t border-[#30363b]">
              <span className="text-xl font-bold text-white">Total</span>
              <span className="text-4xl font-bold text-white tracking-tight">${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl py-6 font-bold text-3xl tracking-wide shadow-lg shadow-green-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-4 border-t border-green-500"
          >
            <span>PAY ${total.toFixed(2)}</span>
            <span className="material-symbols-outlined text-4xl">payments</span>
          </button>

          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            total={total}
            orderNumber="8832"
          />
        </div>
      </section>
    </div>
  );
}
