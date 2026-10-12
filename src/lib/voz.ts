// Voz del navegador (Web Speech API), preferentemente en español de Colombia.

let vozElegida: SpeechSynthesisVoice | null | undefined;

function elegirVoz() {
  const voces = speechSynthesis.getVoices();
  if (!voces.length) return null;
  const es = voces.filter((v) => v.lang.toLowerCase().startsWith("es"));
  // Preferencia: es-CO natural (Edge: Salomé/Gonzalo) → es-CO → otras latinas → cualquier español.
  const puntaje = (v: SpeechSynthesisVoice) =>
    (v.lang === "es-CO" ? 100 : /es-(MX|US|419|AR|CL|PE|VE)/.test(v.lang) ? 50 : 10) + (/natural|online/i.test(v.name) ? 20 : 0);
  return es.sort((a, b) => puntaje(b) - puntaje(a))[0] ?? null;
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.addEventListener?.("voiceschanged", () => (vozElegida = elegirVoz()));
}

export const hayVoz = () => typeof speechSynthesis !== "undefined";

export function hablar(texto: string, { interrumpir = true } = {}) {
  if (!hayVoz() || !texto.trim()) return;
  if (vozElegida === undefined) vozElegida = elegirVoz();
  if (interrumpir) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = vozElegida?.lang ?? "es-CO";
  if (vozElegida) u.voice = vozElegida;
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
