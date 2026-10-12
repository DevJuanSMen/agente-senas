// Webcam espejada con los 21 puntos de la mano dibujados encima.
// Llama a `alDetectar` en cada frame con la mano (o null).

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { elegirCamara, esVirtual, leerMano, listarCamaras, mensajeErrorCamara, obtenerCamara, obtenerDetector, type Mano } from "../lib/deteccion";

export const COLORES_DEDOS = ["#f472b6", "#a78bfa", "#60a5fa", "#22d3ee", "#34d399"];

const CONEXIONES: [number, number, number][] = [
  [0, 1, 0], [1, 2, 0], [2, 3, 0], [3, 4, 0],
  [0, 5, 1], [5, 6, 1], [6, 7, 1], [7, 8, 1],
  [9, 10, 2], [10, 11, 2], [11, 12, 2],
  [13, 14, 3], [14, 15, 3], [15, 16, 3],
  [0, 17, 4], [17, 18, 4], [18, 19, 4], [19, 20, 4],
  [5, 9, -1], [9, 13, -1], [13, 17, -1],
];

type Estado = "iniciando" | "sin-imagen" | "lista" | "error";

type Props = {
  alDetectar?: (mano: Mano | null, t: number) => void;
  /** Colores por dedo para el dibujo (p. ej. verde/rojo en Practicar). */
  coloresDedos?: () => string[] | null;
  children?: ReactNode;
  className?: string;
  compacta?: boolean;
};

export function Camara({ alDetectar, coloresDedos, children, className, compacta }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<Estado>("iniciando");
  const [detectorListo, setDetectorListo] = useState(false);
  const [error, setError] = useState("");
  const [hayMano, setHayMano] = useState(false);
  const [intento, setIntento] = useState(0);
  const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([]);
  const [camaraActual, setCamaraActual] = useState("");
  const [nombreCamara, setNombreCamara] = useState("");
  const callbacks = useRef({ alDetectar, coloresDedos });
  callbacks.current = { alDetectar, coloresDedos };

  useEffect(() => {
    let vivo = true;
    let raf = 0;
    let vigilante = 0;
    let ultimoT = -1;
    let ultimoHayMano = false;
    let detector: HandLandmarker | null = null;
    setEstado("iniciando");

    // El detector carga en paralelo: el video se muestra apenas la cámara responde.
    obtenerDetector().then(
      (d) => vivo && ((detector = d), setDetectorListo(true)),
      () => vivo && (setError("No se pudo cargar el detector de manos. Recarga la página."), setEstado("error")),
    );

    (async () => {
      try {
        const stream = await obtenerCamara();
        const v = video.current;
        if (!vivo || !v) return;
        const pista = stream.getVideoTracks()[0];
        setCamaraActual(pista?.getSettings().deviceId ?? "");
        setNombreCamara(pista?.label ?? "");
        listarCamaras().then((cs) => vivo && setCamaras(cs));
        v.srcObject = stream;
        v.play().catch(() => {});
        // Si en 5 s no llega imagen (cámara virtual sin programa abierto, tapa puesta…), se avisa.
        vigilante = window.setTimeout(() => vivo && v.readyState < 2 && setEstado("sin-imagen"), 5000);
        const ctx = lienzo.current!.getContext("2d")!;

        const ciclo = () => {
          if (!vivo) return;
          raf = requestAnimationFrame(ciclo);
          if (v.readyState < 2 || !v.videoWidth || v.currentTime === ultimoT) return;
          ultimoT = v.currentTime;
          setEstado((e) => (e === "lista" || e === "error" ? e : "lista"));
          if (!detector) return;
          const ahora = performance.now();
          const mano = leerMano(detector.detectForVideo(v, ahora), v.videoWidth / v.videoHeight);
          dibujar(ctx, v, mano, callbacks.current.coloresDedos?.() ?? null);
          callbacks.current.alDetectar?.(mano, ahora);
          if (!!mano !== ultimoHayMano) setHayMano((ultimoHayMano = !!mano));
        };
        ciclo();
      } catch (e) {
        if (!vivo) return;
        setError(mensajeErrorCamara(e));
        setEstado("error");
        // Aunque falle, se ofrece la lista para elegir otra cámara.
        listarCamaras().then((cs) => vivo && setCamaras(cs)).catch(() => {});
      }
    })();
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      clearTimeout(vigilante);
      callbacks.current.alDetectar?.(null, performance.now());
    };
  }, [intento]);

  const cambiarCamara = (id: string) => {
    setCamaraActual(id);
    elegirCamara(id).catch(() => {});
    setIntento((n) => n + 1);
  };

  const selector = camaras.length > 1 && (
    <label className="camara-selector" title="Elegir cámara">
      <span aria-hidden>📷</span>
      <select value={camaraActual} onChange={(e) => cambiarCamara(e.target.value)} aria-label="Cámara">
        {!camaras.some((c) => c.deviceId === camaraActual) && <option value="">{nombreCamara || "Cámara actual"}</option>}
        {camaras.map((c, i) => (
          <option key={c.deviceId} value={c.deviceId}>
            {c.label || `Cámara ${i + 1}`}
            {esVirtual(c.label) ? " (virtual)" : ""}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className={`camara ${compacta ? "compacta" : ""} ${className ?? ""}`}>
      <video ref={video} playsInline muted />
      <canvas ref={lienzo} />
      {estado === "iniciando" && (
        <div className="camara-velo">
          <div className="pulso-mano">🖐️</div>
          <strong>Encendiendo la cámara…</strong>
          <span>Si el navegador lo pide, elige «Permitir». Las imágenes no salen de tu equipo.</span>
        </div>
      )}
      {estado === "sin-imagen" && (
        <div className="camara-velo error">
          <div className="pulso-mano">📷</div>
          <strong>La cámara no está enviando imagen</strong>
          <span>
            {nombreCamara ? `«${nombreCamara}» ` : "Esta cámara "}no muestra nada. Si es una cámara virtual (OBS, EShare…) o tiene la tapa puesta, elige otra en la lista de arriba.
          </span>
        </div>
      )}
      {estado === "error" && (
        <div className="camara-velo error">
          <div className="pulso-mano">📷</div>
          <strong>No pudimos usar la cámara</strong>
          <span>{error}</span>
          <button className="boton" onClick={() => setIntento((n) => n + 1)}>
            Intentar de nuevo
          </button>
        </div>
      )}
      {estado === "lista" && !detectorListo && <div className="camara-pista">Cargando el detector de manos…</div>}
      {estado === "lista" && detectorListo && !hayMano && <div className="camara-pista">Muestra una mano frente a la cámara</div>}
      {estado === "lista" && children}
      {selector}
    </div>
  );
}

function dibujar(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, mano: Mano | null, colores: string[] | null) {
  const c = ctx.canvas;
  if (c.width !== v.videoWidth || c.height !== v.videoHeight) {
    c.width = v.videoWidth;
    c.height = v.videoHeight;
  }
  ctx.clearRect(0, 0, c.width, c.height);
  if (!mano) return;
  const w = c.width;
  const h = c.height;
  const grosor = Math.max(3, w / 220);
  const paleta = colores ?? COLORES_DEDOS;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b, dedo] of CONEXIONES) {
    const pa = mano.puntos[a];
    const pb = mano.puntos[b];
    const color = dedo === -1 ? "rgba(255,255,255,0.55)" : paleta[dedo];
    ctx.shadowColor = color;
    ctx.shadowBlur = grosor * 4;
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  mano.puntos.forEach((p, i) => {
    const r = [4, 8, 12, 16, 20].includes(i) ? grosor * 1.9 : grosor * 1.3;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  });
}
