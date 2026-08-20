import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the Sirena homepage with the Esentis campaign", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sirena — Compra fácil, vive mejor<\/title>/i);
  assert.match(html, /Tu piel tiene una historia\. Descúbrela\./i);
  assert.match(html, /href="\/esentis"[^>]*>Ver productos<\/a>/i);
  assert.match(html, /\/mascot\/mascot-default\.png/i);
  assert.match(html, /\/og-esentis\.png/i);
  assert.doesNotMatch(html, /WhatsApp/i);
});

test("renders the dedicated catalog, analysis, and cart routes", async () => {
  const [catalogResponse, analysisResponse, cartResponse] = await Promise.all([
    render("/esentis"),
    render("/analisis-piel"),
    render("/carrito"),
  ]);

  assert.equal(catalogResponse.status, 200);
  assert.equal(analysisResponse.status, 200);
  assert.equal(cartResponse.status, 200);

  const [catalogHtml, analysisHtml, cartHtml] = await Promise.all([
    catalogResponse.text(),
    analysisResponse.text(),
    cartResponse.text(),
  ]);

  assert.match(catalogHtml, /Catálogo Esentis/i);
  assert.match(catalogHtml, /Gel Facial Esentis Limpiador 200 Ml/i);
  assert.match(analysisHtml, /Análisis de piel y colorimetría/i);
  assert.match(analysisHtml, /Conoce la apariencia de tu piel en minutos/i);
  assert.match(analysisHtml, /Procesamiento protegido/i);
  assert.match(cartHtml, /Mi carrito/i);
  assert.match(cartHtml, /Tu carrito está vacío/i);
});
