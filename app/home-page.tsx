import { AssistantTriggerLink } from "./assistant-trigger-link";
import { categories } from "./data";
import { HardLink } from "./hard-link";
import { Newsletter, ServiceBenefits } from "./site-footer";

export function HomePage() {
  return (
    <main className="home-page">
      <section className="home-mosaic" aria-label="Promociones destacadas">
        <HardLink className="mosaic-school" href="/?promo=escolares"><img src="/home/temporada-escolar.webp" alt="Temporada Escolar" /></HardLink>
        <HardLink className="mosaic-fresh" href="/?promo=frescura"><img src="/home/frescura.png" alt="Bienestar en cada bocado" /></HardLink>
        <HardLink className="mosaic-beauty" href="/esentis"><img src="/home/belleza.webp" alt="Belleza que se nota" /></HardLink>
        <HardLink className="mosaic-tech" href="/?promo=innovacion"><img src="/home/innovacion.webp" alt="Innovación a tu alcance" /></HardLink>
        <HardLink className="mosaic-meat" href="/?promo=carnes"><img src="/home/carnes.webp" alt="Lo mejor en carnes" /></HardLink>
      </section>

      <section className="esentis-campaign-banner">
        <div className="campaign-copy">
          <span>Nuevo asesor de belleza Esentis</span>
          <h1>Tu piel tiene una historia. Descúbrela.</h1>
          <p>Conoce tu perfil de piel probable y arma una rutina con productos Esentis de Sirena.</p>
          <div className="campaign-actions">
            <AssistantTriggerLink className="campaign-primary" href="/esentis?asesor=1">Descubrir mi rutina</AssistantTriggerLink>
            <HardLink className="campaign-secondary" href="/esentis">Ver productos</HardLink>
          </div>
          <small>Orientación cosmética. No sustituye una evaluación dermatológica.</small>
        </div>
        <img src="/mascot/mascot-hover.png" alt="Asesora virtual Esentis" />
      </section>

      <section className="home-categories" aria-labelledby="home-categories-title">
        <div className="home-section-title">
          <h2 id="home-categories-title">Nuestras Categorías</h2>
          <p>Organiza tu compra por secciones y ahorra tiempo</p>
        </div>
        <div className="category-slider">
          {categories.map((category) => (
            <HardLink href={category.href} key={category.name}>
              <img src={category.image} alt={category.name} />
              <span>{category.name}</span>
            </HardLink>
          ))}
        </div>
      </section>

      <ServiceBenefits />
      <Newsletter />
    </main>
  );
}
