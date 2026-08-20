import { API_URL } from "./api-url";
import type { Product } from "./data";

type ApiProduct = {
  id: number;
  name: string;
  price: number;
  imagePath: string;
  role: string;
  collection: "esentis" | "makeup";
  sourceUrl?: string;
  description: string;
  usage: string;
  suitableFor: Product["suitableFor"];
  concerns: string[];
};

export function mapCatalogProduct(row: ApiProduct): Product {
  return { ...row, image: row.imagePath };
}

export async function loadCatalogProducts(signal?: AbortSignal): Promise<Product[]> {
  const apiUrl = API_URL;
  if (!apiUrl && typeof window === "undefined") return [];
  const timeoutSignal = AbortSignal.timeout(4000);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(`${apiUrl}/api/products`, { headers: { Accept: "application/json" }, signal: requestSignal });
  if (!response.ok) throw new Error(`Catalog API returned HTTP ${response.status}`);
  return (await response.json() as ApiProduct[]).map(mapCatalogProduct);
}
