import type { Metadata } from "next";
import { CatalogPage } from "../catalog-page";

export const metadata: Metadata = { title: "ESENTIS | Sirena", description: "Catálogo Esentis y asesor de belleza." };
export default function Page() { return <CatalogPage />; }
