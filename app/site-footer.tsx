"use client";

import { HardLink } from "./hard-link";

const footerColumns = [
  { title: "Sirena.do", links: ["Sobre nosotros", "Sobre Grupo Ramos", "Nuestras tiendas"] },
  { title: "Mi Cuenta", links: ["Mis pedidos", "Mis favoritos", "Mis direcciones"] },
  { title: "Centro de Ayuda", links: ["Preguntas frecuentes", "¿Necesitas Ayuda?", "Cambios y Devoluciones"] },
  { title: "Información Legal", links: ["Términos y Condiciones"] },
];

export function ServiceBenefits() {
  return (
    <section className="service-benefits">
      <div><img src="/icons/recibe.svg" alt="" /><p>Recibe donde y cuando tú decidas</p></div>
      <div><img src="/icons/puntos.svg" alt="" /><p>Acumula puntos Siremás</p></div>
      <div><img src="/icons/seguras.svg" alt="" /><p>Compras seguras</p></div>
      <div><img src="/icons/promociones.svg" alt="" /><p>Ofertas y promociones los 365 días del año</p></div>
    </section>
  );
}

export function Newsletter() {
  return (
    <section className="newsletter">
      <div><h2>¡Únete y ahorra!</h2><p>Suscríbete a nuestro newsletter y recibe ofertas, novedades y tips directo en tu correo.</p></div>
      <form onSubmit={(event) => event.preventDefault()}>
        <label><span>Correo electrónico</span><input type="email" /></label>
        <label className="terms"><input type="checkbox" /> He leído y acepto Términos y condiciones</label>
        <button type="submit">Suscribirme</button>
      </form>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="sirena-footer">
      <div className="footer-top">
        <div className="footer-contact">
          <img src="/brand/sirena-logo.webp" alt="Sirena" />
          <a href="tel:8293224444">(829) 322-4444</a>
          <a href="mailto:servicioalcliente@sirena.do">servicioalcliente@sirena.do</a>
        </div>
        {footerColumns.map((column) => (
          <div className="footer-column" key={column.title}>
            <h3>{column.title}</h3>{column.links.map((link) => <HardLink href={`/?info=${encodeURIComponent(link)}`} key={link}>{link}</HardLink>)}
          </div>
        ))}
      </div>
      <div className="footer-bottom">Grupo Ramos 2026 © Todos los Derechos Reservados</div>
    </footer>
  );
}
