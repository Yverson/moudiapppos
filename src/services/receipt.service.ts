import { Order } from './api.service';

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
  /**
   * Generate receipt text for thermal printer (58mm paper)
   */
  generateThermalReceipt(receipt: Receipt): string {
    const lines: string[] = [];
    const lineWidth = 42; // 58mm / ~1.4mm per char

    // Header
    lines.push('='.repeat(lineWidth));
    lines.push(this.centerText('MOUDI POS', lineWidth));
    lines.push('='.repeat(lineWidth));

    // Order info
    lines.push(`Order: ${receipt.orderId}`);
    lines.push(`Date: ${receipt.timestamp.toLocaleString()}`);
    if (receipt.customerName) {
      lines.push(`Customer: ${receipt.customerName}`);
    }
    lines.push('-'.repeat(lineWidth));

    // Items
    lines.push('Item'.padEnd(30) + 'Qty'.padStart(4) + 'Price'.padStart(7));
    lines.push('-'.repeat(lineWidth));
    receipt.items.forEach((item) => {
      const name = item.name.substring(0, 30).padEnd(30);
      const qty = String(item.quantity).padStart(4);
      const price = `${(item.price * item.quantity).toFixed(2)}`.padStart(7);
      lines.push(name + qty + price);
    });

    // Totals
    lines.push('-'.repeat(lineWidth));
    lines.push(
      'Subtotal'.padEnd(35) + `${receipt.subtotal.toFixed(2)}`.padStart(6)
    );
    lines.push('Tax (20%)'.padEnd(35) + `${receipt.tax.toFixed(2)}`.padStart(6));
    lines.push('='.repeat(lineWidth));
    lines.push(
      'TOTAL'.padEnd(35) + `${receipt.total.toFixed(2)}`.padStart(6)
    );
    lines.push('='.repeat(lineWidth));

    // Payment
    lines.push(`Payment: ${receipt.paymentMethod}`);
    lines.push('');
    lines.push(this.centerText('Thank you!', lineWidth));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Center text for thermal printer
   */
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Export receipt as PDF (requires jsPDF + html2canvas)
   * TODO: Implement with actual PDF generation
   */
  async exportPDF(receipt: Receipt): Promise<void> {
    const filename = `receipt-${receipt.orderId}-${Date.now()}.pdf`;
    console.log('PDF export would save as:', filename);
    // TODO: Implement jsPDF generation
  }

  /**
   * Print receipt to thermal printer
   * TODO: Implement with actual printer communication
   */
  async printThermal(receipt: Receipt): Promise<void> {
    const receiptText = this.generateThermalReceipt(receipt);
    console.log('Would print to thermal printer:\n', receiptText);
    // TODO: Implement printer communication via Tauri/Node.js
  }

  /**
   * Generate receipt from order
   */
  generateFromOrder(
    order: Order,
    customerName?: string,
    paymentMethod = 'Cash'
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
