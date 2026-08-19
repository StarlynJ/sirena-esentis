export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  role: string;
  collection: "esentis" | "makeup";
  sourceUrl?: string;
  description: string;
  usage: string;
  suitableFor: Array<"seca" | "grasa" | "mixta" | "sensible" | "normal">;
  concerns: string[];
};

export const categories = [
  { name: "Belleza", image: "/categories/belleza.png", href: "/esentis" },
  { name: "Frutas y Vegetales", image: "/categories/frutas.png", href: "#" },
  { name: "Picaderas", image: "/categories/picaderas.png", href: "#" },
  { name: "Carnes, Pescados y Mariscos", image: "/categories/carnes.png", href: "#" },
  { name: "Cuidado Personal", image: "/categories/cuidado-personal.png", href: "#" },
  { name: "Vinos, Cervezas y Licores", image: "/categories/vinos.png", href: "#" },
  { name: "Limpieza y Desechables", image: "/categories/limpieza.png", href: "#" },
  { name: "Cuidado para la Piel", image: "/categories/cuidado-piel.png", href: "/esentis" },
  { name: "Maquillaje", image: "/categories/maquillaje.png", href: "/analisis-piel#colorimetria" },
  { name: "Galletas y Dulces", image: "/categories/galletas.png", href: "#" },
];

export function formatPrice(value: number) {
  return `RD$${value.toFixed(2)}`;
}

const facialCareRoles = new Set([
  "Desmaquillante",
  "Limpieza facial",
  "Control de brillo",
  "Contorno de ojos",
  "Sérum facial",
  "Crema facial",
  "Protección solar",
]);

export function isFacialCareProduct(product: Product) {
  return product.collection === "esentis" && facialCareRoles.has(product.role);
}
