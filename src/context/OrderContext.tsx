import React, { createContext, useReducer, useCallback, useMemo, ReactNode } from 'react';

// Types
export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variants?: Record<string, string>;
  notes?: string;
  image_url?: string;
}

export interface DiscountInfo {
  type: 'fixed' | 'percentage';
  value: number;
  reason?: string;
}

export interface OrderState {
  items: OrderItem[];
  discount?: DiscountInfo;
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
  };
  restaurantId?: string;
  tableNumber?: number;
  deliveryAddress?: string;
  notes?: string;
}

export interface OrderContextType {
  state: OrderState;
  addItem: (item: Omit<OrderItem, 'id'>, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  applyDiscount: (discount: DiscountInfo) => void;
  clearCart: () => void;
  setRestaurantId: (id: string) => void;
  setCustomerInfo: (info: OrderState['customerInfo']) => void;
  setTableNumber: (number: number) => void;
  setDeliveryAddress: (address: string) => void;
  setOrderNotes: (notes: string) => void;
  placeOrder: () => Promise<void>;
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
  itemCount: number;
  hasItems: boolean;
  isEmpty: boolean;
}

const defaultState: OrderState = {
  items: [],
};

// Context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Reducer
type OrderAction =
  | { type: 'ADD_ITEM'; payload: OrderItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'UPDATE_ITEM_NOTES'; payload: { itemId: string; notes: string } }
  | { type: 'APPLY_DISCOUNT'; payload: DiscountInfo }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_RESTAURANT_ID'; payload: string }
  | { type: 'SET_CUSTOMER_INFO'; payload: OrderState['customerInfo'] }
  | { type: 'SET_TABLE_NUMBER'; payload: number }
  | { type: 'SET_DELIVERY_ADDRESS'; payload: string }
  | { type: 'SET_ORDER_NOTES'; payload: string };

function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.payload.id
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items:
          action.payload.quantity <= 0
            ? state.items.filter(i => i.id !== action.payload.itemId)
            : state.items.map(i =>
                i.id === action.payload.itemId
                  ? { ...i, quantity: action.payload.quantity }
                  : i
              ),
      };
    case 'UPDATE_ITEM_NOTES':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.payload.itemId ? { ...i, notes: action.payload.notes } : i
        ),
      };
    case 'APPLY_DISCOUNT':
      return { ...state, discount: action.payload };
    case 'CLEAR_CART':
      return { ...defaultState, restaurantId: state.restaurantId };
    case 'SET_RESTAURANT_ID':
      return { ...state, restaurantId: action.payload };
    case 'SET_CUSTOMER_INFO':
      return { ...state, customerInfo: action.payload };
    case 'SET_TABLE_NUMBER':
      return { ...state, tableNumber: action.payload };
    case 'SET_DELIVERY_ADDRESS':
      return { ...state, deliveryAddress: action.payload };
    case 'SET_ORDER_NOTES':
      return { ...state, notes: action.payload };
    default:
      return state;
  }
}

// Provider
export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(orderReducer, defaultState);

  // Calculations
  const subtotal = useMemo(() => {
    return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [state.items]);

  const discountAmount = useMemo(() => {
    if (!state.discount) return 0;
    if (state.discount.type === 'fixed') {
      return Math.min(state.discount.value, subtotal);
    }
    return (subtotal * state.discount.value) / 100;
  }, [subtotal, state.discount]);

  const tax = useMemo(() => {
    return (subtotal - discountAmount) * 0.2; // 20% tax
  }, [subtotal, discountAmount]);

  const total = useMemo(() => {
    return subtotal - discountAmount + tax;
  }, [subtotal, discountAmount, tax]);

  const itemCount = useMemo(() => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [state.items]);

  // Actions
  const addItem = useCallback(
    (item: Omit<OrderItem, 'id'>, quantity: number) => {
      const id = `${item.name}-${Date.now()}`;
      dispatch({
        type: 'ADD_ITEM',
        payload: { ...item, id, quantity },
      });
    },
    []
  );

  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  }, []);

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    dispatch({ type: 'UPDATE_ITEM_NOTES', payload: { itemId, notes } });
  }, []);

  const applyDiscount = useCallback((discount: DiscountInfo) => {
    dispatch({ type: 'APPLY_DISCOUNT', payload: discount });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const setRestaurantId = useCallback((id: string) => {
    dispatch({ type: 'SET_RESTAURANT_ID', payload: id });
  }, []);

  const setCustomerInfo = useCallback((info: OrderState['customerInfo']) => {
    dispatch({ type: 'SET_CUSTOMER_INFO', payload: info });
  }, []);

  const setTableNumber = useCallback((num: number) => {
    dispatch({ type: 'SET_TABLE_NUMBER', payload: num });
  }, []);

  const setDeliveryAddress = useCallback((address: string) => {
    dispatch({ type: 'SET_DELIVERY_ADDRESS', payload: address });
  }, []);

  const setOrderNotes = useCallback((notes: string) => {
    dispatch({ type: 'SET_ORDER_NOTES', payload: notes });
  }, []);

  const placeOrder = useCallback(async () => {
    if (!state.restaurantId) throw new Error('Restaurant ID not set');
    if (state.items.length === 0) throw new Error('Cart is empty');
    // TODO: Call apiService.createOrder()
    clearCart();
  }, [state, clearCart]);

  const value: OrderContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    updateItemNotes,
    applyDiscount,
    clearCart,
    setRestaurantId,
    setCustomerInfo,
    setTableNumber,
    setDeliveryAddress,
    setOrderNotes,
    placeOrder,
    subtotal,
    discountAmount,
    tax,
    total,
    itemCount,
    hasItems: state.items.length > 0,
    isEmpty: state.items.length === 0,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

// Hook
export function useOrder(): OrderContextType {
  const context = React.useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within OrderProvider');
  }
  return context;
}
