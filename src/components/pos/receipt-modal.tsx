"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Printer,
  Mail,
  MessageSquare,
  Check,
  Receipt,
} from "lucide-react";
import type { CompletedSale } from "@/types/pos";

interface ReceiptModalProps {
  sale: CompletedSale;
  onClose: () => void;
}

export function ReceiptModal({ sale, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt - ${sale.orderNumber}</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  width: 300px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { font-size: 24px; margin: 0; }
                .header p { margin: 5px 0; color: #666; }
                .divider { border-top: 1px dashed #333; margin: 10px 0; }
                .item { display: flex; justify-content: space-between; margin: 5px 0; }
                .item-name { max-width: 180px; }
                .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
                .grand-total { font-weight: bold; font-size: 18px; margin-top: 10px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>EXA SWIM SHOP</h1>
                <p>Thank you for shopping!</p>
                <p>${new Date(sale.timestamp).toLocaleString()}</p>
                <p>Order: ${sale.orderNumber}</p>
              </div>
              <div class="divider"></div>
              ${sale.items
                .map(
                  (item) => `
                <div class="item">
                  <span class="item-name">
                    ${item.product.name}
                    ${item.variant.size ? ` (${item.variant.size})` : ""}
                    x${item.quantity}
                  </span>
                  <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              `
                )
                .join("")}
              <div class="divider"></div>
              <div class="total-row">
                <span>Subtotal</span>
                <span>$${sale.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax (7%)</span>
                <span>$${sale.tax.toFixed(2)}</span>
              </div>
              <div class="divider"></div>
              <div class="total-row grand-total">
                <span>TOTAL</span>
                <span>$${sale.total.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>${sale.paymentMethod === "cash" ? "Cash" : "Card"}</span>
                <span>$${sale.amountPaid.toFixed(2)}</span>
              </div>
              ${
                sale.change > 0
                  ? `
              <div class="total-row">
                <span>Change</span>
                <span>$${sale.change.toFixed(2)}</span>
              </div>
              `
                  : ""
              }
              <div class="footer">
                <p>Thank you for shopping with us!</p>
                <p>www.examodels.com</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleEmailReceipt = async () => {
    // In production, would prompt for email and send
    toast.info("Email receipt feature coming soon");
  };

  const handleTextReceipt = async () => {
    // In production, would prompt for phone and send SMS
    toast.info("Text receipt feature coming soon");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {/* Success Header */}
        <div className="p-6 bg-green-500/10 border-b border-green-500/20 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-green-500">Payment Complete!</h2>
          <p className="text-muted-foreground">Order #{sale.orderNumber}</p>
        </div>

        {/* Receipt Preview */}
        <div ref={receiptRef} className="p-6 max-h-64 overflow-auto">
          <div className="space-y-2 text-sm">
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="truncate max-w-[200px]">
                  {item.product.name}
                  {item.variant.size && ` (${item.variant.size})`}
                  {item.quantity > 1 && ` x${item.quantity}`}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${sale.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>${sale.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-1">
                <span>Total</span>
                <span className="text-green-500">${sale.total.toFixed(2)}</span>
              </div>
            </div>
            {sale.paymentMethod === "cash" && sale.change > 0 && (
              <div className="flex justify-between p-2 bg-amber-500/10 rounded mt-2">
                <span className="text-amber-500">Change Due</span>
                <span className="font-bold text-amber-500">${sale.change.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Receipt Actions */}
        <div className="p-6 border-t space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={handlePrint} className="flex-col h-16 gap-1">
              <Printer className="h-5 w-5" />
              <span className="text-xs">Print</span>
            </Button>
            <Button variant="outline" onClick={handleEmailReceipt} className="flex-col h-16 gap-1">
              <Mail className="h-5 w-5" />
              <span className="text-xs">Email</span>
            </Button>
            <Button variant="outline" onClick={handleTextReceipt} className="flex-col h-16 gap-1">
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs">Text</span>
            </Button>
          </div>

          <Button onClick={onClose} className="w-full h-12 bg-green-600 hover:bg-green-700">
            <Receipt className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>
      </Card>
    </div>
  );
}
