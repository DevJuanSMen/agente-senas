// Construye public/datasets/lsc70.json a partir de los resultados de MediaPipe.
// Uso: node construir.mjs <frames, p.ej. 2345> <max por seña>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const frames = (process.argv[2] ?? "012345").split("").map(Number);
const MAX = +(process.argv[3] ?? 180);
const DESTINO = "C:/Users/ACER/OneDrive/Escritorio/uparsistem/Agente Señas/public/datasets";

// Señas estáticas que usa la app (las dinámicas G, H, J, Ñ, S, Z y 10/mil/millón quedan fuera).
const ESTATICAS = new Set("ABCDEFIKLMNOPQRTUVWXY".split("").concat(["1", "4", "5", "6", "7", "8", "9"]));
// Según el artículo de LSC70: 0 = O, 2 = V, 3 = W (por eso no tienen carpeta propia).
const COPIAS = { O: "0", V: "2", W: "3" };

const porSena = {};
for (let i = 0; i < 6; i++) {
  for (const d of JSON.parse(readFileSync(`r${i}.json`, "utf8"))) {
    if (!d.manos.length) continue;
    const [per, sena, arch] = d.ruta.split("/");
    if (!ESTATICAS.has(sena)) continue;
    const f = +arch.match(/_(\d)\.jpg$/)[1];
    if (!frames.includes(f)) continue;
    // En el recorte de la mano dominante, la mano más grande es la que hace la seña.
    const m = [...d.manos].sort((a, b) => b.tamano - a.tamano)[0];
    (porSena[sena] ??= []).push({ per, f, v: m.v.map((x) => Math.round(x * 1000) / 1000) });
  }
}

// Reparto equilibrado entre personas: se toma por rondas (1 de cada persona, luego otra…).
function equilibrar(muestras) {
  const porPersona = {};
  const orden = [3, 0, 5, 1, 4, 2];
  for (const m of [...muestras].sort((a, b) => orden.indexOf(a.f) - orden.indexOf(b.f))) (porPersona[m.per] ??= []).push(m.v);
  const listas = Object.values(porPersona);
  const salida = [];
  for (let ronda = 0; salida.length < MAX; ronda++) {
    let alguna = false;
    for (const l of listas) if (l[ronda] && salida.length < MAX) { salida.push(l[ronda]); alguna = true; }
    if (!alguna) break;
  }
  return salida;
}

const labels = {};
for (const [sena, muestras] of Object.entries(porSena)) labels[sena] = equilibrar(muestras);
for (const [letra, numero] of Object.entries(COPIAS)) if (labels[letra]) labels[numero] = labels[letra];

const dataset = { version: 1, labels, descripciones: {} };
mkdirSync(DESTINO, { recursive: true });
const json = JSON.stringify(dataset);
writeFileSync(`${DESTINO}/lsc70.json`, json);
const resumen = Object.entries(labels).sort().map(([k, v]) => `${k}:${v.length}`).join(" ");
console.log(`lsc70.json: ${Object.keys(labels).length} señas, ${Object.values(labels).reduce((a, v) => a + v.length, 0)} muestras, ${(json.length / 1024 / 1024).toFixed(2)} MB`);
console.log(resumen);
