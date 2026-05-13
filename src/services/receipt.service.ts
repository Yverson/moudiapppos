import { Order } from './api.service';
import { formatAmount } from '../utils/format';
import { tauriInvoke } from './platform';

export interface Receipt {
  orderId: string;
  customerName?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: Date;
}

class ReceiptService {
  private readonly lineWidth = 44; // 80mm paper

  /**
   * Generate receipt text for thermal printer (80mm paper)
   */
  generateThermalReceipt(receipt: Receipt): string {
    const lines: string[] = [];
    const W = this.lineWidth;
    const pw = 9;              // price column width
    const qw = 3;              // quantity column width
    const inner = W - 2;       // content width between borders (42)
    const nw = inner - qw - pw - 2; // name column (28)

    // Helpers
    const sep = (c: string) => `+${c.repeat(inner)}+`;
    const line = (s: string) => `|${s}${' '.repeat(Math.max(0, inner - s.length))}|`;
    const colLine = (name: string, qty: string, price: string) =>
      `|${name.padEnd(nw)} ${qty.padStart(qw)} ${price.padStart(pw)}|`;
    const totalLine = (label: string, amount: number) => {
      const price = formatAmount(amount).padStart(pw);
      return line(` ${label}${' '.repeat(inner - label.length - 1 - pw)}${price}`);
    };
    const centerLine = (text: string) => {
      const pad = Math.max(0, Math.floor((inner - text.length) / 2));
      return `|${' '.repeat(pad)}${text}${' '.repeat(inner - text.length - pad)}|`;
    };

    // ── Header ──
    lines.push(sep('='));
    lines.push(line(''));
    lines.push(centerLine('MOUDI POS'));
    lines.push(line(''));
    lines.push(sep('-'));

    // ── Order info ──
    lines.push(line(` Commande: ${receipt.orderId}`));
    lines.push(line(` Date:     ${receipt.timestamp.toLocaleString()}`));
    if (receipt.customerName) {
      lines.push(line(` Client:   ${receipt.customerName}`));
    }
    lines.push(sep('-'));

    // ── Items ──
    lines.push(colLine('Article', 'Qte', 'Total'));
    lines.push(colLine('-'.repeat(nw), '-'.repeat(qw), '-'.repeat(pw)));
    receipt.items.forEach((item) => {
      const name = item.name.substring(0, nw);
      const total = formatAmount(item.price * item.quantity);
      lines.push(colLine(name, String(item.quantity), total));
    });

    // ── Totals ──
    lines.push(colLine('-'.repeat(nw), '-'.repeat(qw), '-'.repeat(pw)));
    lines.push(totalLine('Sous-total', receipt.subtotal));
    lines.push(totalLine('Taxe (20%)', receipt.tax));
    lines.push(sep('='));
    lines.push(totalLine('TOTAL', receipt.total));
    lines.push(sep('='));

    // ── Payment & footer ──
    lines.push(line(` ${receipt.paymentMethod}`));
    lines.push(line(''));
    lines.push(centerLine('Merci de votre visite!'));
    lines.push(line(''));
    lines.push(sep('='));

    return lines.join('\n');
  }

  /**
   * Export receipt as PDF (requires jsPDF + html2canvas)
   * TODO: Implement with actual PDF generation
   */
  async exportPDF(receipt: Receipt): Promise<void> {
    // TODO: Implement jsPDF generation
  }

  /**
   * Print receipt to thermal printer
   * TODO: Implement with actual printer communication
   */
  async printThermal(receipt: Receipt): Promise<void> {
    const text = this.generateThermalReceipt(receipt);
    await tauriInvoke('print_receipt', { content: text });
  }

  /**
   * Generate receipt from order
   */
  generateFromOrder(
    order: Order,
    customerName?: string,
    paymentMethod = 'Especes'
  ): Receipt {
    return {
      orderId: order.order_number,
      customerName,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      paymentMethod,
      timestamp: new Date(order.created_at),
    };
  }
}

export default new ReceiptService();
