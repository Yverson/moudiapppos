/**
 * Service de statistiques pour AppPOS
 * Calcule les statistiques locales (IndexedDB/SQLite) et récupère les stats online (API)
 */

import axios from 'axios';
import { invokeOrFallback } from './platform';
import { web_get_orders, Order, Payment, getDb } from './db-web';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface StatsOverview {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  revenueChange: number;
  ordersChange: number;
  avgOrderChange: number;
}

export interface SalesPeriod {
  period: string;
  revenue: number;
  orders: number;
  avgOrder: number;
  growth: string;
}

export interface TopProduct {
  name: string;
  sold: number;
  revenue: number;
  trend: 'up' | 'down';
}

export interface HourlySales {
  hour: number;
  revenue: number;
  orders: number;
}

export interface PaymentMethodStats {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

export interface StatsData {
  overview: StatsOverview;
  salesByPeriod: {
    today: SalesPeriod;
    week: SalesPeriod;
    month: SalesPeriod;
  };
  topProducts: TopProduct[];
  hourlySales: HourlySales[];
  paymentMethods: PaymentMethodStats[];
}

class StatsService {
  private restaurantId: string | null = null;

  setRestaurantId(id: string) {
    this.restaurantId = id;
  }

  /**
   * Récupère les statistiques locales (IndexedDB/SQLite)
   */
  async getLocalStats(period: 'day' | 'week' | 'month' = 'month'): Promise<StatsData> {
    const orders = await this.getLocalOrders();
    const payments = await this.getLocalPayments();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const paidOrders = orders.filter(o => o.payment_status === 'paid');

    const todayOrders = paidOrders.filter(o => new Date(o.created_at) >= startOfDay);
    const weekOrders = paidOrders.filter(o => new Date(o.created_at) >= startOfWeek);
    const monthOrders = paidOrders.filter(o => new Date(o.created_at) >= startOfMonth);

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

    const overview: StatsOverview = {
      totalRevenue: monthRevenue,
      totalOrders: monthOrders.length,
      avgOrderValue: monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0,
      revenueChange: 0,
      ordersChange: 0,
      avgOrderChange: 0,
    };

    const salesByPeriod = {
      today: {
        period: 'Today',
        revenue: todayRevenue,
        orders: todayOrders.length,
        avgOrder: todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0,
        growth: '+0%',
      },
      week: {
        period: 'This Week',
        revenue: weekRevenue,
        orders: weekOrders.length,
        avgOrder: weekOrders.length > 0 ? weekRevenue / weekOrders.length : 0,
        growth: '+0%',
      },
      month: {
        period: 'This Month',
        revenue: monthRevenue,
        orders: monthOrders.length,
        avgOrder: monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0,
        growth: '+0%',
      },
    };

    const topProducts = this.calculateTopProducts(monthOrders);
    const hourlySales = this.calculateHourlySales(monthOrders);
    const paymentMethods = this.calculatePaymentMethodStats(payments);

    return {
      overview,
      salesByPeriod,
      topProducts,
      hourlySales,
      paymentMethods,
    };
  }

  /**
   * Récupère les statistiques online depuis l'API
   */
  async getOnlineStats(restaurantId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<StatsData | null> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('═══ [StatsService] ═══\nPas de token d\'authentification disponible');
        return null;
      }

      console.log(
        '═══ [StatsService] Récupération stats online ═══\n',
        'URL:', `${API_URL}/api/restaurants/${restaurantId}/stats`,
        '\nPériode:', period
      );

      const response = await axios.get(
        `${API_URL}/api/restaurants/${restaurantId}/stats`,
        {
          params: { period },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        console.log('═══ [StatsService] Stats online récupérées ═══\n', 'Données:', response.data.data);
        return response.data.data;
      }
      console.warn('═══ [StatsService] ═══\nRéponse API sans succès:', response.data);
      return null;
    } catch (error: any) {
      console.error(
        '═══ [StatsService] Erreur récupération stats online ═══\n',
        'Erreur:', error.message,
        '\nStatut:', error.response?.status,
        '\nDétails:', error.response?.data
      );
      return null;
    }
  }

  /**
   * Récupère les statistiques combinées (local + online)
   */
  async getCombinedStats(period: 'day' | 'week' | 'month' = 'month'): Promise<{
    local: StatsData;
    online: StatsData | null;
    combined: StatsData;
  }> {
    const local = await this.getLocalStats(period);
    const online = this.restaurantId ? await this.getOnlineStats(this.restaurantId, period) : null;

    if (!online) {
      return { local, online: null, combined: local };
    }

    const combined: StatsData = {
      overview: {
        totalRevenue: local.overview.totalRevenue + online.overview.totalRevenue,
        totalOrders: local.overview.totalOrders + online.overview.totalOrders,
        avgOrderValue: 
          (local.overview.totalRevenue + online.overview.totalRevenue) /
          (local.overview.totalOrders + online.overview.totalOrders || 1),
        revenueChange: online.overview.revenueChange,
        ordersChange: online.overview.ordersChange,
        avgOrderChange: online.overview.avgOrderChange,
      },
      salesByPeriod: {
        today: this.mergeSalesPeriod(local.salesByPeriod.today, online.salesByPeriod.today),
        week: this.mergeSalesPeriod(local.salesByPeriod.week, online.salesByPeriod.week),
        month: this.mergeSalesPeriod(local.salesByPeriod.month, online.salesByPeriod.month),
      },
      topProducts: this.mergeTopProducts(local.topProducts, online.topProducts),
      hourlySales: this.mergeHourlySales(local.hourlySales, online.hourlySales),
      paymentMethods: this.mergePaymentMethods(local.paymentMethods, online.paymentMethods),
    };

    return { local, online, combined };
  }

