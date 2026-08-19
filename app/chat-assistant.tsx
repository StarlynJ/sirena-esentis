"use client";

import { ArrowLeft, ArrowRight, Check, CircleAlert, LoaderCircle, Send, ShieldCheck, ShoppingBag, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { OPEN_ASSISTANT_EVENT } from "./assistant-trigger-link";
import { formatPrice, isFacialCareProduct } from "./data";
import { answerProductQuestion, createProductChatSession } from "./product-chat-engine";
import { analyzeDescriptionWithBrowserAI } from "./skin-description-ai";
import { useCart } from "./store-provider";

type Stage = "intro" | "skin" | "chat";
type ProfileKey = "seca" | "grasa" | "mixta" | "sensible" | "normal";
type ChatMessage = { role: "assistant" | "user"; text: string };
type StoredChatSession = { name: string; age: string; stage: Stage; profile: ProfileKey | null; messages: ChatMessage[] };
const SESSION_STORAGE_PREFIX = "sirena-esentis-session:";

const profileGuidance: Record<ProfileKey, { label: string; response: string; priorities: string[] }> = {
  seca: { label: "Piel seca", response: "Tu descripción sugiere una piel que necesita limpieza suave y apoyo de hidratación.", priorities: ["hidratación", "suavidad", "resequedad"] },
  grasa: { label: "Piel grasa", response: "Tu descripción sugiere mayor producción de sebo y brillo frecuente.", priorities: ["brillo", "sebo", "limpieza"] },
  mixta: { label: "Piel mixta", response: "Tu descripción sugiere brillo en la zona T y zonas más secas o equilibradas.", priorities: ["zona t", "brillo", "hidratación"] },
  sensible: { label: "Piel sensible", response: "Tu descripción sugiere sensibilidad o reacción frecuente ante productos.", priorities: ["limpieza", "hidratación", "suavidad"] },
  normal: { label: "Piel normal", response: "Tu descripción sugiere una piel equilibrada con necesidades de mantenimiento.", priorities: ["limpieza", "hidratación", "protección solar"] },
};

const options: { key: ProfileKey; label: string; hint: string }[] = [
  { key: "seca", label: "Seca", hint: "Tirante, áspera o con descamación" },
  { key: "grasa", label: "Grasa", hint: "Brillo frecuente o poros visibles" },
  { key: "mixta", label: "Mixta", hint: "Zona T brillante y mejillas secas" },
  { key: "sensible", label: "Sensible", hint: "Se irrita, arde o enrojece" },
  { key: "normal", label: "Normal", hint: "Se siente equilibrada" },
];

function inferProfile(text: string): ProfileKey {
  const value = text.toLowerCase();
  if (/arde|irrita|roj|sensible|picor|reacc/.test(value)) return "sensible";
  if (/zona t|nariz.*brill|frente.*brill|mejillas.*seca|mixta/.test(value)) return "mixta";
  if (/grasa|brillo|poros|aceit/.test(value)) return "grasa";
  if (/seca|tirante|descama|áspera|aspera/.test(value)) return "seca";
  return "normal";
}

export function ChatAssistant() {
  const { addProduct, products } = useCart();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("intro");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [profile, setProfile] = useState<ProfileKey | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [addedProducts, setAddedProducts] = useState<number[]>([]);
  const [analyzingText, setAnalyzingText] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [sessionSlug, setSessionSlug] = useState<string | null>(null);
  const conversationFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener(OPEN_ASSISTANT_EVENT, openAssistant);
    const query = new URLSearchParams(window.location.search);
    const slug = query.get("sesion");
    const restoreTimer = slug ? window.setTimeout(() => {
      setSessionSlug(slug);
      setOpen(true);
      try {
        const stored = JSON.parse(localStorage.getItem(`${SESSION_STORAGE_PREFIX}${slug}`) ?? "null") as StoredChatSession | null;
        if (stored) {
          setName(stored.name);
          setAge(stored.age);
          setStage(stored.stage);
          setProfile(stored.profile);
          setMessages(stored.messages);
        }
      } catch {
        localStorage.removeItem(`${SESSION_STORAGE_PREFIX}${slug}`);
      }
    }, 0) : undefined;
    const openTimer = query.get("asesor") === "1"
      ? window.setTimeout(openAssistant, 0)
      : undefined;
    return () => {
      window.removeEventListener(OPEN_ASSISTANT_EVENT, openAssistant);
      if (openTimer !== undefined) window.clearTimeout(openTimer);
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (!sessionSlug) return;
    const snapshot: StoredChatSession = { name, age, stage, profile, messages };
    localStorage.setItem(`${SESSION_STORAGE_PREFIX}${sessionSlug}`, JSON.stringify(snapshot));
  }, [age, messages, name, profile, sessionSlug, stage]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (stage !== "chat") return;
    const feed = conversationFeedRef.current;
    if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
  }, [messages, answering, stage]);

  const recommendation = profile ? profileGuidance[profile] : null;
  const recommendedProducts = useMemo(
    () => recommendation ? products
      .filter((product) => isFacialCareProduct(product) && product.suitableFor.includes(profile!))
      .map((product) => ({
        product,
        score: product.concerns.filter((concern) => recommendation.priorities.some((priority) => concern.includes(priority) || priority.includes(concern))).length * 4
          + (/facial|sérum|contorno|solar|brillo/i.test(product.role) ? 2 : 0),
      }))
      .sort((first, second) => second.score - first.score || first.product.price - second.product.price)
      .slice(0, 3)
      .map(({ product }) => product) : [],
    [products, profile, recommendation],
  );

  function updateSessionUrl(slug: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("sesion", slug);
    url.searchParams.delete("asesor");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function submitIntro(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !age || Number(age) < 13 || Number(age) > 99 || creatingSession) return;
    setCreatingSession(true);
    const slug = await createProductChatSession(name.trim(), Number(age));
    setSessionSlug(slug);
    updateSessionUrl(slug);
    setStage("skin");
    setCreatingSession(false);
  }

  function resolveProfile(key: ProfileKey) {
    setProfile(key);
    setMessages([
      { role: "assistant", text: `${profileGuidance[key].response} Te dejo una recomendación inicial basada en el catálogo vigente de nuestra base de datos, pero podemos seguir conversando: pregúntame por precios, diferencias, orden de uso o cualquier producto Sirena.` },
    ]);
    setAddedProducts([]);
    setStage("chat");
  }

  async function analyzeDescription() {
    if (!description.trim()) return;
    setAnalyzingText(true);
    const aiProfile = await analyzeDescriptionWithBrowserAI(description);
    resolveProfile(aiProfile ?? inferProfile(description));
    setAnalyzingText(false);
  }

  async function sendQuestion(question = chatInput) {
    const value = question.trim();
    if (!value || !profile || answering) return;
    const userMessage: ChatMessage = { role: "user", text: value };
    setMessages((current) => [...current, userMessage]);
    setChatInput("");
    setAnswering(true);
    const result = await answerProductQuestion(value, profile, messages.map((message) => message.text), { name, age: Number(age), sessionSlug }, products);
    if (result.sessionSlug && result.sessionSlug !== sessionSlug) {
      setSessionSlug(result.sessionSlug);
      updateSessionUrl(result.sessionSlug);
    }
    setMessages((current) => [...current, { role: "assistant", text: result.answer }]);
    setAnswering(false);
  }

  function addRecommendedProduct(productId: number) {
    addProduct(productId);
    setAddedProducts((current) => current.includes(productId) ? current : [...current, productId]);
    const product = products.find((item) => item.id === productId);
    if (product) setMessages((current) => [...current, { role: "assistant", text: `Agregué ${product.name} al carrito. Puedes seguir preguntándome sobre cómo usarlo o compararlo con otro producto.` }]);
  }

  return (
    <>
      <button className="mascot-launcher" type="button" aria-label="Abrir asesora Esentis" aria-describedby="mascot-callout" onClick={() => setOpen(true)}>
        <span className="mascot-bubble" id="mascot-callout" role="tooltip"><strong>¡Hola! 👋</strong> Haz clic y descubre tu rutina ideal</span>
        <img className="mascot-default" src="/mascot/mascot-default.png" alt="" />
        <img className="mascot-hover" src="/mascot/mascot-hover.png" alt="" />
      </button>

      {open && (
        <div className="assistant-overlay">
          <button className="assistant-dismiss-layer" type="button" aria-label="Cerrar asistente" onClick={() => setOpen(false)} />
          <section className="assistant-modal" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
            <header className="assistant-header">
              <div className="assistant-brand"><span><Sparkles size={18} /></span><div><strong id="assistant-title">Asesora Esentis</strong><small>IA local con base de conocimiento Sirena</small></div></div>
              <button type="button" aria-label="Cerrar asistente" onClick={() => setOpen(false)}><X size={21} /></button>
            </header>

            <div className="assistant-progress" aria-label={`Paso ${stage === "intro" ? 1 : stage === "skin" ? 2 : 3} de 3`}>
              <i className="done" /><i className={stage !== "intro" ? "done" : ""} /><i className={stage === "chat" ? "done" : ""} />
            </div>

            {stage === "intro" && (
              <div className="assistant-body intro-step">
                <div className="assistant-welcome">
                  <img src="/mascot/mascot-default.png" alt="Asesora Esentis" />
                  <div><span>¡Hola!</span><h2>Quiero conocer un poquito de ti</h2><p>Así podré personalizar esta conversación y recomendarte una rutina Esentis.</p></div>
                </div>
                <form onSubmit={submitIntro}>
                  <label>¿Cómo te llamas?<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Escribe tu nombre" required /></label>
                  <label>¿Qué edad tienes?<input value={age} onChange={(event) => setAge(event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="Ej. 28" inputMode="numeric" required /></label>
                  <p className="form-note">Usaremos estos datos solo durante esta demostración. Edad permitida: 13–99.</p>
                  <button className="assistant-primary" type="submit" disabled={creatingSession}>{creatingSession ? <><LoaderCircle className="spin" size={18} /> Creando sesión…</> : <>Comenzar <ArrowRight size={18} /></>}</button>
                </form>
              </div>
            )}

            {stage === "skin" && (
              <div className="assistant-body skin-step">
                <button className="assistant-back" type="button" onClick={() => setStage("intro")}><ArrowLeft size={17} /> Atrás</button>
                <div className="chat-message"><span>E</span><div><strong>Hola, {name} 👋</strong><p>¿Cómo describirías tu piel la mayor parte del día?</p></div></div>
                <div className="skin-options">
                  {options.map((option) => <button type="button" key={option.key} onClick={() => resolveProfile(option.key)}><strong>{option.label}</strong><span>{option.hint}</span></button>)}
                </div>
                <div className="describe-box">
                  <strong>¿No sabes tu tipo de piel?</strong>
                  <p>Descríbela con tus palabras. Ejemplos: “me brilla la nariz, pero mis mejillas se sienten secas” o “se me irrita con productos nuevos”.</p>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Cuéntame cómo se siente tu piel..." />
                  <button type="button" onClick={() => void analyzeDescription()} disabled={!description.trim() || analyzingText}><Sparkles size={17} /> {analyzingText ? "Analizando…" : "Analizar descripción"}</button>
                  <Link className="face-analysis-link" href={sessionSlug ? `/analisis-piel?sesion=${encodeURIComponent(sessionSlug)}` : "/analisis-piel"} onClick={() => setOpen(false)}><span>¿Prefieres que la cámara te oriente?</span><strong>Analizar mi rostro <ArrowRight size={16} /></strong></Link>
                </div>
                <div className="assistant-disclaimer"><CircleAlert size={18} /><span>La clasificación es una posibilidad orientativa, no un diagnóstico. Si presentas molestias persistentes, consulta a dermatología.</span></div>
              </div>
            )}

            {stage === "chat" && recommendation && profile && (
              <div className="assistant-body conversation-step">
                <div className="conversation-toolbar">
                  <button className="assistant-back" type="button" onClick={() => setStage("skin")}><ArrowLeft size={17} /> Cambiar perfil</button>
                  <span>Perfil probable: <strong>{recommendation.label}</strong></span>
                  <button className="probability-info" type="button" title="Es una posibilidad basada en tus respuestas. No reemplaza la evaluación de dermatología."><CircleAlert size={18} /></button>
                </div>

                <div className="conversation-feed" aria-live="polite" ref={conversationFeedRef}>
                  {messages.map((message, index) => (
                    <div className={`conversation-message ${message.role}`} key={`${message.role}-${index}`}>
                      {message.role === "assistant" && <span>E</span>}
                      <p>{message.text}</p>
                    </div>
                  ))}

                  <div className="conversation-recommendation">
                    <header><div><span>Recomendación inicial</span><strong>Rutina para {name}</strong></div><small>Sin compromiso de compra</small></header>
                    <div className="chat-product-list">
                      {recommendedProducts.map((product) => (
                        <article key={product.id}>
                          <img src={product.image} alt="" />
                          <div><span>{product.role}</span><strong>{product.name}</strong><b>{formatPrice(product.price)}</b></div>
                          <button type="button" onClick={() => addRecommendedProduct(product.id)} disabled={addedProducts.includes(product.id)} aria-label={`Agregar ${product.name} al carrito`}>
                            {addedProducts.includes(product.id) ? <Check size={15} /> : <ShoppingBag size={15} />}
                          </button>
                        </article>
                      ))}
                    </div>
                    <p>Haz prueba de parche y agrega un producto nuevo a la vez. Puedes preguntarme por cualquiera antes de decidir.</p>
                  </div>

                  {answering && <div className="conversation-message assistant thinking"><span>E</span><p><LoaderCircle size={16} /> Consultando el catálogo…</p></div>}
                </div>

                <div className="suggested-questions" aria-label="Preguntas sugeridas">
                  {["¿En qué orden los uso?", "¿Cuál ayuda con el brillo?", "¿Qué diferencia hay entre los contornos?"].map((question) => <button type="button" key={question} disabled={answering} onClick={() => void sendQuestion(question)}>{question}</button>)}
                </div>
                <form className="conversation-composer" onSubmit={(event) => { event.preventDefault(); void sendQuestion(); }}>
                  <label><span className="sr-only">Pregunta sobre productos Sirena</span><textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Pregunta sobre un producto, precio, uso o rutina…" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendQuestion(); } }} /></label>
                  <button type="submit" disabled={!chatInput.trim() || answering} aria-label="Enviar pregunta"><Send size={18} /></button>
                </form>
                <div className="conversation-scope"><ShieldCheck size={15} /> Solo responde sobre los productos cargados del catálogo Sirena. No inventa ingredientes ni disponibilidad.</div>
                {sessionSlug && <div className="conversation-session" title="Identificador de esta conversación">Sesión: <strong>{sessionSlug}</strong></div>}
                <div className="conversation-footer-links"><Link href="/esentis" onClick={() => setOpen(false)}>Ver catálogo</Link><Link href="/carrito" onClick={() => setOpen(false)}>Ir al carrito</Link></div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
