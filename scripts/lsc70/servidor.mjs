// Servidor local para procesar LSC70 con MediaPipe en Chrome headless.
// GET /lista -> rutas de imágenes; GET /img/<ruta>; POST /resultado -> guarda JSON.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const AQUI = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const PROYECTO = process.env.PROYECTO;
const RAIZ_IMG = join(AQUI, process.env.CARPETA ?? "datos");
const tipos = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm", ".jpg": "image/jpeg", ".task": "application/octet-stream" };

function listar(dir, base = "") {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    const r = base ? `${base}/${n}` : n;
    return statSync(p).isDirectory() ? listar(p, r) : /\.jpe?g$/i.test(n) ? [r] : [];
  });
}

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const enviar = (archivo) => {
    if (!existsSync(archivo)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": tipos[extname(archivo).toLowerCase()] ?? "application/octet-stream", connection: "close" });
    res.end(readFileSync(archivo));
  };
  if (url === "/") return enviar(join(AQUI, "procesar.html"));
  if (url === "/lista") return res.end(JSON.stringify(listar(RAIZ_IMG)));
  if (url.startsWith("/img/")) return enviar(join(RAIZ_IMG, url.slice(5)));
  if (url.startsWith("/mp/")) return enviar(join(PROYECTO, "public", "mediapipe", url.slice(4)));
  if (url === "/vision.mjs") return enviar(join(PROYECTO, "node_modules", "@mediapipe", "tasks-vision", "vision_bundle.mjs"));
  if (url === "/resultado" && req.method === "POST") {
    let cuerpo = "";
    req.on("data", (c) => (cuerpo += c));
    req.on("end", () => {
      writeFileSync(join(AQUI, process.env.SALIDA ?? "resultado.json"), cuerpo);
      console.log("RESULTADO GUARDADO", cuerpo.length, "bytes");
      res.end("ok");
    });
    return;
  }
  res.writeHead(404).end();
}).listen(+(process.env.PUERTO ?? 5199), () => console.log("servidor en", process.env.PUERTO ?? 5199));
