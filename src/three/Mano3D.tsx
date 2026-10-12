// Mano volumétrica en 3D a partir de los 21 puntos normalizados.
// Articulaciones = esferas, falanges = cilindros que se afinan hacia la punta,
// palma = superficie. Todo se actualiza en cada frame sin re-render de React.

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Vector } from "../lib/normalizar";

// Conexiones (falanges + contorno de la palma) y a qué dedo pertenece cada una.
const HUESOS: [number, number, number][] = [
  [0, 1, 0], [1, 2, 0], [2, 3, 0], [3, 4, 0],
  [5, 6, 1], [6, 7, 1], [7, 8, 1],
  [9, 10, 2], [10, 11, 2], [11, 12, 2],
  [13, 14, 3], [14, 15, 3], [15, 16, 3],
  [17, 18, 4], [18, 19, 4], [19, 20, 4],
  [0, 5, -1], [5, 9, -1], [9, 13, -1], [13, 17, -1], [0, 17, -1],
];
const DEDO_DE_PUNTO = [-1, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4];
// Radio de cada articulación: la muñeca y los nudillos más gruesos, las puntas finas.
const RADIOS = [
  0.16, 0.12, 0.105, 0.095, 0.085,
  0.105, 0.088, 0.078, 0.07,
  0.108, 0.09, 0.08, 0.072,
  0.102, 0.086, 0.076, 0.068,
  0.092, 0.075, 0.066, 0.06,
];
const CONTORNO_PALMA = [0, 1, 2, 5, 9, 13, 17];

export type Variante = "piel" | "referencia" | "fantasma";

type Props = {
  /** Vector actual. Se llama en cada frame; devolver null oculta la mano. */
  fuente: () => Vector | null;
  /** Colores por dedo (5) o uno para toda la mano. Se consulta en cada frame. */
  colores?: () => string[] | string;
  variante?: Variante;
  /** 0–1: cuánto sigue la mano al objetivo por frame (1 = sin suavizado). */
  suavizado?: number;
  escala?: number;
};

const ARRIBA = new THREE.Vector3(0, 1, 0);

