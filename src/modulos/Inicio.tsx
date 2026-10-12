import { useMemo } from "react";
import { Float } from "@react-three/drei";
import { Escenario } from "../three/Escenario";
import { Mano3D } from "../three/Mano3D";
import { COLORES_DEDOS } from "../componentes/Camara";
import { POSES_PORTADA, interpolar } from "../lib/manoProcedural";
import { useDatos } from "../estado/Datos";
import { ESTATICAS } from "../lib/etiquetas";
import type { Modulo } from "../App";

const MODULOS: { id: Modulo; icono: string; titulo: string; texto: string }[] = [
  { id: "captura", icono: "◉", titulo: "Captura", texto: "Graba muestras de cada letra y número y entrena el reconocimiento en segundos." },
  { id: "hablar", icono: "✦", titulo: "Hablar con señas", texto: "Deletrea frente a la cámara: el sistema arma la palabra y la lee en voz alta." },
  { id: "practicar", icono: "◆", titulo: "Practicar", texto: "Una mano 3D te muestra la seña y te corrige dedo por dedo mientras la replicas." },
];

export function Inicio({ ir }: { ir: (m: Modulo) => void }) {
  const { dataset, total } = useDatos();
  const conMuestras = ESTATICAS.filter((e) => (dataset.labels[e]?.length ?? 0) > 0).length;

  // La mano de portada recorre poses genéricas (no son señas LSC) cada 2,2 s.
  const fuente = useMemo(() => {
    const periodo = 2.2;
    return () => {
      const t = performance.now() / 1000 / periodo;
      const i = Math.floor(t) % POSES_PORTADA.length;
      const f = Math.min(1, (t % 1) * 1.8); // transición y luego pausa en la pose
      return interpolar(POSES_PORTADA[i], POSES_PORTADA[(i + 1) % POSES_PORTADA.length], f);
    };
  }, []);

  return (
    <div className="inicio">
      <section className="portada">
        <div className="portada-texto">
          <span className="sobretitulo">Lengua de Señas Colombiana · Demo</span>
          <h1>
            Tus manos
            <br />
            <span className="degradado">también hablan.</span>
          </h1>
          <p>
            Aprende el alfabeto y los números de la LSC con una mano en 3D que te guía y una cámara que te entiende. Todo funciona en tu
            navegador: las imágenes nunca salen de tu equipo.
          </p>
          <div className="fila">
            <button className="boton grande" onClick={() => ir(total > 0 ? "practicar" : "captura")}>
              {total > 0 ? "Empezar a practicar" : "Grabar las primeras señas"}
            </button>
            <button className="boton fantasma grande" onClick={() => ir("hablar")}>
              Hablar con señas →
            </button>
          </div>
          <div className="portada-cifras">
            <div>
              <strong>{conMuestras}</strong>
              <span>de {ESTATICAS.length} señas grabadas</span>
            </div>
            <div>
              <strong>{total.toLocaleString("es-CO")}</strong>
              <span>muestras en el dataset</span>
            </div>
            <div>
              <strong>21</strong>
              <span>puntos por mano en 3D</span>
            </div>
          </div>
        </div>
        <div className="portada-3d">
          <div className="halo" />
          <Escenario autoRotar distancia={5.6}>
            <Float speed={1.6} rotationIntensity={0.35} floatIntensity={0.6}>
              <Mano3D fuente={fuente} colores={() => COLORES_DEDOS} suavizado={1} escala={1.15} />
            </Float>
          </Escenario>
          <span className="portada-nota">Arrastra para girar</span>
        </div>
      </section>

      <section className="tarjetas-modulos">
        {MODULOS.map((m, i) => (
          <button key={m.id} className="tarjeta-modulo" onClick={() => ir(m.id)} style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
            <span className="tarjeta-icono">{m.icono}</span>
            <strong>{m.titulo}</strong>
            <span>{m.texto}</span>
            <span className="tarjeta-flecha">→</span>
          </button>
        ))}
      </section>

      <p className="credito">
        Reconocimiento entrenado con el dataset{" "}
        <a href="https://data.mendeley.com/datasets/9ssyn8tff5/2" target="_blank" rel="noreferrer">
          LSC70
        </a>{" "}
        (Muñoz Galíndez, Villota Coral y Vargas-Cañas, Universidad del Cauca,{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        ), convertido a puntos de la mano con MediaPipe, más las muestras que grabes en Captura. Las explicaciones de cada seña están pendientes de validar por
        personas que conozcan LSC.
      </p>
    </div>
  );
}
