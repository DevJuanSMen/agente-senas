import { useMemo, useRef, useState } from "react";
import { Float } from "@react-three/drei";
import { Camara, COLORES_DEDOS } from "../componentes/Camara";
import { Anillo } from "../componentes/Anillo";
import { Escenario } from "../three/Escenario";
import { Mano3D } from "../three/Mano3D";
import { useDatos } from "../estado/Datos";
import { DINAMICAS, ESTATICAS, LETRAS, NUMEROS } from "../lib/etiquetas";
import { descargar, medoide, validar, type Dataset } from "../lib/dataset";
import { sonidos } from "../lib/sonido";
import type { Mano } from "../lib/deteccion";
import type { Vector } from "../lib/normalizar";

type Fase = { tipo: "inactivo" } | { tipo: "cuenta"; n: number } | { tipo: "grabando"; progreso: number };

const INTERVALO_MS = 45; // entre muestras durante la grabación

export function Captura() {
  const d = useDatos();
  const [etiqueta, setEtiqueta] = useState("A");
  const [objetivo, setObjetivo] = useState(40);
  const [fase, setFase] = useState<Fase>({ tipo: "inactivo" });
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [prediccion, setPrediccion] = useState<{ etiqueta: string; confianza: number } | null>(null);
  const [importado, setImportado] = useState<Dataset | null>(null);
  const [confirmar, setConfirmar] = useState<"etiqueta" | "todo" | null>(null);

  const grabacion = useRef<{ activa: boolean; buffer: Vector[]; ultimo: number; etiqueta: string; objetivo: number }>({
    activa: false, buffer: [], ultimo: 0, etiqueta: "A", objetivo: 40,
  });
  const ultimaUI = useRef(0);
  const muestras = d.dataset.labels[etiqueta]?.length ?? 0;
  const referencia = useMemo(() => medoide(d.dataset.labels[etiqueta] ?? []), [d.dataset, etiqueta]);

  const siguientePendiente = ESTATICAS.find((e) => e !== etiqueta && (d.dataset.labels[e]?.length ?? 0) === 0);

  function iniciarGrabacion() {
    if (fase.tipo !== "inactivo") return;
    setAviso(null);
    let n = 3;
    setFase({ tipo: "cuenta", n });
    sonidos.tic();
    const t = setInterval(() => {
      n--;
      if (n > 0) {
        setFase({ tipo: "cuenta", n });
        sonidos.tic();
        return;
      }
      clearInterval(t);
      sonidos.grabar();
      grabacion.current = { activa: true, buffer: [], ultimo: 0, etiqueta, objetivo };
      setFase({ tipo: "grabando", progreso: 0 });
    }, 800);
  }

  function alDetectar(mano: Mano | null, t: number) {
    const g = grabacion.current;
    if (g.activa && mano && t - g.ultimo >= INTERVALO_MS) {
      g.ultimo = t;
      g.buffer.push(mano.vector);
      setFase({ tipo: "grabando", progreso: g.buffer.length / g.objetivo });
      if (g.buffer.length >= g.objetivo) {
        g.activa = false;
        d.agregarMuestras(g.etiqueta, g.buffer);
        sonidos.exito();
        setFase({ tipo: "inactivo" });
        setAviso({ tipo: "ok", texto: `${g.buffer.length} muestras de «${g.etiqueta}» guardadas. Entrena para usarlas.` });
      }
    }
    // Prueba en vivo del modelo (refresco limitado para no saturar React).
    if (t - ultimaUI.current > 120) {
      ultimaUI.current = t;
      const p = mano && d.entrenamiento ? d.clasificador.predecir(mano.vector) : null;
      setPrediccion(p ? { etiqueta: p.etiqueta, confianza: p.confianza } : null);
    }
  }

  async function leerArchivo(f: File) {
    try {
      const nuevo = validar(JSON.parse(await f.text()));
      const n = Object.values(nuevo.labels).reduce((a, vs) => a + vs.length, 0);
      if (n === 0) throw new Error("El archivo no trae muestras válidas.");
      setImportado(nuevo);
      setAviso(null);
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo leer el archivo." });
    }
  }

  const grabando = fase.tipo !== "inactivo";

  return (
    <div className="modulo captura">
      <div className="columna-principal">
        <Camara alDetectar={alDetectar}>
          {fase.tipo === "cuenta" && (
            <div className="cuenta-regresiva" key={fase.n}>
              {fase.n}
            </div>
          )}
          {fase.tipo === "grabando" && (
            <>
              <div className="grabando">
                <Anillo valor={fase.progreso} tamano={150} grosor={12} color="var(--rojo)">
                  <span className="grabando-etiqueta">{etiqueta}</span>
                  <span className="grabando-texto">Grabando</span>
                </Anillo>
              </div>
              <span className="camara-pista">Mueve y gira un poco la mano para dar variedad</span>
            </>
          )}
          {!grabando && prediccion && (
            <div className="chip-prediccion">
              El modelo ve: <strong>{prediccion.etiqueta}</strong> <span>{Math.round(prediccion.confianza * 100)}%</span>
            </div>
          )}
        </Camara>

        <div className="panel grabar-panel">
          <div className="etiqueta-grande">{etiqueta}</div>
          <div className="grabar-info">
            <strong>{muestras} muestras guardadas</strong>
            <span>Recomendado: 2–3 grabaciones por seña, cambiando un poco la posición.</span>
            <label className="deslizador">
              <span>Muestras por grabación: {objetivo}</span>
              <input type="range" min={30} max={50} step={5} value={objetivo} onChange={(e) => setObjetivo(Number(e.target.value))} disabled={grabando} />
            </label>
          </div>
          <div className="grabar-acciones">
            <button className="boton grabar" onClick={iniciarGrabacion} disabled={grabando}>
              <span className="punto-rec" /> {grabando ? "Grabando…" : "Grabar"}
            </button>
            {siguientePendiente && !grabando && (
              <button className="boton fantasma" onClick={() => setEtiqueta(siguientePendiente)}>
                Siguiente sin grabar: {siguientePendiente} →
              </button>
            )}
          </div>
        </div>
        {aviso && <div className={`aviso ${aviso.tipo}`}>{aviso.texto}</div>}
      </div>

      <aside className="columna-lateral">
        <div className="panel">
          <h3>Señas</h3>
          <GrupoEtiquetas titulo="Letras" lista={LETRAS} actual={etiqueta} elegir={setEtiqueta} objetivo={objetivo} bloqueado={grabando} />
          <GrupoEtiquetas titulo="Números" lista={NUMEROS} actual={etiqueta} elegir={setEtiqueta} objetivo={objetivo} bloqueado={grabando} />
        </div>

        <div className="panel">
          <div className="fila separar">
            <h3>Seña «{etiqueta}»</h3>
            {muestras > 0 &&
              (confirmar === "etiqueta" ? (
                <span className="fila">
                  <button className="boton peligro pequeno" onClick={() => (d.borrarEtiqueta(etiqueta), setConfirmar(null))}>
                    Sí, borrar {muestras}
                  </button>
                  <button className="boton fantasma pequeno" onClick={() => setConfirmar(null)}>
                    Cancelar
                  </button>
                </span>
              ) : (
                <button className="boton fantasma pequeno" onClick={() => setConfirmar("etiqueta")}>
                  Borrar muestras
                </button>
              ))}
          </div>
          {referencia ? (
            <div className="vista-referencia">
              <Escenario distancia={5.2} particulas={false} autoRotar>
                <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
                  <Mano3D fuente={() => referencia} colores={() => COLORES_DEDOS} variante="referencia" suavizado={0.2} />
                </Float>
              </Escenario>
              <span className="muy-sutil">Pose más representativa de lo grabado</span>
            </div>
          ) : (
            <p className="sutil">Aún no hay muestras. Al grabar verás aquí la pose en 3D.</p>
          )}
          <label className="campo">
            <span>Cómo se forma (texto para el modo Practicar)</span>
            <textarea
              rows={3}
              value={d.dataset.descripciones[etiqueta] ?? ""}
              placeholder="Pendiente: que lo escriba o valide alguien que conozca LSC."
              onChange={(e) => d.definirDescripcion(etiqueta, e.target.value)}
            />
          </label>
        </div>

        <div className="panel">
          <h3>Modelo</h3>
          <div className="estado-modelo">
            <div>
              <strong>{d.total.toLocaleString("es-CO")}</strong>
              <span>muestras</span>
            </div>
            <div>
              <strong>{Object.keys(d.dataset.labels).length}</strong>
              <span>señas</span>
            </div>
            <div>
              <strong>{d.entrenamiento ? d.clasificador.nombre : "—"}</strong>
              <span>{d.entrenamiento && !d.desactualizado ? "al día" : "sin entrenar"}</span>
            </div>
          </div>
          <button
            className={`boton ancho ${d.desactualizado && d.total > 0 ? "llamativo" : "secundario"}`}
            onClick={d.entrenar}
            disabled={d.entrenando || d.total === 0}
          >
            {d.entrenando ? <span className="girando" /> : "⚡"} {d.entrenando ? "Entrenando…" : d.desactualizado ? "Entrenar con las muestras actuales" : "Volver a entrenar"}
          </button>
          <div className="fila">
            <button className="boton secundario" onClick={() => descargar(d.dataset)} disabled={d.total === 0}>
              Exportar JSON
            </button>
            <label className="boton secundario">
              Importar JSON
              <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])} />
            </label>
          </div>
          <div className="base-lsc70">
            <div>
              <strong>Dataset base LSC70</strong>
              <span className="muy-sutil">Alfabeto y números de 70 personas, validado por expertos de la Universidad del Cauca.</span>
            </div>
            <div className="fila">
              <button className="boton pequeno" onClick={() => d.cargarBase("combinar").catch(() => setAviso({ tipo: "error", texto: "No se pudo cargar el dataset base." }))} disabled={d.cargandoBase || grabando}>
                {d.cargandoBase ? "Cargando…" : "Sumar a lo actual"}
              </button>
              <button className="boton pequeno secundario" onClick={() => d.cargarBase("reemplazar").catch(() => setAviso({ tipo: "error", texto: "No se pudo cargar el dataset base." }))} disabled={d.cargandoBase || grabando}>
                Usar solo LSC70
              </button>
            </div>
          </div>
          {importado && (
            <div className="aviso info columna">
              <span>
                El archivo trae {Object.values(importado.labels).reduce((a, vs) => a + vs.length, 0)} muestras de {Object.keys(importado.labels).length} señas.
              </span>
              <div className="fila">
                <button className="boton pequeno" onClick={() => (d.importar(importado, "combinar"), setImportado(null))}>
                  Sumar a lo actual
                </button>
                <button className="boton pequeno secundario" onClick={() => (d.importar(importado, "reemplazar"), setImportado(null))}>
                  Reemplazar todo
                </button>
                <button className="boton pequeno fantasma" onClick={() => setImportado(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {d.total > 0 &&
            (confirmar === "todo" ? (
              <div className="fila">
                <span className="sutil">¿Borrar las {d.total} muestras?</span>
                <button className="boton peligro pequeno" onClick={() => (d.borrarTodo(), setConfirmar(null))}>
                  Borrar todo
                </button>
                <button className="boton fantasma pequeno" onClick={() => setConfirmar(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button className="enlace-peligro" onClick={() => setConfirmar("todo")}>
                Borrar todo el dataset
              </button>
            ))}
          {d.avisoGuardado && <div className="aviso error">{d.avisoGuardado}</div>}
        </div>
      </aside>
    </div>
  );
}

function GrupoEtiquetas({ titulo, lista, actual, elegir, objetivo, bloqueado }: {
  titulo: string;
  lista: string[];
  actual: string;
  elegir: (e: string) => void;
  objetivo: number;
  bloqueado: boolean;
}) {
  const { dataset } = useDatos();
  return (
    <div className="grupo-etiquetas">
      <span className="muy-sutil">{titulo}</span>
      <div className="rejilla-etiquetas">
        {lista.map((e) => {
          const dinamica = DINAMICAS.has(e);
          const n = dataset.labels[e]?.length ?? 0;
          return (
            <button
              key={e}
              className={`etiqueta ${e === actual ? "activa" : ""} ${n > 0 ? "con-datos" : ""}`}
              disabled={dinamica || bloqueado}
              onClick={() => elegir(e)}
              title={dinamica ? "Pendiente (seña dinámica, fase 2)" : `${n} muestras`}
            >
              <span>{e}</span>
              {dinamica ? <small>dinámica</small> : <i style={{ width: `${Math.min(1, n / (objetivo * 2)) * 100}%` }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
