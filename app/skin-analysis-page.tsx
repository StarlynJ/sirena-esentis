"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Droplets,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Upload,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "./api-url";
import { formatPrice, type Product } from "./data";
import { HardLink } from "./hard-link";
import { useCart } from "./store-provider";

type Stage = "intro" | "capture" | "analyzing" | "report";
type ReportTab = "skin" | "color" | "products";
type SkinType = "seca" | "grasa" | "mixta" | "sensible" | "normal";
type MetricKey = "uniformity" | "texture" | "shine" | "redness" | "blemishes" | "pores" | "underEyes" | "hydration";

type SkinMetric = { label: string; score: number; observation: string; tip: string };
type SkinReport = {
  source: "ai" | "fallback";
  overall: number;
  skinType: SkinType;
  confidence: number;
  metrics: Record<MetricKey, SkinMetric>;
  undertone: "cálido" | "frío" | "neutro";
  season: string;
  palette: string[];
  photo: string;
  lightingNote: string;
  rationale: string;
};

type AiVisionMetric = { score: number; cannotAssess: boolean; observation: string; tip: string };
type AiVisionResponse = {
  quality: { usable: boolean; confidence: number; issues: string[] };
  skinProfile: { probableType: SkinType; confidence: number; rationale: string };
  overallScore: number;
  metrics: Record<"uniformity" | "texture" | "shine" | "visibleRedness" | "visibleBlemishes" | "poreAppearance" | "underEyeDarkness" | "hydrationAppearance", AiVisionMetric>;
  colorimetry: { undertone: string; season: string; confidence: number; cannotAssess: boolean; paletteHex: string[] };
  safetyNote: string;
};

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const metricOrder: MetricKey[] = ["uniformity", "texture", "shine", "redness", "blemishes", "pores", "underEyes", "hydration"];

function statusFor(score: number) {
  if (score >= 85) return "Muy bien";
  if (score >= 70) return "En balance";
  if (score >= 55) return "A reforzar";
  return "Atención cosmética";
}

async function analyzePhotoWithAI(photo: string): Promise<SkinReport> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${API_URL}/api/skin-analysis/vision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl: photo }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { detail?: string } | null;
      throw new Error(problem?.detail || "No pudimos completar el análisis visual con IA.");
    }
    const ai = await response.json() as AiVisionResponse;
    if (!ai.quality.usable) throw new Error(ai.quality.issues[0] || "La foto no permite una evaluación confiable. Intenta con el rostro frontal y mejor iluminación.");
    const metric = (source: AiVisionMetric, label: string): SkinMetric => ({ label, score: source.score, observation: source.cannotAssess ? "Esta zona no pudo evaluarse con suficiente confianza." : source.observation, tip: source.tip });
    const undertone = ai.colorimetry.undertone === "cálido" || ai.colorimetry.undertone === "frío" ? ai.colorimetry.undertone : "neutro";
    return {
      source: "ai",
      overall: ai.overallScore,
      skinType: ai.skinProfile.probableType,
      confidence: Math.round(ai.skinProfile.confidence * 100),
      undertone,
      season: ai.colorimetry.cannotAssess ? "Colorimetría por confirmar" : ai.colorimetry.season,
      palette: ai.colorimetry.paletteHex,
      photo,
      rationale: ai.skinProfile.rationale,
      lightingNote: ai.quality.issues.length ? ai.quality.issues.join(" ") : "Informe generado por IA multimodal a partir de esta fotografía.",
      metrics: {
        uniformity: metric(ai.metrics.uniformity, "Uniformidad"),
        texture: metric(ai.metrics.texture, "Textura"),
        shine: metric(ai.metrics.shine, "Control de brillo"),
        redness: metric(ai.metrics.visibleRedness, "Rojeces visibles"),
        blemishes: metric(ai.metrics.visibleBlemishes, "Imperfecciones"),
        pores: metric(ai.metrics.poreAppearance, "Apariencia de poros"),
        underEyes: metric(ai.metrics.underEyeDarkness, "Ojeras visibles"),
        hydration: metric(ai.metrics.hydrationAppearance, "Apariencia de hidratación"),
      },
    };
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw new Error("El análisis con IA superó los 4 segundos.");
    throw cause;
  } finally {
    window.clearTimeout(timeout);
  }
}

