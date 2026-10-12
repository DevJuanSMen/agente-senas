// Evalúa precisión ENTRE PERSONAS (validación cruzada agrupada por persona)
// con distintas representaciones de la mano, usando el mismo kNN de la app.
import { readFileSync, existsSync } from "node:fs";

const EXCLUIR = new Set(["G", "H", "J", "NN", "S", "Z", "10", "MIL", "MILLON"]);
const filas = [];
for (let i = 0; i < 6; i++) {
  if (!existsSync(`r${i}.json`)) continue;
  for (const d of JSON.parse(readFileSync(`r${i}.json`, "utf8"))) {
    if (!d.manos.length) continue;
    const [per, sena, arch] = d.ruta.split("/");
    if (EXCLUIR.has(sena)) continue;
    const m = [...d.manos].sort((a, b) => b.tamano - a.tamano)[0];
    filas.push({ per, sena, f: +arch.match(/_(\d)\.jpg$/)[1], v: m.v });
  }
}
console.log(filas.length, "muestras,", new Set(filas.map((f) => f.per)).size, "personas,", new Set(filas.map((f) => f.sena)).size, "señas");

const P = (v, i) => [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const n = Math.hypot(...a) || 1; return a.map((x) => x / n); };

const variantes = process.env.SOLO ? {} : {
  "crudo (actual)": (v) => v,
  "z a la mitad": (v) => v.map((x, i) => (i % 3 === 2 ? x * 0.5 : x)),
  "girado en el plano": (v) => {
    const [x, y] = P(v, 9); const a = Math.atan2(x, -y); const c = Math.cos(-a), s = Math.sin(-a);
    const o = []; for (let i = 0; i < 21; i++) { const [px, py, pz] = P(v, i); o.push(px * c - py * s, px * s + py * c, pz); } return o;
  },
  "marco de la palma 3D": (v) => palma(v, 0),
  "palma 3D + orientación": (v) => palma(v, 1),
  "palma 3D + orientación×2": (v) => palma(v, 2),
};
function palma(v, pesoOrient) {
  const w = P(v, 0), i5 = P(v, 5), p17 = P(v, 17), m9 = P(v, 9);
  const ex = norm(sub(i5, p17));
  let ey = sub(m9, w); ey = norm(sub(ey, ex.map((x) => x * dot(ey, ex))));
  const ez = cross(ex, ey);
  const o = [];
  for (let i = 0; i < 21; i++) { const q = sub(P(v, i), w); o.push(dot(q, ex), dot(q, ey), dot(q, ez)); }
  if (pesoOrient) o.push(...ey.map((x) => x * pesoOrient), ...ez.map((x) => x * pesoOrient));
  return o;
}

const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s); };
function knn(tr, x, k = 5) {
  const mejores = [];
  for (const t of tr) {
    const d = dist(x, t.x);
    if (mejores.length < k || d < mejores[mejores.length - 1].d) { mejores.push({ s: t.sena, d }); mejores.sort((a, b) => a.d - b.d); if (mejores.length > k) mejores.pop(); }
  }
  const votos = {}; for (const m of mejores) votos[m.s] = (votos[m.s] ?? 0) + 1 / (m.d + 0.05);
  return Object.entries(votos).sort((a, b) => b[1] - a[1])[0][0];
}

const personas = [...new Set(filas.map((f) => f.per))].sort();
const pliegues = 5;
const frames = process.argv[2] ? process.argv[2].split("").map(Number) : [0, 1, 2, 3, 4, 5];
if (process.env.SOLO) variantes["crudo"] = (v) => v;
for (const [nombre, fn] of Object.entries(variantes)) {
  let ok = 0, n = 0;
  const conf = {};
  for (let p = 0; p < pliegues; p++) {
    const prueba = new Set(personas.filter((_, i) => i % pliegues === p));
    const tr = filas.filter((f) => !prueba.has(f.per) && frames.includes(f.f)).map((f) => ({ sena: f.sena, x: fn(f.v) }));
    // Se prueba con todos los frames de las personas no vistas (submuestreo para que sea rápido).
    const te = filas.filter((f) => prueba.has(f.per)).filter((_, i) => i % 3 === 0);
    for (const t of te) { const pred = knn(tr, fn(t.v)); n++; if (pred === t.sena) ok++; else conf[`${t.sena}→${pred}`] = (conf[`${t.sena}→${pred}`] ?? 0) + 1; }
  }
  const peores = Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, c]) => `${k}:${c}`).join(" ");
  console.log(`${nombre.padEnd(26)} ${(100 * ok / n).toFixed(1)}%  (n=${n})  confusiones: ${peores}`);
}
