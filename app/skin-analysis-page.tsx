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
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, products } from "./data";
import { useCart } from "./store-provider";

type Stage = "intro" | "capture" | "analyzing" | "report";
type ReportTab = "skin" | "color" | "products";
type SkinType = "seca" | "grasa" | "mixta" | "sensible" | "normal";
type MetricKey = "uniformity" | "texture" | "shine" | "redness" | "blemishes" | "pores" | "underEyes" | "hydration";

type SkinMetric = { label: string; score: number; observation: string; tip: string };
type SkinReport = {
  overall: number;
  skinType: SkinType;
  confidence: number;
  metrics: Record<MetricKey, SkinMetric>;
  undertone: "cálido" | "frío" | "neutro";
  season: string;
  palette: string[];
  photo: string;
  lightingNote: string;
};

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

const skinProductIds: Record<SkinType, number[]> = {
  seca: [1, 6, 7],
  grasa: [1, 2, 8],
  mixta: [1, 2, 7],
  sensible: [1, 7, 6],
  normal: [1, 6, 5],
};

const metricOrder: MetricKey[] = ["uniformity", "texture", "shine", "redness", "blemishes", "pores", "underEyes", "hydration"];
const clamp = (value: number, min = 38, max = 98) => Math.round(Math.min(max, Math.max(min, value)));

function statusFor(score: number) {
  if (score >= 85) return "Muy bien";
  if (score >= 70) return "En balance";
  if (score >= 55) return "A reforzar";
  return "Atención cosmética";
}

function paletteFor(undertone: SkinReport["undertone"], light: boolean) {
  if (undertone === "cálido") return light
    ? ["#F2B59A", "#EF8C74", "#D97762", "#F0C46B", "#9F6A40"]
    : ["#C66B50", "#A84A3D", "#C98A45", "#75512F", "#8B3F35"];
  if (undertone === "frío") return light
    ? ["#E2A7B7", "#C97B9B", "#AA6E9B", "#7487B6", "#934F71"]
    : ["#9D3F63", "#733252", "#61558D", "#2F607D", "#B05578"];
  return ["#D9A18D", "#BD7E75", "#A87E69", "#8C6B73", "#D7B17A"];
}

