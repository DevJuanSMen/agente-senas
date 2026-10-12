// Compara la mano del usuario con la pose de referencia: un puntaje por dedo
// (flexión de cada articulación + hacia dónde apunta) y uno global.

import { DEDOS, punto, type Vector } from "./normalizar";

type V3 = [number, number, number];
const resta = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norma = (a: V3) => Math.hypot(a[0], a[1], a[2]) || 1e-6;
const angulo = (a: V3, b: V3) => {
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (norma(a) * norma(b));
  return Math.acos(Math.max(-1, Math.min(1, c)));
};

// Ángulos de flexión en las 3 articulaciones del dedo + dirección base→punta.
function rasgosDedo(v: Vector, cadena: readonly number[]) {
  const p = cadena.map((i) => punto(v, i));
  const flexion = [1, 2, 3].map((j) => angulo(resta(p[j], p[j - 1]), resta(p[j + 1], p[j])));
  return { flexion, direccion: resta(p[4], p[1]) };
}

export type Comparacion = {
  global: number; // 0–1
  dedos: { clave: string; nombre: string; puntaje: number }[];
};

// Tolerancias (radianes): más allá de esto el dedo cuenta como "mal".
const TOL_FLEXION = 1.05;
const TOL_DIRECCION = 1.0;

export function comparar(usuario: Vector, referencia: Vector): Comparacion {
  const dedos = DEDOS.map((d) => {
    const u = rasgosDedo(usuario, d.cadena);
    const r = rasgosDedo(referencia, d.cadena);
    // El pulgar flexiona menos y de forma más variable: se le da algo más de margen.
    const margen = d.clave === "pulgar" ? 1.25 : 1;
    const errFlex = u.flexion.reduce((s, a, i) => s + Math.abs(a - r.flexion[i]), 0) / 3;
    const errDir = angulo(u.direccion, r.direccion);
    const puntaje = Math.max(0, 1 - (0.6 * errFlex) / (TOL_FLEXION * margen) - (0.4 * errDir) / (TOL_DIRECCION * margen));
    return { clave: d.clave, nombre: d.nombre, puntaje };
  });
  // El dedo peor pesa más: una seña con un dedo mal no está bien.
  const media = dedos.reduce((s, d) => s + d.puntaje, 0) / dedos.length;
  const peor = Math.min(...dedos.map((d) => d.puntaje));
  return { global: Math.max(0, Math.min(1, 0.65 * media + 0.35 * peor)), dedos };
}
