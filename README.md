# Señas UPAR · Demo de Lengua de Señas Colombiana

Demo web (sin backend) para aprender y usar las **letras y números estáticos de LSC**. Todo corre en el navegador: la cámara se procesa en el equipo y no se envía a ningún servidor.

## Cómo correrla

```bash
npm install      # instala dependencias y deja MediaPipe en public/mediapipe (descarga el modelo ~8 MB una vez)
npm run dev      # abre http://localhost:5173
```

Usa **Chrome de escritorio**. La cámara solo funciona en `localhost` o con HTTPS.
Si `public/mediapipe` no existe (por ejemplo, tras clonar sin correr `npm install`): `node scripts/preparar-modelo.mjs`.

## Módulos

| Módulo | Qué hace |
|---|---|
| **Captura** | Elige una seña, pulsa *Grabar* (cuenta regresiva 3-2-1) y se guardan 30–50 muestras. Muestra la pose guardada en 3D, permite escribir cómo se forma la seña y **entrenar**, **exportar** e **importar** el dataset JSON. |
| **Hablar con señas** | Reconoce la seña en vivo. Si se sostiene ~0,5 s con suficiente confianza, la letra se agrega a la frase. Botones: espacio, borrar, limpiar y leer en voz alta (`es-CO` si está disponible). Para repetir una letra (LL, RR): bajar la mano o seguir sosteniéndola. |
| **Practicar** | Mano 3D de referencia (iridiscente, se puede girar) con tu mano superpuesta en vivo. Cada dedo se pinta de verde, ámbar o rojo. Al pasar el umbral durante 0,5 s: sonido, partículas y siguiente seña. |

Las letras con movimiento (**G, H, J, Ñ, S, Z**, según LSC70) aparecen como *dinámica* y quedan para la fase 2. La lista está en `src/lib/etiquetas.ts`.

## Dataset base: LSC70

La primera vez que se abre la app carga sola `public/datasets/lsc70.json` y entrena.
- **Contenido:** 31 señas y 6 510 muestras de **70 personas**, extraídas del dataset **LSC70** de la Universidad del Cauca, validado por expertos.
- **Precisión:** 82,5 % con personas que el modelo no ha visto.
- **Recargarlo:** desde Captura → *Dataset base LSC70*. Las muestras propias que grabes se suman encima.
- **Crédito:** LSC70, J. A. Muñoz Galíndez, L. V. Villota Coral y R. Vargas-Cañas, Universidad del Cauca (doi:10.17632/9ssyn8tff5.2), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Se convirtieron las imágenes en puntos de la mano; no se incluye ninguna imagen.
- **Detalles y scripts:** `scripts/lsc70/LEEME.md`.

## Cámara

Si el PC tiene cámaras virtuales (OBS, EShare, Teams…), la app elige sola una física. Se puede cambiar con el selector 📷 abajo a la derecha del video, y la elección se recuerda.

## Flujo para la demo

1. Abre la app: el dataset LSC70 ya viene cargado y entrenado.
2. Prueba **Hablar con señas** y **Practicar**.
3. Para mejorar el reconocimiento con tu propia mano, graba en **Captura** las señas que más fallen y pulsa **Entrenar**.
4. Si alguien que conozca LSC graba más muestras, se **importa** su JSON en Captura (*Sumar* o *Reemplazar*).

## Cómo funciona

- **Detección:** MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`), 21 puntos 3D por mano. Usa la GPU si está disponible y, si no, la CPU.
- **Normalización** (`src/lib/normalizar.ts`): los puntos se toman relativos a la muñeca, se escalan por la distancia muñeca → base del dedo medio y la mano izquierda se espeja. El resultado es un vector de **63 números**.
- **Clasificador** (`src/lib/clasificador.ts`): kNN (k = 5) ponderado por distancia. Rechaza las poses que no se parecen a nada grabado. La app solo conoce la interfaz `Clasificador` (`entrenar` / `predecir`), así que una red en TF.js se enchufa implementando esos dos métodos.
- **Comparación para Practicar** (`src/lib/comparar.ts`): flexión de las 3 articulaciones de cada dedo y la dirección del dedo. El puntaje global da más peso al peor dedo.
- **3D** (`src/three/`): three.js con React Three Fiber.
  - La mano es volumétrica: esferas y cilindros instanciados, con una palma de superficie.
  - La luz de estudio usa Lightformers, sin HDR externos.
  - Se usó esto en lugar de Kalidokit porque Kalidokit requiere un modelo de mano con rig y lleva años sin mantenimiento.
- **Voz:** Web Speech API. **Sonidos:** generados con Web Audio, sin archivos.
- **Datos:** `localStorage`, con exportación e importación en JSON (formato en `public/sample-dataset.json`).

## Formato del dataset

```json
{
  "version": 1,
  "labels": { "A": [[63 números], ...], "1": [...] },
  "descripciones": { "A": "Cómo se forma la seña…" }
}
```

`descripciones` es opcional: así quien grabe el dataset también entrega los textos explicativos.
