// Escenario 3D común: luz de estudio (Lightformers, sin HDR externos),
// sombra de contacto, partículas de ambiente y cámara orbitable.

import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, Sparkles } from "@react-three/drei";

type Props = {
  children: ReactNode;
  orbitar?: boolean;
  autoRotar?: boolean;
  distancia?: number;
  particulas?: boolean;
  className?: string;
};

export function Escenario({ children, orbitar = true, autoRotar = false, distancia = 6, particulas = true, className }: Props) {
  return (
    <div className={`escenario ${className ?? ""}`}>
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ position: [0, 0.2, distancia], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-4, 1, -2]} intensity={18} color="#8b5cf6" />
        <pointLight position={[4, -1, 2]} intensity={10} color="#22d3ee" />

        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[8, 3, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={3} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} color="#a78bfa" />
          <Lightformer form="rect" intensity={3} position={[5, 0, 1]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#67e8f9" />
          <Lightformer form="ring" intensity={1.5} position={[0, -3, -4]} scale={4} color="#f472b6" />
        </Environment>

        {children}

        <ContactShadows position={[0, -1.35, 0]} opacity={0.45} scale={7} blur={2.6} far={3} color="#1e1b4b" />
        {particulas && <Sparkles count={60} scale={[7, 4, 4]} size={2.2} speed={0.25} opacity={0.5} color="#c4b5fd" />}
        {orbitar && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            autoRotate={autoRotar}
            autoRotateSpeed={0.8}
            minPolarAngle={Math.PI * 0.25}
            maxPolarAngle={Math.PI * 0.7}
            enableDamping
          />
        )}
      </Canvas>
    </div>
  );
}
