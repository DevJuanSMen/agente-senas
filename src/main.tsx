import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "./estilos.css";
import { App } from "./App";
import { ProveedorDatos } from "./estado/Datos";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProveedorDatos>
      <App />
    </ProveedorDatos>
  </StrictMode>,
);
