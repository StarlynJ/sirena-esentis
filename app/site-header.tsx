"use client";

import { ChevronDown, ClipboardList, Heart, MapPin, Menu, Search, ShoppingCart, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./store-provider";

const navItems = ["Supermercado", "Belleza", "Hogar", "Bebés", "Electrodomésticos", "Escolares"];

function HeaderAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <button className="header-action" type="button">{icon}<span>{label}</span></button>;
}

export function SiteHeader() {
  const { totalCount } = useCart();
  const [addressOpen, setAddressOpen] = useState(true);
  const [esentisOpen, setEsentisOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-main">
        <Link className="official-logo" href="/" aria-label="Sirena inicio"><img src="/brand/sirena-logo.webp" alt="Sirena" /></Link>
        <button className="coverage-trigger" type="button" onClick={() => setAddressOpen(true)}>Verifica cobertura <strong>aquí</strong></button>
        <label className="sirena-search">
          <span className="sr-only">Buscar en Sirena</span>
          <input placeholder="Buscar en Sirena" />
          <button type="button" aria-label="Buscar productos"><Search size={22} strokeWidth={2.2} /></button>
        </label>
        <div className="header-actions">
          <HeaderAction icon={<ClipboardList size={23} />} label="Pedidos" />
          <HeaderAction icon={<UserRound size={23} />} label="Cuenta" />
          <HeaderAction icon={<Heart size={24} />} label="Favoritos" />
          <Link className="header-action cart-action" href="/carrito">
            <ShoppingCart size={23} /><span>Carrito</span>{totalCount > 0 && <b>{totalCount}</b>}
          </Link>
        </div>
      </div>
      <nav className="desktop-nav" aria-label="Navegación principal">
        <button className="menu-link" type="button"><Menu size={23} /><strong>Menú</strong></button>
        {navItems.map((item) => <Link href={`/?categoria=${encodeURIComponent(item)}`} key={item}>{item}</Link>)}
        <div className="esentis-nav">
          <button type="button" onClick={() => setEsentisOpen((value) => !value)} aria-expanded={esentisOpen}>
            ESENTIS <ChevronDown size={14} />
          </button>
          {esentisOpen && (
            <div className="esentis-dropdown">
              <Link href="/esentis">Ver catálogo Esentis</Link>
              <Link href="/esentis?asesor=1">Descubrir mi rutina</Link>
              <Link href="/analisis-piel">Análisis facial y colorimetría</Link>
            </div>
          )}
        </div>
      </nav>
      {addressOpen && (
        <div className="address-popover">
          <MapPin size={31} />
          <div><span>¿Esta es tu dirección?</span><button type="button">Cambiar</button></div>
          <button className="close-address" type="button" aria-label="Cerrar" onClick={() => setAddressOpen(false)}><X size={16} /></button>
        </div>
      )}
    </header>
  );
}
