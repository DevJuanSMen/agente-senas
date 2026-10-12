import { useEffect, useState } from "react";
import { useDatos } from "./estado/Datos";
import { Inicio } from "./modulos/Inicio";
import { Captura } from "./modulos/Captura";
import { Hablar } from "./modulos/Hablar";
import { Practicar } from "./modulos/Practicar";

export type Modulo = "inicio" | "captura" | "hablar" | "practicar";

const PESTANAS: { id: Modulo; texto: string }[] = [
  { id: "inicio", texto: "Inicio" },
  { id: "captura", texto: "Captura" },
  { id: "hablar", texto: "Hablar con señas" },
  { id: "practicar", texto: "Practicar" },
];

const desdeHash = (): Modulo => {
  const h = location.hash.slice(1) as Modulo;
  return PESTANAS.some((p) => p.id === h) ? h : "inicio";
};

export function App() {
  const [modulo, setModulo] = useState<Modulo>(desdeHash);
  const d = useDatos();

  useEffect(() => {
    const alCambiar = () => setModulo(desdeHash());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  const ir = (m: Modulo) => {
    location.hash = m === "inicio" ? "" : m;
    setModulo(m);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <div className="fondo" aria-hidden>
        <div className="aurora a1" />
        <div className="aurora a2" />
        <div className="aurora a3" />
        <div className="rejilla-fondo" />
      </div>

      <header className="cabecera">
        <button className="marca" onClick={() => ir("inicio")}>
          <span className="marca-icono">🤟</span>
          <span>
            Señas <b>UPAR</b>
          </span>
        </button>
        <nav className="pestanas">
          {PESTANAS.map((p) => (
            <button key={p.id} className={modulo === p.id ? "activa" : ""} onClick={() => ir(p.id)}>
              {p.texto}
            </button>
          ))}
        </nav>
        <div className={`estado-pildora ${d.total === 0 ? "" : d.desactualizado ? "pendiente" : "ok"}`}>
          <i />
          {d.total === 0 ? "Sin muestras" : d.desactualizado ? "Muestras sin entrenar" : `Modelo listo · ${Object.keys(d.dataset.labels).length} señas`}
        </div>
      </header>

      <main className="contenido" key={modulo}>
        {modulo === "inicio" && <Inicio ir={ir} />}
        {modulo === "captura" && <Captura />}
        {modulo === "hablar" && <Hablar ir={ir} />}
        {modulo === "practicar" && <Practicar ir={ir} />}
      </main>
    </div>
  );
}
