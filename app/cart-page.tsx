"use client";

import { Check, ChevronDown, LocateFixed, LoaderCircle, MapPin, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL as apiUrl } from "./api-url";
import { AssistantTriggerLink } from "./assistant-trigger-link";
import { formatPrice } from "./data";
import { HardLink } from "./hard-link";
import { useCart } from "./store-provider";

const mockAddresses = [
  "Av. Winston Churchill 95, Piantini, Santo Domingo",
  "Av. 27 de Febrero 312, Santo Domingo",
  "Calle El Conde 54, Zona Colonial, Santo Domingo",
  "Av. Charles de Gaulle 18, Santo Domingo Este",
];

export function CartPage() {
  const { items, subtotal, setQuantity, removeProduct, clearCart } = useCart();
  const [address, setAddress] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [delivery, setDelivery] = useState("delivery");
  const [payment, setPayment] = useState("card");
  const [completed, setCompleted] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [locationError, setLocationError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const deliveryFee = delivery === "delivery" && items.length ? 175 : 0;
  const hasDeliveryDestination = Boolean(address.trim() || currentLocation);

  useEffect(() => {
    if (address.trim().length < 3) {
      const clearTimer = window.setTimeout(() => setSuggestions([]), 0);
      return () => window.clearTimeout(clearTimer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${apiUrl}/api/maps/autocomplete?input=${encodeURIComponent(address.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error("maps unavailable");
        const results = await response.json() as Array<{ label: string }>;
        setSuggestions(results.map((result) => result.label));
      } catch {
        if (!controller.signal.aborted) setSuggestions(mockAddresses.filter((item) => item.toLowerCase().includes(address.toLowerCase())).slice(0, 4));
      }
    }, 320);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [address]);

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Tu navegador no permite obtener la ubicación actual.");
      return;
    }

    setLocationStatus("loading");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setAddress("");
        setShowSuggestions(false);
        setLocationStatus("ready");
      },
      (error) => {
        setCurrentLocation(null);
        setLocationStatus("error");
        setLocationError(error.code === error.PERMISSION_DENIED
          ? "Permite el acceso a tu ubicación o escribe una dirección."
          : "No pudimos detectar tu ubicación. Intenta nuevamente o escribe una dirección.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function submitOrder() {
    if (checkoutStatus === "loading") return;
    setCheckoutStatus("loading");
    setCheckoutError("");
    try {
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: "Cliente prototipo",
          deliveryMethod: delivery,
          deliveryAddress: delivery === "pickup" ? "Recogida en tienda Sirena" : address.trim() || "Ubicación actual confirmada",
          latitude: currentLocation?.latitude ?? null,
          longitude: currentLocation?.longitude ?? null,
          items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        }),
      });
      if (!response.ok) throw new Error("order failed");
      const result = await response.json() as { id: number };
      setOrderId(result.id);
      setCompleted(true);
      clearCart();
    } catch {
      setCheckoutStatus("error");
      setCheckoutError("No pudimos registrar el pedido. Verifica que la API y PostgreSQL estén activos e intenta nuevamente.");
    }
  }

  if (completed) {
    return <main className="cart-page"><div className="checkout-success"><span><Check size={31} /></span><h1>¡Pedido de demostración confirmado!</h1><p>Pedido #{orderId}. Se guardó en PostgreSQL, pero no se procesó ningún pago real.</p><HardLink href="/">Volver al inicio</HardLink></div></main>;
  }

  return (
    <main className="cart-page">
      <div className="breadcrumb"><HardLink href="/">Inicio</HardLink><span>/</span><strong>Mi carrito</strong></div>
      <div className="cart-page-heading"><div><span>Compra segura</span><h1>Mi carrito</h1></div>{items.length > 0 && <button type="button" onClick={clearCart}><Trash2 size={16} /> Vaciar carrito</button>}</div>
      {!items.length ? (
        <section className="empty-cart-page"><img src="/mascot/mascot-default.png" alt="Asesora Esentis" /><div><ShoppingBag size={34} /><h2>Tu carrito está vacío</h2><p>Descubre la línea Esentis o recibe una recomendación personalizada.</p><HardLink href="/esentis">Ver catálogo</HardLink><AssistantTriggerLink className="text-link" href="/esentis?asesor=1">Abrir asesora</AssistantTriggerLink></div></section>
      ) : (
        <div className="cart-checkout-layout">
          <section className="cart-lines" aria-label="Productos en el carrito">
            {items.map(({ product, quantity }) => (
              <article className="cart-page-line" key={product.id}>
                <img src={product.image} alt={product.name} />
                <div className="cart-line-info"><span>{product.role}</span><h2>{product.name}</h2><strong>{formatPrice(product.price)}</strong></div>
                <div className="quantity-control"><button type="button" onClick={() => setQuantity(product.id, quantity - 1)} aria-label="Disminuir"><Minus size={15} /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity(product.id, quantity + 1)} aria-label="Aumentar"><Plus size={15} /></button></div>
                <strong className="line-total">{formatPrice(product.price * quantity)}</strong>
                <button className="remove-line" type="button" onClick={() => removeProduct(product.id)} aria-label={`Eliminar ${product.name}`}><Trash2 size={18} /></button>
              </article>
            ))}
          </section>
          <aside className="checkout-panel">
            <h2>Resumen de compra</h2>
            <div className="delivery-tabs"><button className={delivery === "delivery" ? "active" : ""} onClick={() => setDelivery("delivery")} type="button">Recibir en casa</button><button className={delivery === "pickup" ? "active" : ""} onClick={() => setDelivery("pickup")} type="button">Recoger</button></div>
            {delivery === "delivery" && (
              <div className="address-widget">
                <div className="destination-required"><MapPin size={15} /><span>Selecciona una opción de entrega <b>*</b></span></div>
                <button className={`current-location-button ${currentLocation ? "selected" : ""}`} type="button" onClick={requestCurrentLocation} disabled={locationStatus === "loading"}>
                  {locationStatus === "loading" ? <LoaderCircle className="location-spinner" size={18} /> : currentLocation ? <Check size={18} /> : <LocateFixed size={18} />}
                  <span><strong>{currentLocation ? "Ubicación actual seleccionada" : "Usar mi ubicación actual"}</strong><small>{currentLocation ? "Lista para calcular la entrega" : "La mostraremos en Google Maps"}</small></span>
                </button>
                {currentLocation && (
                  <div className="google-location-preview">
                    <iframe
                      title="Ubicación de entrega en Google Maps"
                      src={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}&z=16&output=embed`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <span><MapPin size={14} /> Ubicación confirmada con Google Maps</span>
                  </div>
                )}
                {locationError && <p className="location-error" role="alert">{locationError}</p>}
                <div className="address-divider"><span>o escribe una dirección</span></div>
                <div className="address-input-wrap">
                  <label>Dirección de entrega<input value={address} onFocus={() => setShowSuggestions(true)} onChange={(event) => { setAddress(event.target.value); setCurrentLocation(null); setLocationStatus("idle"); setShowSuggestions(true); }} placeholder="Comienza a escribir tu dirección" /></label>
                  {showSuggestions && address && <div className="address-suggestions">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setAddress(suggestion); setShowSuggestions(false); }}>{suggestion}</button>)}</div>}
                </div>
                <small>Debes usar tu ubicación actual o completar una dirección.</small>
              </div>
            )}
            <label className="payment-select">Método de pago<select value={payment} onChange={(event) => setPayment(event.target.value)}><option value="card">Tarjeta de crédito o débito</option><option value="cash">Pago contra entrega</option></select><ChevronDown size={17} /></label>
            <div className="checkout-totals"><div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div><span>Entrega</span><strong>{deliveryFee ? formatPrice(deliveryFee) : "Gratis"}</strong></div><div className="grand-total"><span>Total</span><strong>{formatPrice(subtotal + deliveryFee)}</strong></div></div>
            {checkoutError && <p className="checkout-api-error" role="alert">{checkoutError}</p>}
            <button className="checkout-button" type="button" disabled={checkoutStatus === "loading" || (delivery === "delivery" && !hasDeliveryDestination)} onClick={() => void submitOrder()}>{checkoutStatus === "loading" ? "Registrando pedido…" : "Finalizar compra de prueba"}</button>
            <p>Este prototipo no recopila ni procesa información de pago real.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
