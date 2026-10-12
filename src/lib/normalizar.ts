// Normalización de los 21 puntos de MediaPipe a un vector de 63 valores:
// relativo a la muñeca, escalado por el tamaño de la mano y con la mano
// izquierda espejada para que un solo modelo sirva para ambas.

export type Punto = { x: number; y: number; z: number };
export type Vector = number[]; // 63 = 21 × (x, y, z)

export const MUNECA = 0;
export const BASE_MEDIO = 9;

// Dedos como cadenas de índices desde la muñeca hasta la punta.
export const DEDOS = [
  { clave: "pulgar", nombre: "Pulgar", cadena: [0, 1, 2, 3, 4] },
  { clave: "indice", nombre: "Índice", cadena: [0, 5, 6, 7, 8] },
  { clave: "medio", nombre: "Medio", cadena: [0, 9, 10, 11, 12] },
  { clave: "anular", nombre: "Anular", cadena: [0, 13, 14, 15, 16] },
  { clave: "menique", nombre: "Meñique", cadena: [0, 17, 18, 19, 20] },
] as const;

/**
 * @param puntos landmarks normalizados de MediaPipe (x, y en 0–1 de la imagen)
 * @param aspecto ancho/alto del video, para que x e y queden en la misma escala
 * @param esIzquierda si se espeja en X
 */
export function normalizar(puntos: Punto[], aspecto: number, esIzquierda: boolean): Vector {
  const m = puntos[MUNECA];
  const rel = puntos.map((p) => ({ x: (p.x - m.x) * aspecto, y: p.y - m.y, z: (p.z - m.z) * aspecto }));
  const b = rel[BASE_MEDIO];
  const escala = Math.hypot(b.x, b.y, b.z) || 1;
  const v: Vector = [];
  for (const p of rel) v.push(((esIzquierda ? -p.x : p.x) / escala), p.y / escala, p.z / escala);
  return v.map((n) => Math.round(n * 10000) / 10000);
}

export const punto = (v: Vector, i: number): [number, number, number] => [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];

export function distancia(a: Vector, b: Vector) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export const esVectorValido = (v: unknown): v is Vector =>
  Array.isArray(v) && v.length === 63 && v.every((n) => typeof n === "number" && Number.isFinite(n));