function createFallbackSkinReport(photo: string): SkinReport {
  const metric = (label: string, score: number, observation: string, tip: string): SkinMetric => ({ label, score, observation, tip });
  return {
    source: "fallback",
    overall: 76,
    skinType: "mixta",
    confidence: 0,
    undertone: "neutro",
    season: "Paleta neutra provisional",
    palette: ["#C98F78", "#E7B5A5", "#A45D6F", "#C78691", "#8A5A67"],
    photo,
    rationale: "Este perfil es un ejemplo de respaldo y no fue calculado a partir de la imagen.",
    lightingNote: "La IA no respondió dentro de 4 segundos. Mostramos datos de demostración para que puedas probar el flujo completo.",
    metrics: {
      uniformity: metric("Uniformidad", 78, "Dato de demostración: apariencia generalmente uniforme.", "Mantén una rutina sencilla y protección solar diaria."),
      texture: metric("Textura", 74, "Dato de demostración: textura visible moderada.", "Evita incorporar varios activos nuevos al mismo tiempo."),
      shine: metric("Control de brillo", 68, "Dato de demostración: posible brillo en zona T.", "Usa limpieza suave y evita resecar en exceso."),
      redness: metric("Rojeces visibles", 82, "Dato de demostración: pocas rojeces visibles.", "Haz prueba de parche con cada producto nuevo."),
      blemishes: metric("Imperfecciones", 72, "Dato de demostración: algunas imperfecciones cosméticas.", "No manipules lesiones y consulta dermatología si persisten."),
      pores: metric("Apariencia de poros", 70, "Dato de demostración: poros de apariencia moderada.", "La limpieza suave y la hidratación ayudan a mantener el equilibrio."),
      underEyes: metric("Ojeras visibles", 75, "Dato de demostración: tono ligeramente desigual bajo los ojos.", "Descansa y aplica productos del contorno sin frotar."),
      hydration: metric("Apariencia de hidratación", 73, "Dato de demostración: hidratación cosmética media.", "Aplica hidratante sobre la piel ligeramente húmeda."),
    },
  };
}

function FaceGuide() {
  return <div className="face-guide" aria-hidden="true"><i className="guide-face" /><i className="guide-eye left" /><i className="guide-eye right" /><i className="guide-nose" /><i className="guide-mouth" /></div>;
}

function recommendationsFor(products: Product[], skinType: SkinType) {
  const esentis = products
    .filter((product) => product.collection === "esentis" && product.suitableFor.includes(skinType))
    .sort((first, second) => Number(/facial|sérum|contorno|solar|brillo/i.test(second.role)) - Number(/facial|sérum|contorno|solar|brillo/i.test(first.role)))
    .slice(0, 4);
  return [...esentis, ...products.filter((product) => product.collection === "makeup")];
}

