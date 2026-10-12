// Lanza servidor + Chrome headless, sigue el progreso por CDP y cierra todo.
// Uso: node correr.mjs <carpeta-de-imagenes> <salida.json>
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [carpeta = "datos", salida = "resultado.json"] = process.argv.slice(2);
const AQUI = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const PUERTO = +(process.argv[4] ?? 5199);
const env = { ...process.env, PUERTO: String(PUERTO), CARPETA: carpeta, SALIDA: salida, PROYECTO: "C:/Users/ACER/OneDrive/Escritorio/uparsistem/Agente Señas" };
const servidor = spawn(process.execPath, [join(AQUI, "servidor.mjs")], { env, stdio: ["ignore", "inherit", "inherit"] });
await new Promise((ok) => setTimeout(ok, 800));

const perfil = mkdtempSync(join(tmpdir(), "lsc70-chrome-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", ...(process.env.SOFTWARE ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : []), `--remote-debugging-port=${PUERTO + 1000}`, `--user-data-dir=${perfil}`, `http://localhost:${PUERTO}/`,
], { stdio: "ignore" });

const fin = () => { try { chrome.kill(); } catch {} try { servidor.kill(); } catch {} setTimeout(() => { try { rmSync(perfil, { recursive: true, force: true }); } catch {} process.exit(0); }, 1500); };
try {
  await new Promise((ok) => setTimeout(ok, 2500));
  const pag = (await (await fetch(`http://127.0.0.1:${PUERTO + 1000}/json`)).json()).find((p) => p.url.includes(String(PUERTO)));
  const ws = new WebSocket(pag.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener("open", ok));
  let id = 0;
  const esp = new Map();
  ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); esp.get(d.id)?.(d); });
  const ev = (e) => new Promise((ok) => { const i = ++id; esp.set(i, ok); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: e, returnByValue: true } })); });
  let ultimo = "";
  const t0 = Date.now();
  for (;;) {
    await new Promise((ok) => setTimeout(ok, 5000));
    const p = (await ev("window.progreso")).result.result.value;
    const linea = p ? `${p.hechas}/${p.total} con mano ${p.conMano}` : "cargando";
    if (linea !== ultimo && (Date.now() - t0) % 60000 < 5000) console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${linea}`);
    ultimo = linea;
    if (p?.error) { console.log("ERROR", p.error); break; }
    if (p?.fin) {
      const json = (await ev("window.resultado")).result.result.value;
      writeFileSync(join(AQUI, salida), json);
      console.log(`FIN ${linea} en ${Math.round((Date.now() - t0) / 1000)} s → ${salida} (${json.length} bytes)`);
      break;
    }
  }
  ws.close();
} catch (e) {
  console.log("FALLO", e);
}
fin();
