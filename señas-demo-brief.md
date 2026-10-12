# Brief: Demo web de Lengua de Señas Colombiana (LSC)

## Contexto
Proyecto web para fomentar el lenguaje inclusivo, centrado en la lengua de señas. La idea es salir del típico "aquí hay una foto, imítala": la experiencia debe ser viva e interactiva.

Esta demo cubre **solo señas estáticas: letras y números de LSC**. Las señas dinámicas (palabras con movimiento) quedan para una fase posterior. Las muestras reales de LSC las irá grabando más adelante una persona que conozca la lengua, así que la demo debe permitir **capturar y entrenar desde el navegador**.

> Nota: algunas letras de LSC llevan movimiento (p. ej. J, Ñ, Z). Excluirlas de esta demo o marcarlas como "pendiente (dinámica)".

## Stack
- Frontend puro, sin backend: HTML + JS (Vite opcional).
- **MediaPipe Hand Landmarker** (`@mediapipe/tasks-vision`): 21 puntos 3D por mano desde la webcam.
- **TensorFlow.js** o un kNN propio en JS para clasificar.
- **Web Speech API** (`speechSynthesis`, voz `es-CO` o `es-*`) para hablar.
- **three.js** + **Kalidokit** para la mano 3D del modo práctica.
- Persistencia de muestras en `localStorage` y exportar/importar JSON.

## Módulos

### 1. Herramienta de captura y entrenamiento
- Vista de webcam con los landmarks dibujados encima.
- Selector de etiqueta (A–Z sin las dinámicas, 0–9).
- Botón "Grabar": guarda ~30–50 muestras (frames) de la etiqueta seleccionada.
- Contador de muestras por etiqueta.
- Exportar / importar dataset en JSON (para que quien sepa LSC lo alimente después).
- Botón "Entrenar" que construye el clasificador con las muestras actuales.

**Normalización de landmarks (clave):**
- Trasladar todos los puntos relativos a la muñeca (landmark 0).
- Escalar por el tamaño de la mano (p. ej. distancia muñeca → base del dedo medio, landmark 9).
- Opcional: normalizar la mano izquierda espejando en X para tener un solo modelo.
- Vector de entrada: 21 × 3 = 63 valores.

**Clasificador:** empezar con kNN (k≈5) sobre los vectores normalizados. Dejar la interfaz preparada para cambiar a una red pequeña en TF.js.

### 2. Modo "Yo hablo con señas" (reconocimiento → voz)
- Webcam + reconocimiento en vivo, mostrando la letra detectada y su confianza.
- **Estabilidad:** aceptar una seña solo si se mantiene igual ~0.5 s con confianza sobre un umbral, para no disparar en cada frame.
- Las letras aceptadas se acumulan en una palabra/frase visible.
- Botones: "Espacio", "Borrar", "Leer en voz alta". Opción de que lea cada letra al aceptarla.
- `speechSynthesis` en español.

### 3. Modo "Aprende y replica" (práctica)
- El sistema elige una letra/número y muestra:
  - Una **mano 3D** (three.js) en la pose de referencia, generada a partir de una muestra grabada en el dataset (usar Kalidokit para pasar landmarks → rotaciones de huesos). Si el rig 3D se complica en la demo, aceptable como fallback: esqueleto 3D de los 21 puntos con líneas, rotable con el mouse.
  - Una breve explicación en texto de cómo se forma la seña.
- El usuario la replica frente a la cámara.
- Comparación en tiempo real contra la pose de referencia (similitud entre vectores normalizados, p. ej. distancia euclidiana o coseno):
  - Barra de progreso / porcentaje de coincidencia.
  - Feedback por dedo (verde/rojo) comparando ángulos de cada dedo.
- Al superar el umbral durante ~0.5 s: marcar como correcta, sonido/animación de éxito, siguiente seña.
- Puntaje de la sesión.

## Datos de arranque
No hay dataset de LSC todavía. La demo debe funcionar así:
1. El desarrollador graba unas pocas muestras con la herramienta de captura.
2. Entrena y prueba los modos.
3. Más adelante se importa un JSON grabado por alguien que conozca LSC.

Incluir un `sample-dataset.json` vacío o con estructura de ejemplo:
```json
{
  "version": 1,
  "labels": {
    "A": [[/* 63 números normalizados */], ...],
    "1": [...]
  }
}
```

## UI / UX
- Layout con aire, nada apiñado: buen espacio entre inputs, botones y bloques.
- Navegación simple entre los 3 módulos (tabs o menú): Captura · Hablar con señas · Practicar.
- Webcam grande y protagonista; feedback visual claro (colores, tamaños de letra grandes).
- Funcionar en Chrome de escritorio; pedir permiso de cámara con un mensaje amigable.
- Textos de la interfaz en español.

## Fuera de alcance (por ahora)
- Señas dinámicas / palabras completas (fase 2: secuencias + LSTM o DTW).
- Backend, cuentas de usuario.
- Dataset LSC real.

## Referencias
- google-ai-edge/mediapipe (versión web: `@mediapipe/tasks-vision`)
- yeemachine/kalidokit
- mrdoob/three.js
- sign/translate (sign.mt) como referencia de arquitectura

## Entregable esperado
Una demo ejecutable localmente (`npm run dev` o abrir `index.html` con un servidor estático) con los 3 módulos funcionando de punta a punta con muestras grabadas por el propio usuario.
