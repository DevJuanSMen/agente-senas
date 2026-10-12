# Cómo se generó `public/datasets/lsc70.json`

Fuente: **LSC70**, «Speak in Colombian Sign Language: A Dynamic LSC70 Database», J. A. Muñoz Galíndez, L. V. Villota Coral y R. Vargas-Cañas, Universidad del Cauca. Mendeley Data, doi:10.17632/9ssyn8tff5.2, licencia **CC BY 4.0**.

Cambios respecto al original: no se incluye ninguna imagen. De cada recorte de mano dominante (`LSC70ANH`, 120×120) se extrajeron los 21 puntos con MediaPipe Hand Landmarker y se normalizaron igual que en la app (`src/lib/normalizar.ts`).

## Pasos (2026-10-09)

1. Descargar `LSC70.zip` (990 MB, SHA-256 `7736809949b94bdb9a886aff3d850857900a81b6dfd4e423c482446e7c6fbcef`) y extraer `LSC70/LSC70ANH` repartiendo las personas en las carpetas `g0`…`g5`.
2. Correr `node correr.mjs g<N> r<N>.json <puerto>` para cada grupo. Abre Chrome headless con `procesar.html` (CPU, porque en headless la GPU falla).
   - Se detectó mano en 15 015 de 15 504 imágenes.
   - Con las imágenes de cuerpo entero (`LSC70AN`) solo se detecta en ~12 %; por eso se usan los recortes.
3. Correr `node construir.mjs 012345 210`. Genera el JSON:
   - Toma 210 muestras por seña repartidas entre las 70 personas.
   - Deja fuera las letras dinámicas G, H, J, Ñ, S, Z y las señas 10, mil y millón.
   - Copia O→0, V→2 y W→3: según el artículo del dataset, esos números se hacen igual que esas letras.
4. Correr `node evaluar.mjs` para medir la precisión entre personas (validación cruzada por persona, kNN k=5).
   - Resultado: **82,5 %** en 28 señas, con personas que el modelo no vio.
   - Confusiones más comunes: 1↔6, V↔7 y E↔C.

Los scripts tienen rutas de esta máquina; ajústalas si se vuelven a correr.
