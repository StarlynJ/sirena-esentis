import { formatPrice, type Product } from "./data";
import type { SkinProfileKey } from "./skin-description-ai";

type LanguageSession = { prompt: (input: string) => Promise<string>; destroy?: () => void };
type LanguageModelApi = { availability: (options?: object) => Promise<string>; create: (options?: object) => Promise<LanguageSession> };

const domainTerms = /producto|sirena|esentis|piel|rutina|limpi|serum|sérum|crema|contorno|sebo|brillo|grasa|seca|mixta|sensible|normal|mancha|tono|ojera|poros|base|rubor|labial|gloss|corrector|prebase|maquillaje|cabello|leave.?in|precio|cuesta|usar|aplicar|orden|combinar|recomienda|conviene|diferencia|ingrediente|disponib|comprar|carrito|protector|hidrat/i;

const systemPrompt = `
Eres la asesora virtual de productos de Sirena. Responde en español dominicano, de forma amable, concreta y conversacional.

ALCANCE ESTRICTO:
- Responde SOLO preguntas sobre los productos incluidos en BASE_DE_CONOCIMIENTO, su precio mostrado, categoría, descripción, uso cosmético orientativo, orden de rutina, comparación y compatibilidad general con el perfil indicado.
- Si preguntan sobre cualquier otro tema, responde exactamente con una redirección breve: "Puedo ayudarte únicamente con productos, maquillaje y rutinas disponibles en este catálogo de Sirena. ¿Sobre cuál producto tienes dudas?"
- No inventes ingredientes, concentraciones, certificaciones, disponibilidad, promociones, resultados clínicos ni propiedades que no estén en la base.
- Si preguntan por ingredientes o inventario y no aparecen verificados, dilo con claridad y recomienda revisar la etiqueta o la ficha vigente en Sirena.do.
- No diagnostiques afecciones ni sustituyas dermatología. Si mencionan dolor, inflamación, lesión, sangrado o una reacción persistente, recomienda suspender el producto y consultar a un profesional.
- Recomendar no significa presionar la compra. Primero explica por qué podría encajar, cómo usarlo y una precaución relevante.
- Usa máximo 90 palabras. No uses Markdown complejo ni listes más de 3 productos.
`.trim();

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function relatedEntries(question: string, profile: SkinProfileKey, products: Product[]) {
  const normalized = normalize(question);
  return products
    .map((product) => {
      const productText = normalize(`${product.name} ${product.role} ${product.description} ${product.concerns.join(" ")}`);
      const tokens = normalized.split(/\W+/).filter((token) => token.length > 3);
      let relevance = tokens.filter((token) => productText.includes(token)).length * 3;
      if (product.suitableFor.includes(profile)) relevance += 1;
      if (normalized.includes("barato") || normalized.includes("economico")) relevance += Math.max(0, 700 - product.price) / 700;
      return { product, relevance };
    })
    .sort((a, b) => b.relevance - a.relevance);
}

