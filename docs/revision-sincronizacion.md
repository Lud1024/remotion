# Revisión del audio y los subtítulos

Audio: `ElevenLabs_2026-11-18T19_19_24__s50_sim75_cs15_v4.mp3`, 139.650563 segundos. La composición incluye dos segundos adicionales para el fundido y la firma final: 141.666667 segundos. El MP3 se reproduce una vez, con su velocidad y tono originales.

Se reconocieron **349 palabras** y se contrastaron con las **349 del guion**. La segunda transcripción se realizó en **doce fragmentos** delimitados por silencios para reducir desplazamientos en pausas largas. Los centros de tokens DTW se refinaron con la actividad medida de la señal; se ajustaron **doce finales de pausa**.

Cuatro diferencias de reconocimiento se resolvieron usando la ortografía del guion, sin editar la voz: `Vibria` → `Biblia`, `sabes` → `aves`, `dominios` → `dominio`, `Den` → `Edén`. Son discrepancias del reconocimiento automático y no una afirmación de que la grabación pronuncie esas formas incorrectamente.

Los subtítulos se dividieron en **79 páginas** de hasta seis palabras. Las pruebas verifican cobertura completa, orden, ausencia de solapamientos, correspondencia con las palabras y desaparición durante pausas largas. Las **30 palabras de énfasis** representan menos del 9 % del guion. El color dorado comienza al alcanzar su marca, y permanece hasta el cambio de página; el resto del texto conserva su color.

Las pruebas de Studio cubren los dos formatos, las catorce escenas, el cierre y el fotograma anterior y posterior a las treinta transiciones de énfasis. Estos controles demuestran coherencia temporal y visual; no equivalen a una certificación de alineación fonética perfecta. Las formas de boca son una aproximación informada por las palabras y el volumen instantáneo.

La mezcla verificada mide **−16.31 LUFS integrados y −1.93 dBTP**. Se aumentó el ajuste de los efectos de 0.45 a 0.65 (**+3.19 dB**), sin saturación. Una simulación de banda de teléfono (300–4000 Hz) conserva la mayor parte de su energía: pérdida de **2.15 dB**. Esto evita que los efectos dependan exclusivamente de subgraves; no sustituye una escucha en un teléfono físico.

Evidencia reproducible: `qa/rebuild/timing-check.json`, `alignment-report.json`, `studio-report.json`, `audio-check.json`, `mix-review.wav` y `effects-phone-band.wav`.
