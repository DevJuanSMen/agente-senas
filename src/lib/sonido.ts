// Sonidos cortos sintetizados con Web Audio (sin archivos).

let ctx: AudioContext | null = null;
const audio = () => (ctx ??= new AudioContext());

function nota(frecuencia: number, inicio: number, duracion: number, volumen = 0.12, tipo: OscillatorType = "sine") {
  const a = audio();
  const t = a.currentTime + inicio;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volumen, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + duracion + 0.05);
}

export const sonidos = {
  // Arpegio ascendente brillante.
  exito() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(f, i * 0.07, 0.5, 0.1, "triangle"));
  },
  aceptar() {
    nota(880, 0, 0.12, 0.07, "sine");
    nota(1318.5, 0.05, 0.18, 0.05, "sine");
  },
  tic() {
    nota(1200, 0, 0.05, 0.04, "square");
  },
  grabar() {
    nota(660, 0, 0.25, 0.08, "triangle");
  },
};