function fallbackAnswer(question: string, profile: SkinProfileKey, products: Product[]) {
  if (!domainTerms.test(question)) {
    return "Puedo ayudarte únicamente con productos, maquillaje y rutinas disponibles en este catálogo de Sirena. ¿Sobre cuál producto tienes dudas?";
  }

  const normalized = normalize(question);
  const ranked = relatedEntries(question, profile, products);
  const best = ranked[0]?.product;
  const matched = ranked.filter((item) => item.relevance >= 3).slice(0, 3).map((item) => item.product);

  if (/ingrediente|composicion|contiene/.test(normalized)) {
    return "La ficha cargada no detalla la lista completa de ingredientes. Para no inventarte información, te recomiendo revisar la etiqueta del producto o abrir su ficha vigente en Sirena.do. Si me dices cuál producto es, sí puedo explicarte su función y uso disponible.";
  }
  if (/disponib|inventario|existencia|tienda/.test(normalized)) {
    return "No puedo confirmar inventario por tienda en tiempo real. Puedes abrir la ficha de Sirena.do o verificar tu dirección para consultar disponibilidad. Sí puedo ayudarte a comparar el producto o incorporarlo a tu rutina.";
  }
  if (/precio|cuesta|valor/.test(normalized)) {
    const targets = matched.length ? matched : ranked.slice(0, 3).map((item) => item.product);
    return targets.map((product) => `${product.name}: ${formatPrice(product.price)}.`).join(" ") + " Los precios corresponden a la información cargada y pueden cambiar en Sirena.do.";
  }
  if (/orden|rutina|primero|despues|combinar/.test(normalized)) {
    return "Orden orientativo: 1) Gel Facial Esentis, 2) sérum según tu objetivo, 3) contorno de ojos, 4) crema y 5) protector solar durante el día. Introduce un producto nuevo a la vez y haz prueba de parche.";
  }
  if (/como|usar|aplica/.test(normalized) && best) {
    return `${best.name}: ${best.usage} Su función principal es ${best.description.charAt(0).toLowerCase()}${best.description.slice(1)}`;
  }
  if (/diferencia|compar/.test(normalized) && matched.length >= 2) {
    const [first, second] = matched;
    return `${first.name} se orienta a ${first.concerns.slice(0, 2).join(" y ")}; ${second.name} se orienta a ${second.concerns.slice(0, 2).join(" y ")}. Para piel ${profile}, elegiría según el objetivo que quieras priorizar.`;
  }
  if (matched.length) {
    const selected = matched[0];
    return `${selected.name} podría encajar porque ${selected.description.charAt(0).toLowerCase()}${selected.description.slice(1)} Para un perfil ${profile}: ${selected.usage} Haz prueba de parche antes de incorporarlo.`;
  }

  const suitable = ranked.filter(({ product }) => product.suitableFor.includes(profile)).slice(0, 3).map(({ product }) => product.name);
  return `Para piel ${profile}, puedo orientarte sobre ${suitable.join(", ")}. Pregúntame por precio, función, orden de uso o diferencias entre productos.`;
}

type BackendContext = { name: string; age: number; sessionSlug: string | null };
export type ProductChatAnswer = { answer: string; sessionSlug: string | null };

function localSessionSlug() {
  const token = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "").slice(0, 16)
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(0, 16);
  return `sesion-${token}`;
}

export async function createProductChatSession(name: string, age: number) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  try {
    const response = await fetch(`${apiUrl}/api/chat/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, age }),
    });
    if (response.ok) {
      const result = await response.json() as { slug: string };
      if (/^sesion-[a-z0-9-]{8,32}$/.test(result.slug)) return result.slug;
    }
  } catch {
    // A local slug keeps the static Cloudflare prototype functional without the API.
  }
  return localSessionSlug();
}

export async function answerProductQuestion(question: string, profile: SkinProfileKey, recentMessages: string[], context: BackendContext, products: Product[]): Promise<ProductChatAnswer> {
  if (!domainTerms.test(question)) return { answer: fallbackAnswer(question, profile, products), sessionSlug: context.sessionSlug };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  try {
    const response = await fetch(`${apiUrl}/api/chat/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionSlug: context.sessionSlug, name: context.name, age: context.age, skinProfile: profile, question }),
    });
    if (response.ok) {
      const result = await response.json() as { answer: string; sessionSlug: string };
      return { answer: result.answer, sessionSlug: result.sessionSlug };
    }
  } catch {
    // The local responder keeps the prototype usable when the API is offline.
  }

  const languageModel = (globalThis as unknown as { LanguageModel?: LanguageModelApi }).LanguageModel;
  if (languageModel) {
    const options = { expectedInputs: [{ type: "text", languages: ["es"] }], expectedOutputs: [{ type: "text", languages: ["es"] }] };
    try {
      const availability = await languageModel.availability(options);
      if (availability !== "unavailable") {
        const session = await languageModel.create(options);
        const response = await session.prompt(`${systemPrompt}\n\nPERFIL PROBABLE: ${profile}\nCONVERSACIÓN RECIENTE: ${recentMessages.slice(-4).join(" | ")}\nPREGUNTA: ${question}\nBASE_DE_CONOCIMIENTO: ${JSON.stringify(products.map(({ id, name, role, price, description, usage, suitableFor, concerns, sourceUrl }) => ({ id, name, role, price, description, usage, suitableFor, concerns, sourceUrl })))}`);
        session.destroy?.();
        return { answer: response.trim().slice(0, 900), sessionSlug: context.sessionSlug };
      }
    } catch {
      // Continue with the deterministic knowledge-base responder.
    }
  }
  return { answer: fallbackAnswer(question, profile, products), sessionSlug: context.sessionSlug };
}