function analyzePixels(canvas: HTMLCanvasElement, landmarks: Array<{ x: number; y: number }>, photo: string): SkinReport {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo leer la imagen.");

  const xs = landmarks.map((point) => point.x * canvas.width);
  const ys = landmarks.map((point) => point.y * canvas.height);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(canvas.width, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(canvas.height, Math.ceil(Math.max(...ys)));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const pixels = ctx.getImageData(minX, minY, width, height).data;

  let count = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let luma = 0;
  let lumaSquared = 0;
  let redDominance = 0;
  let highlights = 0;
  let chromaSpread = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const nx = (x - width / 2) / (width / 2);
      const ny = (y - height * .49) / (height * .49);
      if (nx * nx + ny * ny > 0.82) continue;
      if (ny < -.6 || (Math.abs(nx) < .18 && ny > -.15 && ny < .55)) continue;
      const index = (y * width + x) * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const lum = r * .299 + g * .587 + b * .114;
      if (lum < 35 || lum > 248) continue;
      count += 1;
      red += r;
      green += g;
      blue += b;
      luma += lum;
      lumaSquared += lum * lum;
      redDominance += Math.max(0, r - (g + b) / 2);
      chromaSpread += Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 214 && Math.max(r, g, b) - Math.min(r, g, b) < 30) highlights += 1;
    }
  }

  if (count < 80) throw new Error("La iluminación no permite analizar el rostro. Intenta nuevamente de frente a una ventana.");
  const avgR = red / count;
  const avgG = green / count;
  const avgB = blue / count;
  const avgLuma = luma / count;
  const lumaDeviation = Math.sqrt(Math.max(0, lumaSquared / count - avgLuma * avgLuma));
  const rednessSignal = redDominance / count;
  const highlightRatio = highlights / count;
  const avgChroma = chromaSpread / count;

  const texture = clamp(98 - lumaDeviation * .72);
  const shine = clamp(96 - highlightRatio * 260);
  const redness = clamp(97 - Math.max(0, rednessSignal - 7) * 2.35);
  const uniformity = clamp(97 - lumaDeviation * .58 - avgChroma * .07);
  const pores = clamp(texture * .68 + uniformity * .32 - 2);
  const hydration = clamp(texture * .48 + shine * .32 + uniformity * .2);
  const blemishes = clamp(redness * .45 + uniformity * .55);
  const underEyes = clamp(uniformity - Math.max(0, 145 - avgLuma) * .08 + 3);

  let skinType: SkinType = "normal";
  if (redness < 62) skinType = "sensible";
  else if (shine < 65 && hydration >= 66) skinType = "grasa";
  else if (shine < 74 && hydration < 72) skinType = "mixta";
  else if (hydration < 64) skinType = "seca";

  const warmSignal = avgR - avgB;
  const undertone: SkinReport["undertone"] = warmSignal > 42 && avgG > avgB + 8 ? "cálido" : warmSignal < 27 ? "frío" : "neutro";
  const light = avgLuma >= 145;
  const season = undertone === "cálido" ? (light ? "Primavera cálida" : "Otoño cálido") : undertone === "frío" ? (light ? "Verano frío" : "Invierno frío") : "Neutra versátil";
  const values = [uniformity, texture, shine, redness, blemishes, pores, underEyes, hydration];
  const overall = clamp(values.reduce((sum, value) => sum + value, 0) / values.length);
  const lightingNote = avgLuma < 85 ? "La foto está algo oscura; la colorimetría tiene menor certeza." : avgLuma > 220 ? "La foto tiene mucha luz; la colorimetría tiene menor certeza." : "La iluminación es suficiente para una estimación cosmética.";

  return {
    overall,
    skinType,
    confidence: clamp(91 - Math.abs(148 - avgLuma) * .18, 54, 92),
    undertone,
    season,
    palette: paletteFor(undertone, light),
    photo,
    lightingNote,
    metrics: {
      uniformity: { label: "Uniformidad", score: uniformity, observation: "Distribución visual del tono en las zonas visibles.", tip: "Usa protector solar diariamente y evita exfoliar en exceso." },
      texture: { label: "Textura", score: texture, observation: "Variación superficial visible con esta luz.", tip: "Una limpieza suave y humectación constante ayudan a mantener la barrera." },
      shine: { label: "Control de brillo", score: shine, observation: "Reflejos visibles en la superficie de la piel.", tip: "Prefiere capas ligeras y productos no comedogénicos si el brillo te incomoda." },
      redness: { label: "Rojeces visibles", score: redness, observation: "Contraste rojizo visible; no identifica una causa médica.", tip: "Introduce productos nuevos de uno en uno y realiza una prueba de parche." },
      blemishes: { label: "Imperfecciones", score: blemishes, observation: "Variaciones visibles de color y textura.", tip: "No manipules las zonas y mantén una rutina simple y constante." },
      pores: { label: "Apariencia de poros", score: pores, observation: "Estimación óptica; la cámara no mide el tamaño real del poro.", tip: "Limpia suavemente y evita productos abrasivos." },
      underEyes: { label: "Ojeras visibles", score: underEyes, observation: "Contraste visual bajo los ojos con la iluminación actual.", tip: "Descanso, hidratación y un corrector de subtono adecuado pueden mejorar su apariencia." },
      hydration: { label: "Apariencia de hidratación", score: hydration, observation: "Estimación basada en textura y reflejo superficial.", tip: "Aplica hidratante sobre la piel ligeramente húmeda y sella con protector solar." },
    },
  };
}

function FaceGuide() {
  return <div className="face-guide" aria-hidden="true"><i className="guide-face" /><i className="guide-eye left" /><i className="guide-eye right" /><i className="guide-nose" /><i className="guide-mouth" /></div>;
}

