# Fase 0: Reemplazo Controlado del Stack

## Objetivo

Preparar la migracion desde el baseline anterior hacia
`Node.js + TypeScript + Express + EJS + Bootstrap + Bootswatch`
sin perder comportamiento de producto ni entrar en un rewrite ciego.

La Fase 0 no reemplaza la app actual. Congela el comportamiento vigente,
define criterios de equivalencia y deja un scaffold minimo del stack
objetivo.

## Estado Actual

- Runtime principal: `Node.js + Express`
- UI, flujo, estado y logica de dominio separadas por modulo
- Reporte PDF generado en el backend con `pdf-lib`
- Graficas reemplazadas por salidas SSR equivalentes
- Despliegue actual: `Dockerfile` multi-stage sobre Node

## Estado Objetivo

- `Node.js + TypeScript + Express + EJS`
- Render server-side como estrategia por defecto
- Modulos por dominio dentro de `src/modules`
- Bootstrap + Bootswatch para estilado base
- Logica de dominio aislada de controllers y views

## Fases

### Fase 0. Congelacion funcional

Entregables:

- especificacion baseline del producto actual
- fixtures de equivalencia funcional
- scaffold minimo del stack nuevo
- criterios de salida por fase

Complejidad: baja-media

### Fase 1. Extraccion de dominio

Objetivo:

Separar preguntas, opciones Likert, scoring, ranking, teaser,
estructuras y reglas de resultado en un modulo estable y testeable.

Entregables:

- `src/modules/assessment` con contratos claros
- dataset de preguntas desacoplado de la UI
- tests unitarios de scoring y resultados

Complejidad: media

### Fase 2. Flujo SSR equivalente

Objetivo:

Reconstruir el funnel principal en Express/EJS usando sesion server-side.

Entregables:

- landing
- captura demografica
- hook quiz
- teaser
- premium quiz
- dashboard textual basico

Complejidad: media-alta

### Fase 3. Artefactos equivalentes

Objetivo:

Recuperar funcionalidades que hoy dependen de implementaciones
especificas del baseline anterior.

Entregables:

- PDF equivalente en Node
- visualizaciones equivalentes o reemplazo aceptable
- ajuste fino mobile

Complejidad: alta

### Fase 4. Validacion cruzada y corte

Objetivo:

Comparar la app nueva frente a la actual y ejecutar un cambio de runtime
sin perder trazabilidad.

Entregables:

- suite de regresion
- checklist de equivalencia
- plan de rollback
- actualizacion del Dockerfile principal

Complejidad: media

## Criterios de Equivalencia

Se considera equivalente cuando se preservan:

- pasos del funnel y orden de navegacion
- mismas preguntas y opciones Likert
- mismas reglas de scoring y ranking
- misma derivacion de `Persona`, `Sombra_Total`, `Keirsey` y `Campbell`
- mismo contenido esencial del teaser
- mismo contenido esencial del dashboard
- mismo contenido estructural del PDF

## Riesgos Principales

- perder reglas de producto por migrar solo la UI
- introducir diferencias sutiles en scoring por no congelar fixtures
- reproducir de forma incompleta el PDF
- degradar la experiencia mobile al mover estilos embebidos
- mezclar migracion de stack con cambios de producto

## Mitigaciones

- no tocar el baseline anterior hasta pasar validacion cruzada
- migrar por paridad funcional antes de embellecer
- usar fixtures cerrados para comparar salida vieja vs nueva
- separar dominio, UI y artefactos desde el inicio

## Criterio de Salida de Fase 0

La Fase 0 termina cuando existen:

- baseline funcional documentado
- casos de equivalencia versionados
- scaffold base del nuevo stack
- branch dedicada para continuar Fase 1
