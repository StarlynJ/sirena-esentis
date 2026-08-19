import type { Metadata } from "next";
import { SkinAnalysisPage } from "../skin-analysis-page";

export const metadata: Metadata = {
  title: "Análisis de piel y colorimetría | Sirena",
  description: "Prototipo de análisis cosmético visual, colorimetría y recomendaciones de belleza Sirena.",
};

export default function AnalysisRoute() {
  return <SkinAnalysisPage />;
}