  private async getLocalOrders(): Promise<Order[]> {
    try {
      const restaurantId = this.restaurantId || '';
      return await invokeOrFallback<Order[]>('get_orders', {}, () => web_get_orders(restaurantId));
    } catch (error) {
      console.error('Erreur récupération commandes locales:', error);
      return [];
    }
  }

  private async getLocalPayments(): Promise<Payment[]> {
    try {
      return await invokeOrFallback<Payment[]>('get_all_payments', {}, async () => {
        const db = await getDb();
        return await db.getAll('payments');
      });
    } catch (error) {
      console.error('Erreur récupération paiements locaux:', error);
      return [];
    }
  }

  private calculateTopProducts(orders: Order[]): TopProduct[] {
    const productStats = new Map<string, { sold: number; revenue: number }>();

    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items);
        items.forEach((item: any) => {
          const existing = productStats.get(item.name) || { sold: 0, revenue: 0 };
          productStats.set(item.name, {
            sold: existing.sold + item.quantity,
            revenue: existing.revenue + (item.price * item.quantity),
          });
        });
      } catch (error) {
        console.error('Erreur parsing items:', error);
      }
    });

    return Array.from(productStats.entries())
      .map(([name, stats]) => ({
        name,
        sold: stats.sold,
        revenue: stats.revenue,
        trend: 'up' as const,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private calculateHourlySales(orders: Order[]): HourlySales[] {
    const hourlySales = new Array(24).fill(0).map((_, hour) => ({
      hour,
      revenue: 0,
      orders: 0,
    }));

    orders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourlySales[hour].revenue += order.total;
      hourlySales[hour].orders += 1;
    });

    return hourlySales.filter(h => h.hour >= 8 && h.hour <= 22);
  }

  private calculatePaymentMethodStats(payments: Payment[]): PaymentMethodStats[] {
    const methodStats = new Map<string, { count: number; total: number }>();
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    payments.forEach(payment => {
      const method = payment.method || 'Unknown';
      const existing = methodStats.get(method) || { count: 0, total: 0 };
      methodStats.set(method, {
        count: existing.count + 1,
        total: existing.total + payment.amount,
      });
    });

    return Array.from(methodStats.entries())
      .map(([method, stats]) => ({
        method,
        count: stats.count,
        total: stats.total,
        percentage: totalAmount > 0 ? (stats.total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  private mergeSalesPeriod(local: SalesPeriod, online: SalesPeriod): SalesPeriod {
    const revenue = local.revenue + online.revenue;
    const orders = local.orders + online.orders;
    return {
      period: local.period,
      revenue,
      orders,
      avgOrder: orders > 0 ? revenue / orders : 0,
      growth: online.growth,
    };
  }

  private mergeTopProducts(local: TopProduct[], online: TopProduct[]): TopProduct[] {
    const merged = new Map<string, TopProduct>();

    [...local, ...online].forEach(product => {
      const existing = merged.get(product.name);
      if (existing) {
        merged.set(product.name, {
          name: product.name,
          sold: existing.sold + product.sold,
          revenue: existing.revenue + product.revenue,
          trend: product.trend,
        });
      } else {
        merged.set(product.name, product);
      }
    });

    return Array.from(merged.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private mergeHourlySales(local: HourlySales[], online: HourlySales[]): HourlySales[] {
    const merged = new Map<number, HourlySales>();

    [...local, ...online].forEach(hourData => {
      const existing = merged.get(hourData.hour);
      if (existing) {
        merged.set(hourData.hour, {
          hour: hourData.hour,
          revenue: existing.revenue + hourData.revenue,
          orders: existing.orders + hourData.orders,
        });
      } else {
        merged.set(hourData.hour, hourData);
      }
    });

    return Array.from(merged.values()).sort((a, b) => a.hour - b.hour);
  }

  private mergePaymentMethods(local: PaymentMethodStats[], online: PaymentMethodStats[]): PaymentMethodStats[] {
    const merged = new Map<string, PaymentMethodStats>();
    let totalAmount = 0;

    [...local, ...online].forEach(method => {
      const existing = merged.get(method.method);
      if (existing) {
        merged.set(method.method, {
          method: method.method,
          count: existing.count + method.count,
          total: existing.total + method.total,
          percentage: 0,
        });
      } else {
        merged.set(method.method, { ...method, percentage: 0 });
      }
      totalAmount += method.total;
    });

    return Array.from(merged.values())
      .map(m => ({
        ...m,
        percentage: totalAmount > 0 ? (m.total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }
}

export default new StatsService();
