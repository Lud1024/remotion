# SHALÓM · La Creación

Producción nueva sobre el relato completo de Génesis, montada contra la narración del 18 de noviembre de 2026. El montaje anterior se retiró del proyecto activo y se guardó en `archive/previous-production/`. Solo se conservó y refinó el robot y su motor de animación.

- Audio original: **139.650563 s**, una sola pista, sin cambios de velocidad ni tono.
- Composición: **4250 fotogramas / 141.667 s a 30 fps**, con cierre a negro y SHALÓM centrado.
- Versiones: `LaCreacion` (1920 × 1080) y `LaCreacionVertical` (1080 × 1920).
- Catorce bloques visuales nuevos. Cámara y encuadre se adaptan al formato y a la presencia del narrador.
- 349 palabras, 79 grupos de subtítulos y 30 palabras elegidas para énfasis. El color cambia después del comienzo alineado de cada palabra seleccionada.
- Música y efectos nuevos, originales y sintetizados. Ganancia de efectos +3.19 dB frente al ajuste anterior; contienen medios y agudos para conservar presencia al reducir graves.

## Vista previa

```powershell
npm run dev
```

Abre `http://localhost:3000/LaCreacion` o `http://localhost:3000/LaCreacionVertical`. Las props `captions` y `withAudio` controlan subtítulos y audio.

## Código y recursos

`src/core/` contiene únicamente el robot y sus dependencias de animación. Su diseño incluye casco con biseles y juntas, audífonos metálicos, rostro cerámico, manos articuladas, textura de tela y proporciones revisadas.

`src/creation/Creation.tsx` organiza presentación, subtítulos, énfasis, sonido y cierre. `world.ts` dibuja el nuevo sistema visual y `alignment.json` guarda los tiempos reales por palabra, páginas, escenas, marcadores y actividad de audio.

El guion limpio está en `docs/narration.txt`. `docs/subtitulos.srt` permite revisar las páginas con sus tiempos. Las mediciones y capturas están en `qa/rebuild/`.

El audio fuente se conserva en `public/audio/ElevenLabs_2026-11-18T19_19_24__s50_sim75_cs15_v4.mp3`. Las camas musicales y efectos están en `public/audio/creation/`.

## Verificación

```powershell
npm run check
npm run check:core
npm run qa:timing
npm run qa:audio
npm run qa:studio
```

El QA de Studio requiere el servidor en el puerto 3000. Revisa ambos formatos, catorce escenas, el cierre y las dos caras de las treinta transiciones de énfasis. El QA de audio crea una mezcla de revisión y una simulación de efectos limitada a 300–4000 Hz.

La transcripción se hizo localmente con Whisper multilingüe y marcas DTW, refinada en doce fragmentos separados por pausas. Se contrastó con el guion completo y se corrigieron doce anclas al final de pausas. Los tiempos por palabra son una estimación automática, no una anotación fonética humana; la boca combina esas marcas con la energía real del audio y formas estimadas dentro de cada palabra.

Para regenerar las camas: `npm run audio:build`. Para recalcular la alineación con los resultados de transcripción guardados: `npm run captions:align`. Una grabación diferente exige transcribir de nuevo; no reutilizar los tiempos de este MP3.

## Exportación cuando se necesite

```powershell
npm run render
npm run render:vertical
```

Los archivos se escriben en `out/`. Esta reconstrucción se verifica en Studio; no genera un MP4 automáticamente.
