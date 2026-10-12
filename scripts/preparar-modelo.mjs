// Deja MediaPipe dentro del proyecto (public/mediapipe) para que la demo
// funcione sin depender de CDNs el día de la presentación.
// Se ejecuta solo en `npm install` (postinstall); se puede correr a mano.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origenWasm = join(raiz, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const destino = join(raiz, "public", "mediapipe");
const destinoWasm = join(destino, "wasm");
const modelo = join(destino, "hand_landmarker.task");
const URL_MODELO =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

mkdirSync(destinoWasm, { recursive: true });
for (const archivo of readdirSync(origenWasm)) {
  if (archivo.startsWith("vision_wasm_internal") || archivo.startsWith("vision_wasm_nosimd_internal")) {
    copyFileSync(join(origenWasm, archivo), join(destinoWasm, archivo));
  }
}
console.log("MediaPipe wasm copiado en public/mediapipe/wasm");

if (existsSync(modelo) && statSync(modelo).size > 1_000_000) {
  console.log("Modelo de manos ya presente.");
} else {
  console.log("Descargando modelo de manos de MediaPipe…");
  const r = await fetch(URL_MODELO);
  if (!r.ok) throw new Error(`No se pudo descargar el modelo (${r.status}). Reintenta con: node scripts/preparar-modelo.mjs`);
  writeFileSync(modelo, Buffer.from(await r.arrayBuffer()));
  console.log("Modelo guardado en public/mediapipe/hand_landmarker.task");
}
