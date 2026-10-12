// Estado compartido: dataset (persistido en localStorage) y clasificador entrenado.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClasificadorKNN, type Clasificador, type ResumenEntrenamiento } from "../lib/clasificador";
import {
  cargarLocal,
  combinar,
  descargarBase,
  guardarLocal,
  marcarBaseOfrecida,
  totalMuestras,
  yaSeOfrecioBase,
  type Dataset,
} from "../lib/dataset";
import type { Vector } from "../lib/normalizar";

type Ctx = {
  dataset: Dataset;
  total: number;
  clasificador: Clasificador;
  entrenamiento: ResumenEntrenamiento | null;
  desactualizado: boolean; // hay muestras nuevas sin entrenar
  entrenando: boolean;
  cargandoBase: boolean;
  avisoGuardado: string | null;
  agregarMuestras(etiqueta: string, vs: Vector[]): void;
  borrarEtiqueta(etiqueta: string): void;
  definirDescripcion(etiqueta: string, texto: string): void;
  importar(d: Dataset, modo: "reemplazar" | "combinar"): void;
  cargarBase(modo: "reemplazar" | "combinar"): Promise<void>;
  borrarTodo(): void;
  entrenar(): Promise<void>;
};

const Contexto = createContext<Ctx | null>(null);

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset>(cargarLocal);
  const [version, setVersion] = useState(0);
  const [versionEntrenada, setVersionEntrenada] = useState(-1);
  const [entrenamiento, setEntrenamiento] = useState<ResumenEntrenamiento | null>(null);
  const [entrenando, setEntrenando] = useState(false);
  const [cargandoBase, setCargandoBase] = useState(false);
  const [avisoGuardado, setAvisoGuardado] = useState<string | null>(null);
  const clasificador = useRef<Clasificador>(new ClasificadorKNN(5)).current;
  const datasetRef = useRef(dataset);
  datasetRef.current = dataset;
  const versionRef = useRef(version);
  versionRef.current = version;

  const cambiar = useCallback((f: (d: Dataset) => Dataset) => {
    setDataset((d) => f(d));
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => setAvisoGuardado(guardarLocal(dataset)), [dataset]);

  // Reemplaza el dataset y entrena con él de una vez (queda "al día").
  const fijarYEntrenar = useCallback(
    async (nuevo: Dataset) => {
      const v = versionRef.current + 1;
      setDataset(nuevo);
      setVersion(v);
      setEntrenando(true);
      const r = await clasificador.entrenar(nuevo.labels);
      setEntrenamiento(r);
      setVersionEntrenada(v);
      setEntrenando(false);
    },
    [clasificador],
  );

  const entrenar = useCallback(async () => {
    setEntrenando(true);
    const v = version;
    // Pequeña pausa para que la animación de "entrenando" se vea aunque el kNN sea instantáneo.
    const [r] = await Promise.all([clasificador.entrenar(datasetRef.current.labels), new Promise((ok) => setTimeout(ok, 700))]);
    setEntrenamiento(r);
    setVersionEntrenada(v);
    setEntrenando(false);
  }, [clasificador, version]);

  // Al abrir: la primera vez se suma el dataset base LSC70 a lo que haya
  // (sin borrar muestras propias) y se entrena; después solo se entrena.
  useEffect(() => {
    if (!yaSeOfrecioBase()) {
      marcarBaseOfrecida();
      setCargandoBase(true);
      descargarBase()
        .then((base) => fijarYEntrenar(combinar(datasetRef.current, base)))
        .catch(() => {})
        .finally(() => setCargandoBase(false));
      return;
    }
    if (totalMuestras(datasetRef.current) > 0)
      clasificador.entrenar(datasetRef.current.labels).then((r) => {
        setEntrenamiento(r);
        setVersionEntrenada(versionRef.current);
      });
  }, [clasificador, fijarYEntrenar]);

  const cargarBase = useCallback(
    async (modo: "reemplazar" | "combinar") => {
      setCargandoBase(true);
      try {
        const base = await descargarBase();
        await fijarYEntrenar(modo === "reemplazar" ? base : combinar(datasetRef.current, base));
      } finally {
        setCargandoBase(false);
      }
    },
    [fijarYEntrenar],
  );

  const valor = useMemo<Ctx>(
    () => ({
      dataset,
      total: totalMuestras(dataset),
      clasificador,
      entrenamiento,
      desactualizado: versionEntrenada !== version,
      entrenando,
      cargandoBase,
      avisoGuardado,
      entrenar,
      cargarBase,
      agregarMuestras: (etiqueta, vs) =>
        cambiar((d) => ({ ...d, labels: { ...d.labels, [etiqueta]: [...(d.labels[etiqueta] ?? []), ...vs] } })),
      borrarEtiqueta: (etiqueta) =>
        cambiar((d) => {
          const labels = { ...d.labels };
          delete labels[etiqueta];
          return { ...d, labels };
        }),
      definirDescripcion: (etiqueta, texto) =>
        setDataset((d) => ({ ...d, descripciones: { ...d.descripciones, [etiqueta]: texto } })),
      importar: (nuevo, modo) => cambiar((d) => (modo === "reemplazar" ? nuevo : combinar(d, nuevo))),
      borrarTodo: () => cambiar(() => ({ version: 1, labels: {}, descripciones: {} })),
    }),
    [dataset, clasificador, entrenamiento, versionEntrenada, version, entrenando, cargandoBase, avisoGuardado, entrenar, cargarBase, cambiar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatos() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useDatos fuera de ProveedorDatos");
  return c;
}