export function SkinAnalysisPage() {
  const { addProduct, products } = useCart();
  const [stage, setStage] = useState<Stage>("intro");
  const [tab, setTab] = useState<ReportTab>(() => typeof window !== "undefined" && window.location.hash === "#colorimetria" ? "color" : "skin");
  const [consent, setConsent] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<SkinReport | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [added, setAdded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const recommendations = useMemo(() => report ? recommendationsFor(products, report.skinType) : [], [products, report]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function startCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no permite usar la cámara. Puedes subir una foto.");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError("No pudimos acceder a la cámara. Revisa el permiso del navegador o sube una foto.");
    }
  }

  async function processCanvas(canvas: HTMLCanvasElement) {
    setError("");
    setStage("analyzing");
    stopCamera();
    try {
      const photo = canvas.toDataURL("image/jpeg", .9);
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const detectorOptions = {
        runningMode: "IMAGE" as const,
        numFaces: 1,
        minFaceDetectionConfidence: .55,
        minFacePresenceConfidence: .55,
      };
      let detector;
      try {
        detector = await FaceLandmarker.createFromOptions(vision, { ...detectorOptions, baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" } });
      } catch {
        detector = await FaceLandmarker.createFromOptions(vision, { ...detectorOptions, baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" } });
      }
      const detection = detector.detect(canvas);
      detector.close();
      if (!detection.faceLandmarks.length) throw new Error("No detectamos un rostro completo. Mira de frente, retira obstáculos y prueba otra vez.");
      let nextReport: SkinReport;
      try {
        nextReport = await analyzePhotoWithAI(photo);
      } catch {
        nextReport = createFallbackSkinReport(photo);
      }
      setReport(nextReport);
      setSelected(recommendationsFor(products, nextReport.skinType).slice(0, 7).map((product) => product.id));
      setAdded(false);
      setTab(window.location.hash === "#colorimetria" ? "color" : "skin");
      setStage("report");
      const sessionSlug = new URLSearchParams(window.location.search).get("sesion");
      if (nextReport.source === "ai") void fetch(`${API_URL}/api/skin-analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionSlug,
          overallScore: nextReport.overall,
          skinType: nextReport.skinType,
          confidence: nextReport.confidence,
          metrics: Object.fromEntries(Object.entries(nextReport.metrics).map(([key, metric]) => [key, metric.score])),
          colorimetry: { undertone: nextReport.undertone, season: nextReport.season, palette: nextReport.palette },
        }),
      }).catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos completar el análisis. Intenta con otra foto.");
      setStage("capture");
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    ctx.restore();
    await processCanvas(canvas);
  }

  function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen válida.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = 720;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        void processCanvas(canvas);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function restart() {
    stopCamera();
    setReport(null);
    setSelected([]);
    setError("");
    setStage("capture");
  }

  function addSelection() {
    selected.forEach((id) => addProduct(id));
    setAdded(true);
  }

  return (
    <main className="skin-analysis-page">
      <canvas ref={canvasRef} className="analysis-source-canvas" aria-hidden="true" />

      {stage === "intro" && (
        <section className="analysis-intro">
          <div className="analysis-intro-copy">
            <span className="analysis-kicker"><Sparkles size={16} /> Sirena Beauty Scan</span>
            <h1>Conoce la apariencia de tu piel en minutos</h1>
            <p>Una experiencia visual inspirada en las estaciones de belleza Sirena para orientarte sobre textura, brillo, poros, rojeces visibles, ojeras y colorimetría.</p>
            <div className="analysis-benefits">
              <div><Camera /><strong>Cámara o foto</strong><span>Elige cómo quieres analizarte.</span></div>
              <div><ShieldCheck /><strong>Procesamiento protegido</strong><span>La foto se envía temporalmente a la IA y no se guarda en nuestra base.</span></div>
              <div><ShoppingBag /><strong>Rutina sugerida</strong><span>Selecciona productos y agrégalos al carrito.</span></div>
            </div>
            <label className="analysis-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span><strong>Acepto el análisis cosmético con IA de esta foto.</strong> Entiendo que se procesa temporalmente, no se usa para identificarme y no sustituye dermatología.</span>
            </label>
            <button className="analysis-primary" type="button" disabled={!consent} onClick={() => setStage("capture")}>Comenzar análisis <ChevronRight size={19} /></button>
            <small>Recomendado para mayores de 13 años con autorización de su tutor cuando corresponda.</small>
          </div>
          <div className="analysis-intro-visual" aria-hidden="true">
            <div className="analysis-device"><img src="/mascot/mascot-hover.png" alt="" /><FaceGuide /><span>Coloca tu rostro dentro de la guía</span></div>
            <i className="intro-score">80<small>Piel</small></i>
            <i className="intro-metric">92<small>Textura</small></i>
          </div>
        </section>
      )}

      {stage === "capture" && (
        <section className="capture-stage">
          <header className="analysis-stage-header">
            <button type="button" onClick={() => { stopCamera(); setStage("intro"); }}><ArrowLeft size={19} /> Volver</button>
            <div><span>Paso 1 de 2</span><h1>Escanea tu piel</h1></div>
            <img src="/brand/sirena-logo.webp" alt="Sirena" />
          </header>
          <div className="capture-layout">
            <div className={`camera-frame ${cameraActive ? "active" : ""}`}>
              <video ref={videoRef} playsInline muted aria-label="Vista previa de tu cámara" />
              {!cameraActive && <div className="camera-placeholder"><Camera size={48} /><strong>Activa la cámara</strong><span>Busca luz natural, limpia el lente y mira de frente.</span></div>}
              <FaceGuide />
              {cameraActive && <span className="camera-ready"><i /> Rostro listo para capturar</span>}
            </div>
            <aside className="capture-instructions">
              <span className="analysis-kicker">Preparación</span>
              <h2>Para una mejor estimación</h2>
              <ol><li><b>1</b><span><strong>Luz uniforme</strong>Evita contraluz y luces de colores.</span></li><li><b>2</b><span><strong>Rostro visible</strong>Retira lentes, cabello y accesorios del área.</span></li><li><b>3</b><span><strong>Sin filtros</strong>Si puedes, usa la piel limpia y sin maquillaje.</span></li></ol>
              <div className="capture-actions">
                {!cameraActive ? <button type="button" onClick={startCamera}><Camera size={18} /> Activar cámara</button> : <button type="button" onClick={capturePhoto}><Sparkles size={18} /> Analizar ahora</button>}
                <label><Upload size={18} /> Subir una foto<input type="file" accept="image/*" capture="user" onChange={uploadPhoto} /></label>
              </div>
              {error && <p className="analysis-error" role="alert"><CircleAlert size={17} /> {error}</p>}
              <p className="privacy-note"><ShieldCheck size={17} /> La imagen se envía cifrada al proveedor de IA para este análisis y no se almacena en nuestra base de datos.</p>
            </aside>
          </div>
        </section>
      )}

      {stage === "analyzing" && (
        <section className="analyzing-stage" aria-live="polite">
          <div className="analysis-scan-visual"><ImagePlus size={60} /><FaceGuide /><i /></div>
          <LoaderCircle className="analysis-loader" size={30} />
          <h1>Analizando señales visuales</h1>
          <p>La IA está revisando calidad, zonas del rostro, apariencia de textura y tono…</p>
          <small>Si tarda más de 4 segundos, continuaremos con un informe de demostración claramente identificado.</small>
          <small>No cerramos conclusiones médicas ni identificamos a la persona.</small>
        </section>
      )}

      {stage === "report" && report && (
        <section className="report-stage">
          <header className="report-header">
            <button type="button" onClick={restart}><ArrowLeft size={18} /> Nuevo análisis</button>
            <img src="/brand/sirena-logo.webp" alt="Sirena" />
            <span>Beauty Scan <small>IA multimodal</small></span>
          </header>
          <nav className="report-tabs" aria-label="Secciones del resultado">
            <button className={tab === "skin" ? "active" : ""} onClick={() => setTab("skin")}>Informe de piel</button>
            <button id="colorimetria" className={tab === "color" ? "active" : ""} onClick={() => setTab("color")}>Colorimetría</button>
            <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Recomendación</button>
          </nav>

          {report.source === "fallback" && <div className="analysis-fallback-banner" role="status"><CircleAlert size={19} /><div><strong>Resultado provisional de demostración</strong><span>La IA falló o superó los 4 segundos. Estos valores son datos de respaldo, no fueron calculados desde tu rostro y no constituyen un diagnóstico.</span></div></div>}

          {tab === "skin" && (
            <div className="skin-report-content">
              <div className="report-top-card">
                <div className="report-hero">
                  <div className="report-photo"><img src={report.photo} alt="Foto utilizada para el análisis cosmético" /><FaceGuide /></div>
                  <div className="report-overview">
                    <span>Tu informe visual</span>
                    <h1>Puntuación de la piel <strong>{report.overall}</strong><small>/100</small></h1>
                    <div className="overall-bar"><i style={{ width: `${report.overall}%` }} /></div>
                    <p>{report.source === "ai" ? <>Tu piel se percibe <b>{report.skinType}</b> en esta foto. Confianza estimada por IA: {report.confidence}%.</> : <>Perfil de demostración: <b>{report.skinType}</b>. No se calculó confianza sobre la fotografía.</>}</p>
                    <p className="ai-rationale">{report.rationale}</p>
                    <small>{report.lightingNote}</small>
                  </div>
                </div>
                <div className="metric-ribbon">
                  {metricOrder.slice(0, 6).map((key) => <button key={key} onClick={() => document.getElementById(`metric-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}><i style={{ "--score": `${report.metrics[key].score * 3.6}deg` } as React.CSSProperties}>{report.metrics[key].score}</i><span>{report.metrics[key].label}</span></button>)}
                </div>
              </div>
              <div className="report-summary"><Droplets size={25} /><div><strong>Resumen orientativo</strong><p>Tu puntuación combina señales visibles en esta foto. Empieza por una rutina simple, cambia un producto a la vez y observa cómo responde tu piel.</p></div></div>
              <div className="metrics-grid">
                {metricOrder.map((key) => {
                  const metric = report.metrics[key];
                  return <article id={`metric-${key}`} key={key}><header><div><span>{metric.label}</span><strong>{statusFor(metric.score)}</strong></div><i>{metric.score}</i></header><div className="metric-bar"><i style={{ width: `${metric.score}%` }} /></div><p>{metric.observation}</p><small>{metric.tip}</small></article>;
                })}
              </div>
              <div className="medical-warning"><CircleAlert size={19} /><span>Este reporte analiza apariencia cosmética visible, no enfermedades. Si notas dolor, inflamación, lesión, sangrado o cambios persistentes, consulta dermatología.</span></div>
              <button className="analysis-primary report-next" type="button" onClick={() => setTab("color")}>Ver mi colorimetría <ChevronRight size={18} /></button>
            </div>
          )}

          {tab === "color" && (
            <div className="color-report-content">
              <div className="color-heading"><span className="analysis-kicker">Tu armonía de color</span><h1>{report.season}</h1><p>Subtono probable: <strong>{report.undertone}</strong>. Es una guía de combinación, no una clasificación de identidad o etnia.</p></div>
              <div className="color-layout">
                <div className="color-photo"><img src={report.photo} alt="Referencia para colorimetría" /><div className="color-swatches">{report.palette.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</div></div>
                <div className="color-advice">
                  <h2>Tonos que pueden armonizar</h2>
                  <p>{report.undertone === "cálido" ? "Busca bases de subtono dorado o melocotón, rubores coral y labiales terracota." : report.undertone === "frío" ? "Prueba bases de subtono rosado o neutro, rubores malva y labiales frutos rojos." : "Los subtonos neutros suelen combinar bien con rosas suaves, nude equilibrados y rojos clásicos."}</p>
                  <div className="color-categories"><span>Base y polvo</span><span>Corrector</span><span>Rubor</span><span>Labial</span><span>Prebase</span></div>
                  <small><CircleAlert size={15} /> La luz ambiental cambia el resultado. Confirma el tono de base probándolo en la mandíbula.</small>
                  <button className="analysis-primary" type="button" onClick={() => setTab("products")}>Ver maquillaje recomendado <ChevronRight size={18} /></button>
                </div>
              </div>
            </div>
          )}

          {tab === "products" && (
            <div className="recommendation-content">
              <div className="recommendation-heading"><span className="analysis-kicker">Selección personalizada</span><h1>Productos para tu rutina</h1><p>Combinamos cuidado Esentis y categorías reales del catálogo de belleza Sirena. Elige solo lo que quieras llevar.</p></div>
              <div className="analysis-product-grid">
                {recommendations.map((product) => product && (
                  <label className={selected.includes(product.id) ? "selected" : ""} key={product.id}>
                    <input type="checkbox" checked={selected.includes(product.id)} onChange={() => { setAdded(false); setSelected((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]); }} />
                    <span className="product-selection-check"><Check size={14} /></span>
                    <span className={`collection-label ${product.collection}`}>{product.collection === "makeup" ? "Belleza Sirena" : "Esentis"}</span>
                    <img src={product.image} alt={product.name} />
                    <div><span>{product.role}</span><strong>{product.name}</strong><b>{formatPrice(product.price)}</b>{product.sourceUrl && <a href={product.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Ver en Sirena.do</a>}</div>
                  </label>
                ))}
              </div>
              <div className="analysis-cart-bar"><div><span>{selected.length} productos seleccionados</span><strong>{formatPrice(products.filter((product) => selected.includes(product.id)).reduce((sum, product) => sum + product.price, 0))}</strong></div>{added ? <HardLink href="/carrito"><ShoppingBag size={18} /> Ir al carrito</HardLink> : <button type="button" disabled={!selected.length} onClick={addSelection}>Agregar selección al carrito</button>}</div>
              <button className="restart-link" type="button" onClick={restart}><RefreshCw size={16} /> Repetir análisis</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