export function Mano3D({ fuente, colores, variante = "piel", suavizado = 0.35, escala = 1 }: Props) {
  const articulaciones = useRef<THREE.InstancedMesh>(null);
  const huesos = useRef<THREE.InstancedMesh>(null);
  const palma = useRef<THREE.Mesh>(null);
  const grupo = useRef<THREE.Group>(null);

  const actual = useMemo(() => Array.from({ length: 21 }, () => new THREE.Vector3()), []);
  const iniciado = useRef(false);
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), d: new THREE.Vector3(), c: new THREE.Color(), objetivo: new THREE.Vector3() }),
    [],
  );

  const geoPalma = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((CONTORNO_PALMA.length + 1) * 3), 3));
    const indices: number[] = [];
    for (let i = 0; i < CONTORNO_PALMA.length; i++) indices.push(0, i + 1, ((i + 1) % CONTORNO_PALMA.length) + 1);
    g.setIndex(indices);
    return g;
  }, []);

  const material = useMemo(() => crearMaterial(variante), [variante]);
  const materialPalma = useMemo(() => {
    const m = crearMaterial(variante);
    m.side = THREE.DoubleSide;
    if (variante !== "fantasma") {
      m.transparent = true;
      m.opacity = variante === "referencia" ? 0.75 : 0.85;
    }
    return m;
  }, [variante]);

  // Color inicial de las instancias (instanceColor se crea al asignar el primero).
  useLayoutEffect(() => {
    const blanco = new THREE.Color("#ffffff");
    for (let i = 0; i < 21; i++) articulaciones.current?.setColorAt(i, blanco);
    for (let i = 0; i < HUESOS.length; i++) huesos.current?.setColorAt(i, blanco);
  }, []);

  useFrame(() => {
    const v = fuente();
    const g = grupo.current;
    if (!g) return;
    g.visible = !!v;
    if (!v) {
      iniciado.current = false;
      return;
    }
    // Normalizado (x der., y abajo, z lejos) → three (espejo tipo selfie, y arriba, z hacia la cámara).
    const a = iniciado.current ? suavizado : 1;
    for (let i = 0; i < 21; i++) {
      tmp.objetivo.set(-v[i * 3], -v[i * 3 + 1], -v[i * 3 + 2]);
      actual[i].lerp(tmp.objetivo, a);
    }
    iniciado.current = true;

    const cs = colores?.();
    const colorDe = (dedo: number) => (Array.isArray(cs) ? cs[dedo] ?? cs[2] : cs) ?? "#ffffff";
    const colorPalma = Array.isArray(cs) ? cs[2] : cs;

    const J = articulaciones.current!;
    for (let i = 0; i < 21; i++) {
      const r = RADIOS[i];
      tmp.m.compose(actual[i], tmp.q.identity(), tmp.s.set(r, r, r));
      J.setMatrixAt(i, tmp.m);
      J.setColorAt(i, tmp.c.set(colorDe(DEDO_DE_PUNTO[i] === -1 ? 2 : DEDO_DE_PUNTO[i])));
    }
    J.instanceMatrix.needsUpdate = true;
    if (J.instanceColor) J.instanceColor.needsUpdate = true;

    const H = huesos.current!;
    HUESOS.forEach(([a1, b1, dedo], k) => {
      const pa = actual[a1];
      const pb = actual[b1];
      tmp.d.subVectors(pb, pa);
      const largo = tmp.d.length();
      const r = (dedo === -1 ? 0.55 : 0.82) * Math.min(RADIOS[a1], RADIOS[b1]);
      tmp.p.addVectors(pa, pb).multiplyScalar(0.5);
      tmp.q.setFromUnitVectors(ARRIBA, tmp.d.normalize());
      tmp.m.compose(tmp.p, tmp.q, tmp.s.set(r, largo, r));
      H.setMatrixAt(k, tmp.m);
      H.setColorAt(k, tmp.c.set(colorDe(dedo === -1 ? 2 : dedo)));
    });
    H.instanceMatrix.needsUpdate = true;
    if (H.instanceColor) H.instanceColor.needsUpdate = true;

    // Palma: abanico desde el centro del contorno.
    const pos = geoPalma.getAttribute("position") as THREE.BufferAttribute;
    tmp.p.set(0, 0, 0);
    for (const i of CONTORNO_PALMA) tmp.p.add(actual[i]);
    tmp.p.divideScalar(CONTORNO_PALMA.length);
    pos.setXYZ(0, tmp.p.x, tmp.p.y, tmp.p.z);
    CONTORNO_PALMA.forEach((i, k) => pos.setXYZ(k + 1, actual[i].x, actual[i].y, actual[i].z));
    pos.needsUpdate = true;
    geoPalma.computeVertexNormals();
    geoPalma.computeBoundingSphere();
    if (colorPalma) (palma.current!.material as THREE.MeshPhysicalMaterial).color.set(colorPalma);
  });

  return (
    // La mano mide ~2 unidades desde la muñeca: se baja para centrarla.
    <group ref={grupo} scale={escala} position={[0, -0.95 * escala, 0]} visible={false}>
      <instancedMesh ref={articulaciones} args={[undefined, undefined, 21]} material={material} castShadow frustumCulled={false}>
        <sphereGeometry args={[1, 24, 16]} />
      </instancedMesh>
      <instancedMesh ref={huesos} args={[undefined, undefined, HUESOS.length]} material={material} castShadow frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 18, 1, true]} />
      </instancedMesh>
      <mesh ref={palma} geometry={geoPalma} material={materialPalma} castShadow frustumCulled={false} />
    </group>
  );
}

function crearMaterial(variante: Variante) {
  if (variante === "fantasma")
    return new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.32,
      roughness: 0.15,
      depthWrite: false,
      emissive: new THREE.Color("#7dd3fc"),
      emissiveIntensity: 0.25,
    });
  if (variante === "referencia")
    return new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.18,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      iridescence: 1,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [120, 420],
    });
  return new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.32,
    metalness: 0.05,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    sheen: 1,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color("#c4b5fd"),
  });
}
