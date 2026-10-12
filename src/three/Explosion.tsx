// Estallido de partículas de colores al acertar una seña.
// Cambia `disparo` (p. ej. un contador) para lanzar uno nuevo.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const N = 160;
const DURACION = 1.4;
const PALETA = ["#a78bfa", "#67e8f9", "#f472b6", "#fde68a", "#86efac"];

export function Explosion({ disparo }: { disparo: number }) {
  const puntos = useRef<THREE.Points>(null);
  const inicio = useRef(-Infinity);
  const velocidades = useMemo(() => new Float32Array(N * 3), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const colores = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      c.set(PALETA[i % PALETA.length]);
      colores.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colores, 3));
    return g;
  }, []);

  useEffect(() => {
    if (disparo === 0) return;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      // Dirección aleatoria en la esfera con algo más de impulso hacia arriba.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const rapidez = 2 + Math.random() * 3.5;
      velocidades.set([s * Math.cos(t) * rapidez, u * rapidez + 1.5, s * Math.sin(t) * rapidez], i * 3);
      pos.setXYZ(i, 0, 0.2, 0);
    }
    pos.needsUpdate = true;
    inicio.current = performance.now() / 1000;
  }, [disparo, geo, velocidades]);

  useFrame((_, dt) => {
    const p = puntos.current;
    if (!p) return;
    const t = performance.now() / 1000 - inicio.current;
    p.visible = t < DURACION;
    if (!p.visible) return;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      velocidades[i * 3 + 1] -= 4.5 * dt; // gravedad
      for (let k = 0; k < 3; k++) velocidades[i * 3 + k] *= 0.985;
      pos.setXYZ(i, pos.getX(i) + velocidades[i * 3] * dt, pos.getY(i) + velocidades[i * 3 + 1] * dt, pos.getZ(i) + velocidades[i * 3 + 2] * dt);
    }
    pos.needsUpdate = true;
    (p.material as THREE.PointsMaterial).opacity = 1 - (t / DURACION) ** 2;
  });

  return (
    <points ref={puntos} geometry={geo} visible={false} frustumCulled={false}>
      <pointsMaterial size={0.09} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}