export function SkinAnalysisPage() {
  const { addProduct } = useCart();
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

  const recommendations = useMemo(() => {
    if (!report) return [];
    const ids = [...skinProductIds[report.skinType], 9, 10, 11, 12, 13];
    return ids.map((id) => products.find((product) => product.id === id)).filter(Boolean);
  }, [report]);

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
      const nextReport = analyzePixels(canvas, detection.faceLandmarks[0], photo);
      setReport(nextReport);
      setSelected([...skinProductIds[nextReport.skinType], 9, 10, 11]);
      setAdded(false);
      setTab(window.location.hash === "#colorimetria" ? "color" : "skin");
      setStage("report");
      const sessionSlug = new URLSearchParams(window.location.search).get("sesion");
      void fetch(`${API_URL}/api/skin-analyses`, {
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
              <div><ShieldCheck /><strong>Procesamiento local</strong><span>Tu foto no se guarda ni se envía.</span></div>
              <div><ShoppingBag /><strong>Rutina sugerida</strong><span>Selecciona productos y agrégalos al carrito.</span></div>
            </div>
            <label className="analysis-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span><strong>Acepto el análisis cosmético de esta foto.</strong> Entiendo que es una estimación orientativa, no identifica quién soy y no sustituye dermatología.</span>
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
              <p className="privacy-note"><ShieldCheck size={17} /> La imagen se procesa en este dispositivo y se descarta al salir o reiniciar.</p>
            </aside>
          </div>
        </section>
      )}

      {stage === "analyzing" && (
        <section className="analyzing-stage" aria-live="polite">
          <div className="analysis-scan-visual"><ImagePlus size={60} /><FaceGuide /><i /></div>
          <LoaderCircle className="analysis-loader" size={30} />
          <h1>Analizando señales visuales</h1>
          <p>Revisando calidad, zonas del rostro, apariencia de textura y tono…</p>
          <small>No cerramos conclusiones médicas ni identificamos a la persona.</small>
        </section>
      )}

      {stage === "report" && report && (
        <section className="report-stage">
          <header className="report-header">
            <button type="button" onClick={restart}><ArrowLeft size={18} /> Nuevo análisis</button>
            <img src="/brand/sirena-logo.webp" alt="Sirena" />
            <span>Beauty Scan <small>Prototipo</small></span>
          </header>
          <nav className="report-tabs" aria-label="Secciones del resultado">
            <button className={tab === "skin" ? "active" : ""} onClick={() => setTab("skin")}>Informe de piel</button>
            <button id="colorimetria" className={tab === "color" ? "active" : ""} onClick={() => setTab("color")}>Colorimetría</button>
            <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Recomendación</button>
          </nav>

          {tab === "skin" && (
            <div className="skin-report-content">
              <div className="report-top-card">
                <div className="report-hero">
                  <div className="report-photo"><img src={report.photo} alt="Foto utilizada para el análisis cosmético" /><FaceGuide /></div>
                  <div className="report-overview">
                    <span>Tu informe visual</span>
                    <h1>Puntuación de la piel <strong>{report.overall}</strong><small>/100</small></h1>
                    <div className="overall-bar"><i style={{ width: `${report.overall}%` }} /></div>
                    <p>Tu piel se percibe <b>{report.skinType}</b> en esta foto. Confianza estimada: {report.confidence}%.</p>
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
              <div className="analysis-cart-bar"><div><span>{selected.length} productos seleccionados</span><strong>{formatPrice(products.filter((product) => selected.includes(product.id)).reduce((sum, product) => sum + product.price, 0))}</strong></div>{added ? <Link href="/carrito"><ShoppingBag size={18} /> Ir al carrito</Link> : <button type="button" disabled={!selected.length} onClick={addSelection}>Agregar selección al carrito</button>}</div>
              <button className="restart-link" type="button" onClick={restart}><RefreshCw size={16} /> Repetir análisis</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
