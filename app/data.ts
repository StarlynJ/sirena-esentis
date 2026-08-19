export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  role: string;
  collection?: "esentis" | "makeup";
  sourceUrl?: string;
};

export const products: Product[] = [
  { id: 1, name: "Gel Facial Esentis Limpiador 200 Ml", price: 275, image: "/products/gel-facial.webp", role: "Limpieza", collection: "esentis", sourceUrl: "https://www.sirena.do/esentis-gel-facial-limpiador-200-ml-2123816/p" },
  { id: 2, name: "Serum Aclarante Esentis 30 Ml", price: 495, image: "/products/serum-aclarante.webp", role: "Tratamiento", collection: "esentis", sourceUrl: "https://www.sirena.do/esentis-serum-aclarante-30-ml-2124025/p" },
  { id: 3, name: "Leave-In Esentis Nutricion 300 Ml", price: 325, image: "/products/leave-in.webp", role: "Cabello", collection: "esentis", sourceUrl: "https://www.sirena.do/esentis-leave-in-nutricion-300-ml-2123807/p" },
  { id: 4, name: "Serum Esentis Anti Edad 30 Ml", price: 495, image: "/products/serum-antiedad.webp", role: "Tratamiento", collection: "esentis", sourceUrl: "https://www.sirena.do/esentis-serum-anti-edad-30-ml-2124019/p" },
  { id: 5, name: "Contorno De Ojo Antiedad Esentis 15 Ml", price: 400, image: "/products/contorno-antiedad.webp", role: "Contorno de ojos", collection: "esentis", sourceUrl: "https://www.sirena.do/esentis-contorno-de-ojo-antiedad-15-ml-2124023/p" },
  { id: 6, name: "Crema Aclarante Esentis 50 Ml", price: 450, image: "/products/crema-aclarante.webp", role: "Hidratación", collection: "esentis", sourceUrl: "https://www.sirena.do/esentis-crema-aclarante-50-ml-2124027/p" },
  { id: 7, name: "Contorno De Ojo Hidratante Esentis 15 Ml", price: 400, image: "/products/contorno-hidratante.webp", role: "Contorno de ojos", collection: "esentis", sourceUrl: "https://www.sirena.do/esentis-contorno-de-ojo-hidratante-15-ml-2124035/p" },
  { id: 8, name: "Sebo Regular Esentis 50 Ml", price: 575, image: "/products/sebo-regular.webp", role: "Balance", collection: "esentis", sourceUrl: "https://www.sirena.do/esentis-sebo-regular-50-ml-2124039/p" },
  { id: 9, name: "Base Facial Líquida Always Neutral", price: 1400, image: "/products/makeup/base-almay.webp", role: "Base", collection: "makeup", sourceUrl: "https://www.sirena.do/almay-clear-complexion-makeup-neutral-1747245/p" },
  { id: 10, name: "Polvo de Rubor S.HE R.Bs998", price: 138, image: "/products/makeup/rubor-she.webp", role: "Rubor", collection: "makeup", sourceUrl: "https://www.sirena.do/s-he-blush-powder-r-bs998-2140832/p" },
  { id: 11, name: "Labial Wet N Wild Mega Sliks Gloss Love", price: 475, image: "/products/makeup/labial-wetnwild.webp", role: "Labial", collection: "makeup", sourceUrl: "https://www.sirena.do/wet-n-wild-mega-sliks-lip-gloss-love-lg-2007202/p" },
  { id: 12, name: "Corrector Amuse Full Honey", price: 265.3, image: "/products/makeup/corrector-amuse.webp", role: "Corrector", collection: "makeup", sourceUrl: "https://www.sirena.do/amuse-full-concealer-honey-kl237-mix-6-1973074/p" },
  { id: 13, name: "Pre-base Sky Smooth & Poreless", price: 281.25, image: "/products/makeup/prebase-sky.webp", role: "Prebase", collection: "makeup", sourceUrl: "https://www.sirena.do/sky-primer-smooth-poreless-1882109/p" },
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
