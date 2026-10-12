import { useRef, useState } from "react";
import { Float } from "@react-three/drei";
import { Camara, COLORES_DEDOS } from "../componentes/Camara";
import { Anillo } from "../componentes/Anillo";
import { Escenario } from "../three/Escenario";
import { Mano3D } from "../three/Mano3D";
import { useDatos } from "../estado/Datos";
import { nombreHablado } from "../lib/etiquetas";
import { hablar } from "../lib/voz";
import { sonidos } from "../lib/sonido";
import type { Mano } from "../lib/deteccion";
import type { Vector } from "../lib/normalizar";
import type { Modulo } from "../App";

// Para repetir la misma letra (p. ej. "LL"): bajar la mano o sostenerla este tiempo extra.
const REPETIR_MS = 1300;

type Vista = {
  etiqueta: string | null;
  confianza: number;
  estabilidad: number; // 0–1 hacia la aceptación
  ranking: { etiqueta: string; puntaje: number }[];
};

export function Hablar({ ir }: { ir: (m: Modulo) => void }) {
  const d = useDatos();
  const [texto, setTexto] = useState("");
  const [leerLetras, setLeerLetras] = useState(true);
  const [umbral, setUmbral] = useState(0.6);
  const [sostener, setSostener] = useState(500);
  const [vista, setVista] = useState<Vista>({ etiqueta: null, confianza: 0, estabilidad: 0, ranking: [] });
  const [destello, setDestello] = useState(0);

  const manoActual = useRef<Vector | null>(null);
  const seguimiento = useRef({ candidata: null as string | null, desde: 0, aceptada: null as string | null, aceptadaEn: 0, ui: 0 });
  const config = useRef({ umbral, sostener, leerLetras });
  config.current = { umbral, sostener, leerLetras };

  function aceptar(letra: string) {
    setTexto((t) => t + letra);
    setDestello((n) => n + 1);
    sonidos.aceptar();
    if (config.current.leerLetras) hablar(nombreHablado(letra));
  }

  function alDetectar(mano: Mano | null, t: number) {
    manoActual.current = mano?.vector ?? null;
    const s = seguimiento.current;
    const p = mano ? d.clasificador.predecir(mano.vector) : null;
    const valida = p && p.confianza >= config.current.umbral ? p.etiqueta : null;

    if (!valida) {
      s.candidata = null;
      if (!mano) s.aceptada = null; // bajar la mano permite repetir la letra
    } else if (valida !== s.candidata) {
      s.candidata = valida;
      s.desde = t;
    }

    let estabilidad = 0;
    if (s.candidata) {
      const sostenido = t - s.desde;
      if (s.candidata !== s.aceptada) {
        estabilidad = sostenido / config.current.sostener;
        if (sostenido >= config.current.sostener) {
          s.aceptada = s.candidata;
          s.aceptadaEn = t;
          aceptar(s.candidata);
        }
      } else if (t - s.aceptadaEn >= REPETIR_MS) {
        s.aceptadaEn = t;
        aceptar(s.candidata);
      }
    }

    if (t - s.ui > 60) {
      s.ui = t;
      setVista({ etiqueta: p?.etiqueta ?? null, confianza: p?.confianza ?? 0, estabilidad: Math.min(1, estabilidad), ranking: p?.ranking.slice(0, 3) ?? [] });
    }
  }

  if (!d.entrenamiento || d.total === 0) return <SinModelo ir={ir} />;

  const supera = vista.confianza >= umbral;
  const palabras = texto.split(" ");

  return (
    <div className="modulo hablar">
      <div className="columna-principal">
        <Camara alDetectar={alDetectar}>
          {vista.etiqueta && (
            <div className={`chip-prediccion ${supera ? "fuerte" : ""}`}>
              <strong>{vista.etiqueta}</strong> <span>{Math.round(vista.confianza * 100)}%</span>
            </div>
          )}
        </Camara>

        <div className="panel frase">
          <div className="frase-texto" aria-live="polite">
            {texto ? (
              palabras.map((p, i) => (
                <span key={i} className="palabra">
                  {p}
                  {i < palabras.length - 1 && " "}
                </span>
              ))
            ) : (
              <span className="frase-vacia">Las letras que aceptes aparecerán aquí…</span>
            )}
            <span className="cursor" />
          </div>
          <div className="frase-acciones">
            <button className="boton secundario" onClick={() => setTexto((t) => (t.endsWith(" ") || !t ? t : t + " "))}>
              ␣ Espacio
            </button>
            <button className="boton secundario" onClick={() => setTexto((t) => t.slice(0, -1))} disabled={!texto}>
              ⌫ Borrar
            </button>
            <button className="boton secundario" onClick={() => setTexto("")} disabled={!texto}>
              Limpiar
            </button>
            <button className="boton" onClick={() => hablar(texto.toLowerCase())} disabled={!texto.trim()}>
              🔊 Leer en voz alta
            </button>
          </div>
        </div>
      </div>

      <aside className="columna-lateral">
        <div className="panel lectura">
          <Anillo valor={vista.estabilidad} tamano={210} grosor={14} color={supera ? "var(--verde)" : "var(--acento)"}>
            <span className={`letra-viva ${supera ? "fuerte" : ""}`} key={destello}>
              {vista.etiqueta ?? "·"}
            </span>
          </Anillo>
          <div className="confianza">
            <div className="fila separar">
              <span className="sutil">Confianza</span>
              <strong>{Math.round(vista.confianza * 100)}%</strong>
            </div>
            <div className="barra">
              <div style={{ width: `${vista.confianza * 100}%` }} className={supera ? "ok" : ""} />
              <i style={{ left: `${umbral * 100}%` }} title="Umbral" />
            </div>
          </div>
          {vista.ranking.length > 1 && (
            <div className="ranking">
              {vista.ranking.map((r) => (
                <span key={r.etiqueta}>
                  {r.etiqueta} <small>{Math.round(r.puntaje * 100)}%</small>
                </span>
              ))}
            </div>
          )}
          <p className="muy-sutil centrado">Sostén la seña {(sostener / 1000).toLocaleString("es-CO")} s para aceptarla. Para repetir una letra, baja la mano o sigue sosteniéndola.</p>
        </div>

        <div className="panel espejo">
          <span className="muy-sutil">Tu mano en 3D</span>
          {!vista.etiqueta && !manoActual.current && <span className="espejo-pista">Aparecerá aquí cuando muestres tu mano a la cámara</span>}
          <Escenario distancia={5.4} particulas={false}>
            <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
              <Mano3D fuente={() => manoActual.current} colores={() => COLORES_DEDOS} />
            </Float>
          </Escenario>
        </div>

        <div className="panel ajustes">
          <label className="interruptor">
            <input type="checkbox" checked={leerLetras} onChange={(e) => setLeerLetras(e.target.checked)} />
            <span />
            Leer cada letra al aceptarla
          </label>
          <label className="deslizador">
            <span>Confianza mínima: {Math.round(umbral * 100)}%</span>
            <input type="range" min={0.3} max={0.95} step={0.05} value={umbral} onChange={(e) => setUmbral(Number(e.target.value))} />
          </label>
          <label className="deslizador">
            <span>Tiempo para aceptar: {(sostener / 1000).toLocaleString("es-CO")} s</span>
            <input type="range" min={300} max={1500} step={100} value={sostener} onChange={(e) => setSostener(Number(e.target.value))} />
          </label>
        </div>
      </aside>
    </div>
  );
}

export function SinModelo({ ir }: { ir: (m: Modulo) => void }) {
  return (
    <div className="vacio">
      <div className="vacio-icono">🖐️</div>
      <h2>Primero enséñale algunas señas</h2>
      <p>Graba muestras de unas cuantas letras o números en Captura y pulsa «Entrenar». Con 3 o 4 señas ya puedes probar.</p>
      <button className="boton grande" onClick={() => ir("captura")}>
        Ir a Captura
      </button>
    </div>
  );
}
