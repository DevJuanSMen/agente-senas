import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // MediaPipe trae su propio wasm; no hace falta que Vite lo pre-empaquete.
  optimizeDeps: { exclude: ["@mediapipe/tasks-vision"] },
});
