import type { Metadata } from "next";
import { HomePage } from "./home-page";

export const metadata: Metadata = {
  title: "Sirena — Compra fácil, vive mejor",
  description: "Compra en Sirena y descubre tu rutina Esentis personalizada.",
};

export default function Page() { return <HomePage />; }
