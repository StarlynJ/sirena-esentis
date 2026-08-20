"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadCatalogProducts } from "./catalog-api";
import { fallbackCatalogProducts, type Product } from "./data";

type CartLine = { product: Product; quantity: number };
type CartContextValue = {
  items: CartLine[];
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  productsFallback: boolean;
  totalCount: number;
  subtotal: number;
  addProduct: (productId: number, quantity?: number) => void;
  removeProduct: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "sirena-esentis-demo-cart";
const CartContext = createContext<CartContextValue | null>(null);

export function StoreProvider({ children, initialProducts = [] }: { children: React.ReactNode; initialProducts?: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productsLoading, setProductsLoading] = useState(initialProducts.length === 0);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsFallback, setProductsFallback] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setQuantities(JSON.parse(saved));
      } catch {
        setQuantities({});
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalogProducts(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setProducts(rows);
        setProductsError(null);
        setProductsFallback(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setProducts((current) => current.length > 0 ? current : fallbackCatalogProducts);
        setProductsFallback(true);
        setProductsError("El catálogo tardó más de 4 segundos. Mostramos una selección temporal mientras se recupera la conexión.");
      })
      .finally(() => setProductsLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
  }, [isHydrated, quantities]);

  const value = useMemo<CartContextValue>(() => {
    const items = products
      .filter((product) => (quantities[product.id] ?? 0) > 0)
      .map((product) => ({ product, quantity: quantities[product.id] }));
    const totalCount = items.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = items.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

    return {
      items,
      products,
      productsLoading,
      productsError,
      productsFallback,
      totalCount,
      subtotal,
      addProduct(productId, quantity = 1) {
        setQuantities((current) => ({ ...current, [productId]: (current[productId] ?? 0) + quantity }));
      },
      removeProduct(productId) {
        setQuantities((current) => {
          const next = { ...current };
          delete next[productId];
          return next;
        });
      },
      setQuantity(productId, quantity) {
        if (quantity <= 0) {
          setQuantities((current) => {
            const next = { ...current };
            delete next[productId];
            return next;
          });
          return;
        }
        setQuantities((current) => ({ ...current, [productId]: quantity }));
      },
      clearCart() { setQuantities({}); },
    };
  }, [products, productsError, productsFallback, productsLoading, quantities]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside StoreProvider");
  return value;
}
