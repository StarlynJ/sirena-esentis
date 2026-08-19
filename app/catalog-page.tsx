"use client";

import { ChevronDown, Heart, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AssistantTriggerLink } from "./assistant-trigger-link";
import { formatPrice } from "./data";
import { Newsletter, ServiceBenefits } from "./site-footer";
import { useCart } from "./store-provider";

const filterGroups = ["Departamento", "Categoría", "Sub-Categoría", "Sub-Categoría 2", "Necesidad / Facial", "Necesidad / Tratamiento", "Presentación"];

export function CatalogPage() {
  const { addProduct, products, productsLoading, productsError } = useCart();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [openFilters, setOpenFilters] = useState<string[]>([]);
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    if (!mobileFilters) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileFilters]);
  const visibleProducts = useMemo(() => {
    const next = products.filter((product) => product.collection !== "makeup");
    if (sort === "low") next.sort((a, b) => a.price - b.price);
    if (sort === "high") next.sort((a, b) => b.price - a.price);
    return next;
  }, [products, sort]);

  return (
    <main className="catalog-page">
      <div className="breadcrumb"><Link href="/">Inicio</Link><span>/</span><strong>ESENTIS</strong></div>
      <section className="esentis-catalog-intro">
        <div><span>Línea de belleza Sirena</span><h1>Esentis</h1><p>Cuidado diario creado para acompañar tu piel.</p></div>
        <div className="catalog-intro-actions">
          <AssistantTriggerLink href="/esentis?asesor=1">Encontrar mi rutina</AssistantTriggerLink>
          <Link href="/analisis-piel">Analizar mi piel</Link>
        </div>
      </section>
      <div className="catalog-layout">
        <aside className={`filters-panel ${mobileFilters ? "mobile-open" : ""}`}>
          <div className="filters-title"><h2>Filtros</h2><button type="button" onClick={() => setMobileFilters(false)} aria-label="Cerrar filtros"><X size={20} /></button></div>
          {filterGroups.map((title) => (
            <div className={`filter-group ${openFilters.includes(title) ? "filter-open" : ""}`} key={title}>
              <button type="button" onClick={() => setOpenFilters((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title])}>
                <span>{title}</span><ChevronDown size={19} strokeWidth={2.5} />
              </button>
              {openFilters.includes(title) && <div className="filter-options"><label><input type="checkbox" /> <span>{title === "Departamento" ? "Belleza" : "Cuidado para la piel"}</span></label><label><input type="checkbox" /> <span>Esentis</span></label></div>}
            </div>
          ))}
          <div className="price-filter"><strong>Rangos de precio</strong><div className="range-track"><i /><i /></div><div><span>RD$115.00</span><span>RD$575.00</span></div></div>
          <img className="sponsor-banner" src="/banners/sponsor.png" alt="Promoción Sirena" />
        </aside>
        <section className="catalog-main" aria-label="Catálogo Esentis">
          <div className="catalog-toolbar">
            <button className="mobile-filter-button" type="button" onClick={() => setMobileFilters(true)}>Filtros <ChevronDown size={16} /></button>
            <label className="sort-select"><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Destacados</option><option value="low">Menor precio</option><option value="high">Mayor precio</option></select></label>
          </div>
          <div className="results-head"><strong>{productsLoading ? "Cargando productos…" : `${visibleProducts.length} productos`}</strong><button type="button">Mostrar anteriores</button></div>
          {productsError && <div className="catalog-data-error" role="alert">{productsError}</div>}
          <div className="products-grid">
            {visibleProducts.map((product) => (
              <article className="catalog-product" key={product.id}>
                <span className="sirena-brand-badge">Esentis · Marca Sirena</span>
                <button className="heart-button" type="button" aria-label={`Agregar ${product.name} a favoritos`}><Heart size={24} /></button>
                <div className="catalog-image"><img src={product.image} alt={product.name} /></div>
                <h2>{product.name}</h2><strong className="catalog-price">{formatPrice(product.price)}</strong>
                <button className="catalog-add" type="button" onClick={() => addProduct(product.id)}><span>＋</span> Agregar</button>
              </article>
            ))}
          </div>
          <button className="show-more" type="button">Ver más productos</button>
        </section>
      </div>
      <Link className="supermarket-banner" href="/?promo=supermercado"><img src="/banners/supermercado.webp" alt="Los imperdibles para tu mesa" /></Link>
      <ServiceBenefits /><Newsletter />
      {mobileFilters && <button className="filters-backdrop" type="button" aria-label="Cerrar filtros" onClick={() => setMobileFilters(false)} />}
    </main>
  );
}
