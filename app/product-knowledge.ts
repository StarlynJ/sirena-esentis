import { products } from "./data";
import type { SkinProfileKey } from "./skin-description-ai";

export type ProductKnowledge = {
  productId: number;
  description: string;
  usage: string;
  suitableFor: SkinProfileKey[];
  concerns: string[];
  verified: string[];
};

export const productKnowledge: ProductKnowledge[] = [
  { productId: 1, description: "Gel facial de uso diario que elimina impurezas y deja la piel fresca y limpia.", usage: "Úsalo como primer paso sobre el rostro húmedo y retíralo con agua. Evita el contacto directo con los ojos.", suitableFor: ["seca", "grasa", "mixta", "sensible", "normal"], concerns: ["limpieza", "impurezas", "rutina diaria"], verified: ["descripción", "presentación", "precio"] },
  { productId: 2, description: "Sérum ligero y concentrado orientado a unificar el tono, reducir la apariencia de manchas visibles y aportar luminosidad.", usage: "Aplica pocas gotas después de limpiar y antes de la crema. Durante el día complementa con protector solar.", suitableFor: ["grasa", "mixta", "normal"], concerns: ["manchas", "tono desigual", "luminosidad"], verified: ["descripción", "presentación", "precio"] },
  { productId: 3, description: "Crema de peinar sin enjuague para cabello normal a seco que busca hidratación y fortalecimiento continuo.", usage: "Distribuye una cantidad pequeña en el cabello húmedo, de medios a puntas, y no enjuagues.", suitableFor: ["seca", "grasa", "mixta", "sensible", "normal"], concerns: ["cabello seco", "peinado", "nutrición capilar"], verified: ["descripción", "presentación", "precio"] },
  { productId: 4, description: "Sérum orientado a la apariencia de líneas de expresión, signos de fatiga, hidratación y firmeza.", usage: "Aplica pocas gotas después de limpiar y antes de la crema. Introduce el producto gradualmente.", suitableFor: ["seca", "normal", "mixta"], concerns: ["líneas finas", "fatiga", "firmeza", "luminosidad"], verified: ["descripción", "presentación", "precio"] },
  { productId: 5, description: "Contorno de ojos de textura ligera orientado a líneas finas, ojeras y signos de fatiga.", usage: "Aplica una cantidad pequeña con toques suaves sobre el hueso orbital, sin acercarte demasiado al ojo.", suitableFor: ["seca", "normal", "mixta"], concerns: ["ojeras", "líneas finas", "fatiga"], verified: ["descripción", "presentación", "precio"] },
  { productId: 6, description: "Crema orientada a disminuir la apariencia de manchas, unificar el tono e hidratar.", usage: "Aplica después del sérum. De día, termina siempre con protector solar.", suitableFor: ["seca", "normal", "mixta"], concerns: ["manchas", "hidratación", "tono desigual", "luminosidad"], verified: ["descripción", "presentación", "precio"] },
  { productId: 7, description: "Contorno que hidrata y suaviza la piel del área de los ojos, orientado a sequedad y signos de fatiga.", usage: "Aplica poca cantidad con el dedo anular, mediante toques suaves y sin frotar.", suitableFor: ["seca", "sensible", "normal", "mixta"], concerns: ["sequedad", "ojeras", "fatiga", "contorno de ojos"], verified: ["descripción", "presentación", "precio"] },
  { productId: 8, description: "Producto orientado a equilibrar la producción de sebo y reducir el brillo y la sensación grasa.", usage: "Aplica una capa ligera después de limpiar, principalmente en las zonas con brillo.", suitableFor: ["grasa", "mixta"], concerns: ["grasa", "brillo", "sebo", "zona t"], verified: ["descripción", "presentación", "precio"] },
  { productId: 9, description: "Base líquida con cobertura ligera a media y acabado natural y radiante.", usage: "Prueba el tono en la mandíbula y difumina desde el centro del rostro hacia afuera.", suitableFor: ["seca", "grasa", "mixta", "sensible", "normal"], concerns: ["base", "cobertura", "tono", "maquillaje"], verified: ["descripción", "precio"] },
  { productId: 10, description: "Rubor compacto de textura sedosa, aplicación uniforme y acabado natural luminoso.", usage: "Aplica poca cantidad sobre las mejillas y difumina gradualmente.", suitableFor: ["seca", "grasa", "mixta", "sensible", "normal"], concerns: ["rubor", "mejillas", "maquillaje", "color"], verified: ["descripción", "precio"] },
  { productId: 11, description: "Brillo labial Wet N Wild de la línea MegaSlicks en tono Love.", usage: "Aplícalo directamente en los labios y reaplica según el acabado deseado.", suitableFor: ["seca", "grasa", "mixta", "sensible", "normal"], concerns: ["labial", "gloss", "labios", "maquillaje"], verified: ["nombre", "precio"] },
  { productId: 12, description: "Corrector cremoso tono Honey que se difumina para disimular visualmente ojeras e imperfecciones, con acabado suave.", usage: "Aplica pequeñas cantidades donde necesites cobertura y difumina sin arrastrar la piel.", suitableFor: ["seca", "grasa", "mixta", "sensible", "normal"], concerns: ["corrector", "ojeras", "imperfecciones", "maquillaje"], verified: ["descripción", "precio"] },
  { productId: 13, description: "Prebase facial Sky Smooth & Poreless para preparar visualmente la superficie antes del maquillaje.", usage: "Aplica una capa fina después del cuidado facial y antes de la base.", suitableFor: ["seca", "grasa", "mixta", "sensible", "normal"], concerns: ["prebase", "poros", "textura", "maquillaje"], verified: ["nombre", "precio"] },
];

export const knowledgeEntries = productKnowledge.map((entry) => ({
  ...entry,
  product: products.find((product) => product.id === entry.productId)!,
}));

export function buildKnowledgeContext() {
  return knowledgeEntries.map(({ product, description, usage, suitableFor, concerns, verified }) => ({
    id: product.id,
    name: product.name,
    category: product.role,
    priceDop: product.price,
    description,
    usage,
    suitableFor,
    concerns,
    verified,
    sourceUrl: product.sourceUrl,
  }));
}
