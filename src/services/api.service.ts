import axios, { AxiosInstance, AxiosError } from 'axios';

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  available: boolean;
}

export interface CreateOrderRequest {
  restaurant_id: string;
  customer_info?: {
    name: string;
    phone: string;
    email?: string;
  };
  items: Array<{
    menu_item_id: string;
    quantity: number;
    notes?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  items: MenuItemOrder[];
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemOrder {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PaymentRequest {
  order_id: string;
  method: 'cash' | 'card' | 'mobile_money';
  amount: number;
}

export interface PaymentResponse {
  id: string;
  order_id: string;
  method: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  transaction_id?: string;
}

// API Service
class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });

    // Add auth header if token exists
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle responses
    this.api.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  private handleError(error: AxiosError) {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }

  // Auth
  async login(credentials: LoginRequest): Promise<{ token: string }> {
    const response = await this.api.post('/api/auth/login', credentials);
    const { token } = response.data;
    localStorage.setItem('authToken', token);
    return response.data;
  }

  // Menu
  async getMenu(restaurantId: string): Promise<MenuItem[]> {
    const response = await this.api.get(`/api/restaurants/${restaurantId}/menu`);
    return response.data;
  }

  // Orders
  async createOrder(data: CreateOrderRequest): Promise<Order> {
    const response = await this.api.post('/api/orders', data);
    return response.data;
  }

  async getOrders(restaurantId: string): Promise<Order[]> {
    const response = await this.api.get(`/api/restaurants/${restaurantId}/orders`);
    return response.data;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const response = await this.api.patch(`/api/orders/${orderId}`, { status });
    return response.data;
  }

  // Payments
  async processPayment(data: PaymentRequest): Promise<PaymentResponse> {
    const response = await this.api.post('/api/payments', data);
    return response.data;
  }

  // Cash Drawer
  async getCashDrawer(restaurantId: string) {
    const response = await this.api.get(`/api/restaurants/${restaurantId}/cash-drawer`);
    return response.data;
  }
}

export default new ApiService();
