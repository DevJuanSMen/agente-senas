// Clasificadores de señas estáticas. La app solo conoce la interfaz
// `Clasificador`, así que se puede cambiar el kNN por una red pequeña en
// TF.js (o lo que venga) implementando los mismos dos métodos.

import { distancia, type Vector } from "./normalizar";

export type Muestras = Record<string, Vector[]>;

export type Prediccion = {
  etiqueta: string;
  confianza: number; // 0–1
  distancia: number; // al vecino más cercano
  ranking: { etiqueta: string; puntaje: number }[];
};

export interface Clasificador {
  readonly nombre: string;
  entrenar(muestras: Muestras): Promise<ResumenEntrenamiento>;
  predecir(v: Vector): Prediccion | null;
}

export type ResumenEntrenamiento = { etiquetas: number; muestras: number; umbralDesconocido: number; ms: number };

export class ClasificadorKNN implements Clasificador {
  readonly nombre = "kNN";
  private datos: { etiqueta: string; v: Vector }[] = [];
  private umbral = Infinity;

  constructor(private k = 5) {}

  async entrenar(muestras: Muestras): Promise<ResumenEntrenamiento> {
    const t0 = performance.now();
    this.datos = Object.entries(muestras).flatMap(([etiqueta, vs]) => vs.map((v) => ({ etiqueta, v })));
    this.umbral = this.calcularUmbral();
    return {
      etiquetas: Object.values(muestras).filter((vs) => vs.length > 0).length,
      muestras: this.datos.length,
      umbralDesconocido: this.umbral,
      ms: performance.now() - t0,
    };
  }

  // "No reconozco esta seña": si el vecino más cercano está mucho más lejos de lo
  // normal entre muestras de una misma etiqueta, no se propone ninguna.
  private calcularUmbral() {
    const porEtiqueta = new Map<string, Vector[]>();
    for (const d of this.datos) porEtiqueta.set(d.etiqueta, [...(porEtiqueta.get(d.etiqueta) ?? []), d.v]);
    const cercanas: number[] = [];
    for (const vs of porEtiqueta.values()) {
      // Submuestreo para que entrenar siga siendo instantáneo con datasets grandes.
      const paso = Math.max(1, Math.floor(vs.length / 25));
      for (let i = 0; i < vs.length; i += paso) {
        let min = Infinity;
        for (let j = 0; j < vs.length; j++) if (j !== i) min = Math.min(min, distancia(vs[i], vs[j]));
        if (Number.isFinite(min)) cercanas.push(min);
      }
    }
    if (cercanas.length < 3) return Infinity;
    cercanas.sort((a, b) => a - b);
    const p95 = cercanas[Math.floor(cercanas.length * 0.95)];
    // Calibrado con LSC70: así se acepta ~97 % de las señas de personas nuevas.
    return Math.max(0.6, p95 * 1.7);
  }

  predecir(v: Vector): Prediccion | null {
    if (this.datos.length === 0) return null;
    // Solo se guardan los k más cercanos (miles de muestras en cada frame).
    const vecinos: { etiqueta: string; d: number }[] = [];
    for (const m of this.datos) {
      const d = distancia(v, m.v);
      if (vecinos.length === this.k && d >= vecinos[this.k - 1].d) continue;
      let i = vecinos.length;
      while (i > 0 && vecinos[i - 1].d > d) i--;
      vecinos.splice(i, 0, { etiqueta: m.etiqueta, d });
      if (vecinos.length > this.k) vecinos.pop();
    }
    if (vecinos[0].d > this.umbral) return null;
    const votos = new Map<string, number>();
    for (const n of vecinos) votos.set(n.etiqueta, (votos.get(n.etiqueta) ?? 0) + 1 / (n.d + 0.05));
    const total = [...votos.values()].reduce((a, b) => a + b, 0);
    const ranking = [...votos.entries()]
      .map(([etiqueta, p]) => ({ etiqueta, puntaje: p / total }))
      .sort((a, b) => b.puntaje - a.puntaje);
    // La confianza baja a medida que la seña se aleja de lo que se grabó.
    const cercania = Number.isFinite(this.umbral) ? Math.max(0, 1 - vecinos[0].d / this.umbral) ** 0.5 : 1;
    return { etiqueta: ranking[0].etiqueta, confianza: ranking[0].puntaje * cercania, distancia: vecinos[0].d, ranking };
  }
}
