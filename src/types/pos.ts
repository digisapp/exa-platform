export interface ProductVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  price_override: number | null;
}

export interface Product {
  id: string;
  name: string;
  retail_price: number;
  images: string[];
  brand_id: string;
  brand_name?: string;
  variants: ProductVariant[];
}

export interface CartItem {
  id: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  price: number;
}

export interface CompletedSale {
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "card" | "cash";
  amountPaid: number;
  change: number;
  timestamp: Date;
}
