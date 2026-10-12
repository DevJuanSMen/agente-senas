// Poses de mano sintéticas para la animación de portada (formas genéricas:
// mano abierta, puño, señalar…). NO son señas de LSC: esas salen del dataset.
// Mismo sistema que los vectores normalizados: muñeca en el origen, y hacia
// abajo (como en la imagen), distancia muñeca→base del medio = 1.

import type { Vector } from "./normalizar";

type V3 = [number, number, number];

const FALANGES = {
  indice: [0.42, 0.25, 0.21],
  medio: [0.47, 0.29, 0.22],
  anular: [0.44, 0.27, 0.21],
  menique: [0.33, 0.2, 0.19],
};
const BASES: Record<keyof typeof FALANGES, { base: V3; abre: number }> = {
  indice: { base: [0.3, -0.95, 0], abre: 0.14 },
  medio: { base: [0, -1, 0], abre: 0 },
  anular: { base: [-0.27, -0.93, 0], abre: -0.12 },
  menique: { base: [-0.5, -0.8, 0], abre: -0.26 },
};

/** curl: 0 = estirado, 1 = cerrado. Orden: pulgar, índice, medio, anular, meñique. */
export function pose(curl: [number, number, number, number, number], apertura = 1): Vector {
  const p: V3[] = new Array(21);
  p[0] = [0, 0, 0];

  // Pulgar: sale hacia el lado y se dobla hacia la palma (hacia la cámara, -z).
  const [ct] = curl;
  p[1] = [0.33, -0.22, -0.05];
  let a = -0.75 + ct * 0.95; // ángulo en el plano de la imagen (0 = hacia arriba)
  let prof = ct * 0.55;
  const largosPulgar = [0.4, 0.33, 0.28];
  for (let j = 0; j < 3; j++) {
    const l = largosPulgar[j];
    const prev = p[1 + j];
    p[2 + j] = [prev[0] - Math.sin(a) * l * Math.cos(prof), prev[1] - Math.cos(a) * l * Math.cos(prof), prev[2] - Math.sin(prof) * l];
    a += ct * 0.35;
    prof += ct * 0.3;
  }

  (["indice", "medio", "anular", "menique"] as const).forEach((dedo, k) => {
    const c = curl[k + 1];
    const { base, abre } = BASES[dedo];
    const inicio = 5 + k * 4;
    p[inicio] = base;
    const giro = abre * apertura * (1 - c * 0.7);
    let flex = 0;
    const flexiones = [1.45, 1.75, 1.05];
    for (let j = 0; j < 3; j++) {
      flex += c * flexiones[j];
      const l = FALANGES[dedo][j];
      const prev = p[inicio + j];
      // Dirección: hacia arriba girada por la apertura y doblada hacia la palma.
      p[inicio + j + 1] = [
        prev[0] + Math.sin(giro) * Math.cos(flex) * l,
        prev[1] - Math.cos(giro) * Math.cos(flex) * l,
        prev[2] - Math.sin(flex) * l,
      ];
    }
  });
  return p.flat();
}

export const POSES_PORTADA: Vector[] = [
  pose([0, 0, 0, 0, 0]), // mano abierta
  pose([0, 0, 0, 1, 1], 1.4), // dos dedos y pulgar
  pose([0.9, 1, 1, 1, 1]), // puño
  pose([0, 0, 1, 1, 0]), // 🤟
  pose([0.8, 0, 1, 1, 1]), // señalar
  pose([0.2, 0.1, 0.1, 0.1, 0.1], 0.3), // mano plana juntando dedos
];

export function interpolar(a: Vector, b: Vector, t: number): Vector {
  const s = t * t * (3 - 2 * t);
  return a.map((x, i) => x + (b[i] - x) * s);
}
