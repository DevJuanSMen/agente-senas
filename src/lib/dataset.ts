// Dataset de muestras: se guarda en localStorage y se exporta/importa en JSON
// para que quien conozca LSC lo alimente después.

import { esVectorValido, distancia, type Vector } from "./normalizar";
import type { Muestras } from "./clasificador";

export type Dataset = {
  version: 1;
  labels: Muestras;
  descripciones: Record<string, string>;
};

const CLAVE = "senas-upar:dataset:v1";

export const datasetVacio = (): Dataset => ({ version: 1, labels: {}, descripciones: {} });

export function cargarLocal(): Dataset {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? validar(JSON.parse(crudo)) : datasetVacio();
  } catch {
    return datasetVacio();
  }
}

export function guardarLocal(d: Dataset): string | null {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d));
    return null;
  } catch {
    return "No se pudo guardar en este navegador (¿almacenamiento lleno o modo privado?). Exporta el JSON para no perder las muestras.";
  }
}

// Acepta el formato del brief y descarta lo que no sean vectores de 63 números.
export function validar(json: unknown): Dataset {
  const o = json as { version?: unknown; labels?: unknown; descripciones?: unknown };
  if (!o || typeof o !== "object" || o.version !== 1 || typeof o.labels !== "object" || o.labels === null)
    throw new Error("El archivo no tiene el formato esperado ({ version: 1, labels: { … } }).");
  const labels: Muestras = {};
  for (const [etiqueta, vs] of Object.entries(o.labels as Record<string, unknown>)) {
    if (!Array.isArray(vs)) continue;
    const validos = vs.filter(esVectorValido);
    if (validos.length) labels[etiqueta.toUpperCase()] = validos;
  }
  const descripciones: Record<string, string> = {};
  if (o.descripciones && typeof o.descripciones === "object")
    for (const [k, t] of Object.entries(o.descripciones as Record<string, unknown>)) if (typeof t === "string") descripciones[k.toUpperCase()] = t;
  return { version: 1, labels, descripciones };
}

export function combinar(base: Dataset, extra: Dataset): Dataset {
  const labels: Muestras = { ...base.labels };
  for (const [k, vs] of Object.entries(extra.labels)) labels[k] = [...(labels[k] ?? []), ...vs];
  return { version: 1, labels, descripciones: { ...base.descripciones, ...extra.descripciones } };
}

export function descargar(d: Dataset) {
  const blob = new Blob([JSON.stringify(d)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dataset-lsc-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------------- dataset base (LSC70) ----------------
// Muestras extraídas de LSC70 (Universidad del Cauca, CC BY 4.0) con el mismo
// MediaPipe y la misma normalización de la app. Ver CREDITOS en el README.

export const CREDITO_BASE =
  "Dataset base: LSC70 — «Speak in Colombian Sign Language: A Dynamic LSC70 Database», J. A. Muñoz Galíndez, L. V. Villota Coral y R. Vargas-Cañas, Universidad del Cauca (Mendeley Data, doi:10.17632/9ssyn8tff5.2), CC BY 4.0. Cambios: las imágenes se convirtieron en puntos de la mano con MediaPipe y se normalizaron; no se incluyen imágenes.";

const CLAVE_BASE = "senas-upar:base-ofrecida";

export async function descargarBase(): Promise<Dataset> {
  const r = await fetch(`${import.meta.env.BASE_URL}datasets/lsc70.json`);
  if (!r.ok) throw new Error("No se encontró el dataset base.");
  return validar(await r.json());
}

export function yaSeOfrecioBase() {
  try {
    return localStorage.getItem(CLAVE_BASE) === "1";
  } catch {
    return true;
  }
}

export function marcarBaseOfrecida() {
  try {
    localStorage.setItem(CLAVE_BASE, "1");
  } catch {
    /* sin almacenamiento */
  }
}

export const totalMuestras =(d: Dataset) => Object.values(d.labels).reduce((a, vs) => a + vs.length, 0);

// Muestra "más típica" de una etiqueta (la más cercana al resto): pose de referencia.
export function medoide(vs: Vector[]): Vector | null {
  if (vs.length === 0) return null;
  const paso = Math.max(1, Math.floor(vs.length / 40));
  let mejor = vs[0];
  let mejorSuma = Infinity;
  for (let i = 0; i < vs.length; i += paso) {
    let suma = 0;
    for (let j = 0; j < vs.length; j += paso) suma += distancia(vs[i], vs[j]);
    if (suma < mejorSuma) [mejor, mejorSuma] = [vs[i], suma];
  }
  return mejor;
}
