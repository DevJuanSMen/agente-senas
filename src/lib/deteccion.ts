// MediaPipe Hand Landmarker y la cámara, compartidos por toda la app
// (se crean una sola vez y sobreviven al cambio de pestaña).

import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { normalizar, type Punto, type Vector } from "./normalizar";

let detector: Promise<HandLandmarker> | null = null;

export function obtenerDetector() {
  detector ??= (async () => {
    const base = `${import.meta.env.BASE_URL}mediapipe`;
    const archivos = await FilesetResolver.forVisionTasks(`${base}/wasm`);
    const opciones = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: `${base}/hand_landmarker.task`, delegate },
      runningMode: "VIDEO" as const,
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    try {
      return await HandLandmarker.createFromOptions(archivos, opciones("GPU"));
    } catch {
      return await HandLandmarker.createFromOptions(archivos, opciones("CPU"));
    }
  })();
  detector.catch(() => (detector = null));
  return detector;
}

// ---------------- cámara ----------------
// Muchos PC tienen cámaras virtuales (OBS, EShare, Teams…) que no envían imagen
// si su programa no está abierto, y Chrome a veces las usa por defecto. Por eso
// se prefiere una cámara física y se recuerda la que elija el usuario.

const CLAVE_CAMARA = "senas-upar:camara";
const VIRTUAL = /virtual|obs|eshare|sharing|droidcam|manycam|snap ?cam|xsplit|broadcast|iriun|epoccam|ndi/i;
export const esVirtual = (etiqueta: string) => VIRTUAL.test(etiqueta);

let actual: { id: string | null; stream: Promise<MediaStream> } | null = null;

function abrir(deviceId: string | null) {
  const video: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (deviceId) video.deviceId = { exact: deviceId };
  else video.facingMode = "user";
  const pedir = navigator.mediaDevices.getUserMedia({ video, audio: false });
  // Si el navegador nunca responde (driver colgado), se avisa en vez de esperar para siempre.
  const limite = new Promise<never>((_, no) => setTimeout(() => no(new DOMException("La cámara no respondió", "TimeoutError")), 12000));
  return Promise.race([pedir, limite]);
}

function soltar() {
  actual?.stream.then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {});
  actual = null;
}

export function camaraGuardada() {
  try {
    return localStorage.getItem(CLAVE_CAMARA);
  } catch {
    return null;
  }
}

/** Abre (o reutiliza) la cámara. Sin `deviceId` usa la guardada o elige una física. */
export function obtenerCamara(deviceId?: string | null): Promise<MediaStream> {
  const pedido = deviceId ?? camaraGuardada();
  if (actual && (pedido === null || actual.id === pedido)) return actual.stream;
  soltar();
  const stream = (async () => {
    let s = await abrir(pedido).catch((e) => {
      // La cámara guardada ya no existe: se vuelve a la elección automática.
      if (pedido && (e as DOMException).name === "OverconstrainedError") return abrir(null);
      throw e;
    });
    if (!deviceId) {
      // Elección automática: si quedó una virtual y hay una física, se cambia a la física.
      const etiqueta = s.getVideoTracks()[0]?.label ?? "";
      if (esVirtual(etiqueta)) {
        const fisica = (await listarCamaras()).find((c) => !esVirtual(c.label));
        if (fisica) {
          s.getTracks().forEach((t) => t.stop());
          s = await abrir(fisica.deviceId);
        }
      }
    }
    return s;
  })();
  actual = { id: pedido, stream };
  stream.then(
    (s) => actual?.stream === stream && (actual.id = s.getVideoTracks()[0]?.getSettings().deviceId ?? pedido),
    () => actual?.stream === stream && (actual = null),
  );
  return stream;
}

export function elegirCamara(deviceId: string) {
  try {
    localStorage.setItem(CLAVE_CAMARA, deviceId);
  } catch {
    /* sin almacenamiento: solo dura esta sesión */
  }
  soltar();
  return obtenerCamara(deviceId);
}

export async function listarCamaras() {
  const ds = await navigator.mediaDevices.enumerateDevices();
  return ds.filter((d) => d.kind === "videoinput" && d.deviceId);
}

export type Mano = {
  puntos: Punto[]; // en la imagen (0–1), para dibujar sobre el video
  vector: Vector; // normalizado (63)
  esIzquierda: boolean;
  confianza: number;
};

export function leerMano(r: HandLandmarkerResult, aspecto: number): Mano | null {
  const puntos = r.landmarks[0];
  if (!puntos) return null;
  const lado = r.handedness[0]?.[0];
  // Basta con ser consistentes: siempre se espeja la misma etiqueta de MediaPipe.
  const esIzquierda = lado?.categoryName === "Left";
  return { puntos, vector: normalizar(puntos, aspecto, esIzquierda), esIzquierda, confianza: lado?.score ?? 1 };
}

export function mensajeErrorCamara(e: unknown) {
  const n = (e as DOMException)?.name;
  if (n === "NotAllowedError") return "Necesitamos tu permiso para usar la cámara. Haz clic en el ícono de la cámara en la barra de direcciones y elige «Permitir».";
  if (n === "NotFoundError") return "No encontramos ninguna cámara conectada.";
  if (n === "NotReadableError") return "La cámara está siendo usada por otra aplicación (Teams, Zoom, OBS…). Ciérrala o elige otra cámara.";
  if (n === "TimeoutError") return "La cámara no respondió. Prueba eligiendo otra cámara en la lista.";
  return "No pudimos iniciar la cámara o el detector de manos. Recarga la página e inténtalo otra vez.";
}
