import type { Metadata } from "next";
import { CartPage } from "../cart-page";

export const metadata: Metadata = { title: "Mi carrito | Sirena", description: "Carrito de compra del prototipo Sirena Esentis." };
export default function Page() { return <CartPage />; }
