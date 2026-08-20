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

// Emergency-only catalog. The database remains the primary source; these
// entries keep the recommendation and cart flow usable during API cold starts.
export const fallbackCatalogProducts: Product[] = [
  { id: 900001, name: "Gel Facial Esentis Limpiador 200 Ml", price: 299, image: "/products/gel-facial.webp", role: "Limpieza facial", collection: "esentis", description: "Limpieza cosmética suave para retirar residuos del rostro.", usage: "Úsalo sobre el rostro húmedo y enjuaga con agua.", suitableFor: ["seca", "grasa", "mixta", "sensible", "normal"], concerns: ["limpieza", "suavidad"] },
  { id: 900002, name: "Sebo Regulador Esentis", price: 399, image: "/products/sebo-regular.webp", role: "Control de brillo", collection: "esentis", description: "Apoya una rutina orientada al brillo y la apariencia de sebo.", usage: "Aplícalo gradualmente después de la limpieza.", suitableFor: ["grasa", "mixta"], concerns: ["brillo", "sebo", "zona t"] },
  { id: 900003, name: "Serum Aclarante Esentis 30 Ml", price: 449, image: "/products/serum-aclarante.webp", role: "Sérum facial", collection: "esentis", description: "Complemento cosmético para una apariencia de tono más uniforme.", usage: "Aplica pocas gotas antes de la crema y usa protector solar de día.", suitableFor: ["seca", "grasa", "mixta", "normal"], concerns: ["uniformidad", "manchas", "tono"] },
  { id: 900004, name: "Crema Facial Aclarante Esentis", price: 399, image: "/products/crema-aclarante.webp", role: "Crema facial", collection: "esentis", description: "Crema para complementar hidratación y uniformidad cosmética.", usage: "Aplícala después del sérum y realiza una prueba de parche.", suitableFor: ["seca", "mixta", "sensible", "normal"], concerns: ["hidratación", "resequedad", "suavidad"] },
  { id: 900005, name: "Contorno Hidratante Esentis", price: 349, image: "/products/contorno-hidratante.webp", role: "Contorno de ojos", collection: "esentis", description: "Hidratación cosmética para la apariencia del contorno de ojos.", usage: "Usa una cantidad pequeña con toques suaves, sin acercarte al ojo.", suitableFor: ["seca", "mixta", "sensible", "normal"], concerns: ["hidratación", "ojeras", "suavidad"] },
  { id: 900006, name: "Serum Antiedad Esentis", price: 499, image: "/products/serum-antiedad.webp", role: "Sérum facial", collection: "esentis", description: "Apoya una rutina cosmética enfocada en firmeza y textura.", usage: "Introduce su uso poco a poco después de la limpieza.", suitableFor: ["seca", "mixta", "normal"], concerns: ["textura", "firmeza", "hidratación"] },
  { id: 900007, name: "Contorno Antiedad Esentis", price: 399, image: "/products/contorno-antiedad.webp", role: "Contorno de ojos", collection: "esentis", description: "Cuidado cosmético para la apariencia del área de los ojos.", usage: "Aplica con toques suaves sobre piel limpia.", suitableFor: ["seca", "mixta", "normal"], concerns: ["ojeras", "textura", "suavidad"] },
];

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
