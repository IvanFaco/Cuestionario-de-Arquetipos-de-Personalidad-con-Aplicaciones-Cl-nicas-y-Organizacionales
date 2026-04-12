# Baseline Funcional del Producto Actual

## Flujo

La aplicacion implementa ahora este flujo secuencial:

1. `splash`
2. `quick_test_intro`
3. `quick_test`
4. `onboarding`
5. `quick_results`
6. `full_test`
7. `full_results`
8. descarga de PDF

## Estado minimo actual

- `demo`
- `hook_answers`
- `premium_answers`
- `hook_outcome`
- `premium_outcome`

## Onboarding posterior al quick test

El onboarding ya no captura contexto bio-psico-social. Solo recoge:

- `nombre`
- `objetivo`

Su objetivo es personalizar la devolucion y el reporte final una vez que el usuario ya vio valor en el quick test.

## Hook quiz

- 10 preguntas
- escala Likert de 5 puntos
- guardado inmediato por respuesta
- avance automatico al responder
- retroceso manual

## Premium quiz

- 15 preguntas
- misma escala Likert
- mismo patron de guardado y navegacion

## Teaser

Debe mostrar al menos:

- arquetipo dominante
- top 3 arquetipos
- CTA hacia la profundizacion

## Reporte final

Debe poder usar:

- `nombre`
- `objetivo`
- resultados del hook quiz
- resultados del premium quiz
