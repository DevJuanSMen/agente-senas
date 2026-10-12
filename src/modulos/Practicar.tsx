import { useEffect, useMemo, useRef, useState } from "react";
import { Float } from "@react-three/drei";
import { Camara } from "../componentes/Camara";
import { Anillo } from "../componentes/Anillo";
import { Escenario } from "../three/Escenario";
import { Mano3D } from "../three/Mano3D";
import { Explosion } from "../three/Explosion";
import { useDatos } from "../estado/Datos";
import { SinModelo } from "./Hablar";
import { ESTATICAS, esNumero, nombreHablado } from "../lib/etiquetas";
import { medoide } from "../lib/dataset";
import { comparar, type Comparacion } from "../lib/comparar";
import { hablar } from "../lib/voz";
import { sonidos } from "../lib/sonido";
import type { Mano } from "../lib/deteccion";
import type { Vector } from "../lib/normalizar";
import type { Modulo } from "../App";

const SOSTENER_MS = 500;
type Filtro = "todas" | "letras" | "numeros";

// Rojo → ámbar → verde según el puntaje del dedo.
function colorPuntaje(p: number) {
  if (p >= 0.8) return "#34d399";
  if (p >= 0.55) return "#fbbf24";
  return "#f87171";
}

function barajar<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Practicar({ ir }: { ir: (m: Modulo) => void }) {
  const d = useDatos();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [umbral, setUmbral] = useState(0.75);
  const [superponer, setSuperponer] = useState(true);
  const [cola, setCola] = useState<string[]>([]);
  const [indice, setIndice] = useState(0);
  const [puntos, setPuntos] = useState({ aciertos: 0, racha: 0, mejorRacha: 0, saltadas: 0 });
  const [vista, setVista] = useState<{ comp: Comparacion | null; sostenido: number }>({ comp: null, sostenido: 0 });
  const [exito, setExito] = useState(0);
  const [celebrando, setCelebrando] = useState(false);

  const disponibles = useMemo(
    () =>
      ESTATICAS.filter((e) => (d.dataset.labels[e]?.length ?? 0) > 0).filter((e) =>
        filtro === "todas" ? true : filtro === "numeros" ? esNumero(e) : !esNumero(e),
      ),
    [d.dataset, filtro],
  );

  // Nueva ronda barajada cada vez que cambia lo disponible.
  useEffect(() => {
    setCola(barajar(disponibles));
    setIndice(0);
  }, [disponibles]);

  const objetivo = cola[indice % Math.max(1, cola.length)];
  const referencia = useMemo(() => (objetivo ? medoide(d.dataset.labels[objetivo] ?? []) : null), [d.dataset, objetivo]);

  const manoActual = useRef<Vector | null>(null);
  const compActual = useRef<Comparacion | null>(null);
  const estado = useRef({ desde: 0, ui: 0, bloqueado: false });
  const config = useRef({ umbral, referencia });
  config.current = { umbral, referencia };

  function siguiente(acerto: boolean) {
    setPuntos((p) =>
      acerto
        ? { ...p, aciertos: p.aciertos + 1, racha: p.racha + 1, mejorRacha: Math.max(p.mejorRacha, p.racha + 1) }
        : { ...p, racha: 0, saltadas: p.saltadas + 1 },
    );
    setIndice((i) => {
      const n = i + 1;
      if (n >= cola.length) {
        setCola((c) => (c.length > 1 ? barajar(c) : c));
        return 0;
      }
      return n;
    });
  }

  function alDetectar(mano: Mano | null, t: number) {
    manoActual.current = mano?.vector ?? null;
    const ref = config.current.referencia;
    const e = estado.current;
    const comp = mano && ref ? comparar(mano.vector, ref) : null;
    compActual.current = comp;
    if (e.bloqueado) return;

    if (!comp || comp.global < config.current.umbral) e.desde = t;
    const sostenido = comp ? (t - e.desde) / SOSTENER_MS : 0;

    if (sostenido >= 1) {
      e.bloqueado = true;
      sonidos.exito();
      setExito((n) => n + 1);
      setCelebrando(true);
      setTimeout(() => {
        setCelebrando(false);
        siguiente(true);
        estado.current = { desde: performance.now(), ui: 0, bloqueado: false };
      }, 1300);
    }
    if (t - e.ui > 70) {
      e.ui = t;
      setVista({ comp, sostenido: Math.min(1, sostenido) });
    }
  }

  // Anuncia la seña nueva en voz alta.
  useEffect(() => {
    if (objetivo) hablar(`${esNumero(objetivo) ? "Número" : "Letra"} ${nombreHablado(objetivo)}`);
  }, [objetivo, indice]);

  if (!d.entrenamiento || d.total === 0) return <SinModelo ir={ir} />;

  const comp = vista.comp;
  const global = comp?.global ?? 0;
  const descripcion = objetivo ? d.dataset.descripciones[objetivo] : "";

  return (
    <div className="modulo practicar">
      <div className="columna-principal">
        <div className="escena-practica">
          <Escenario distancia={5.4}>
            <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.35}>
              <group position={superponer ? [0, 0, 0] : [-1.15, 0, 0]}>
                <Mano3D fuente={() => config.current.referencia} variante="referencia" suavizado={0.15} />
              </group>
              <group position={superponer ? [0, 0, 0.02] : [1.15, 0, 0]}>
                <Mano3D
                  fuente={() => manoActual.current}
                  variante={superponer ? "fantasma" : "piel"}
                  colores={() => compActual.current?.dedos.map((x) => colorPuntaje(x.puntaje)) ?? "#94a3b8"}
                />
              </group>
            </Float>
            <Explosion disparo={exito} />
          </Escenario>

          <div className="hud-objetivo">
            <span className="sobretitulo">{objetivo && esNumero(objetivo) ? "Número" : "Letra"}</span>
            <span className={`hud-letra ${celebrando ? "celebra" : ""}`} key={objetivo + indice}>
              {objetivo ?? "—"}
            </span>
          </div>
          {celebrando && <div className="hud-exito">¡Muy bien!</div>}
          <div className="hud-controles">
            <div className="segmentado">
              <button className={superponer ? "activo" : ""} onClick={() => setSuperponer(true)}>
                Superponer
              </button>
              <button className={!superponer ? "activo" : ""} onClick={() => setSuperponer(false)}>
                Lado a lado
              </button>
            </div>
            <span className="muy-sutil">Arrastra para girar la mano</span>
          </div>
          <div className="hud-leyenda">
            <span><i className="muestra-ref" /> Referencia</span>
            <span><i className="muestra-tu" /> Tu mano</span>
          </div>
        </div>

        <div className="panel explicacion">
          <h3>Cómo se forma</h3>
          {descripcion ? (
            <p>{descripcion}</p>
          ) : (
            <p className="sutil">
              Imita la mano de referencia: gírala para verla desde todos los ángulos. (La explicación escrita de esta seña está pendiente de validar por
              alguien que conozca LSC; se puede agregar en Captura.)
            </p>
          )}
        </div>
      </div>

      <aside className="columna-lateral">
        <div className="panel coincidencia">
          <Anillo valor={global} tamano={190} grosor={14} color={colorPuntaje(global)}>
            <span className="porcentaje">{Math.round(global * 100)}%</span>
            <span className="muy-sutil">coincidencia</span>
          </Anillo>
          <div className="sostener">
            <div className="barra">
              <div className="ok" style={{ width: `${vista.sostenido * 100}%` }} />
            </div>
            <span className="muy-sutil">{global >= umbral ? "¡Sostén la seña!" : `Llega a ${Math.round(umbral * 100)}% y sostenla medio segundo`}</span>
          </div>
          <ul className="dedos">
            {(comp?.dedos ?? []).map((x) => (
              <li key={x.clave}>
                <span className="dedo-icono" style={{ background: colorPuntaje(x.puntaje) }}>
                  {x.puntaje >= 0.8 ? "✓" : x.puntaje >= 0.55 ? "~" : "✗"}
                </span>
                <span className="crece">{x.nombre}</span>
                <div className="barra mini">
                  <div style={{ width: `${x.puntaje * 100}%`, background: colorPuntaje(x.puntaje) }} />
                </div>
              </li>
            ))}
            {!comp && <li className="sutil">Muestra tu mano a la cámara para comparar.</li>}
          </ul>
        </div>

        <Camara compacta alDetectar={alDetectar} coloresDedos={() => compActual.current?.dedos.map((x) => colorPuntaje(x.puntaje)) ?? null} />

        <div className="panel marcador">
          <div>
            <strong>{puntos.aciertos}</strong>
            <span>aciertos</span>
          </div>
          <div>
            <strong>{puntos.racha}🔥</strong>
            <span>racha</span>
          </div>
          <div>
            <strong>{puntos.mejorRacha}</strong>
            <span>mejor racha</span>
          </div>
        </div>

        <div className="panel ajustes">
          <div className="segmentado">
            {(["todas", "letras", "numeros"] as Filtro[]).map((f) => (
              <button key={f} className={filtro === f ? "activo" : ""} onClick={() => setFiltro(f)}>
                {f === "todas" ? "Todas" : f === "letras" ? "Letras" : "Números"}
              </button>
            ))}
          </div>
          <label className="deslizador">
            <span>Exigencia: {Math.round(umbral * 100)}%</span>
            <input type="range" min={0.6} max={0.95} step={0.05} value={umbral} onChange={(e) => setUmbral(Number(e.target.value))} />
          </label>
          <button className="boton secundario" onClick={() => siguiente(false)} disabled={celebrando || cola.length === 0}>
            Saltar esta seña →
          </button>
          {disponibles.length === 0 && <span className="sutil">No hay señas grabadas en este grupo.</span>}
          <span className="muy-sutil">
            Practicando con {disponibles.length} {disponibles.length === 1 ? "seña grabada" : "señas grabadas"}.
          </span>
        </div>
      </aside>
    </div>
  );
}
