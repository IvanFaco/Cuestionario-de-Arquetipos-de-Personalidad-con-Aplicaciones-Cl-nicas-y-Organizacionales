# AGENTS.md

## Reglas de ramas

- La rama de despliegue de esta app es `develop`.
- `main` no es la rama de despliegue operativo para esta app.
- En cierres finales de una rama `feat/*`, el merge productivo esperado es hacia `develop`, salvo instrucción explícita distinta del usuario.
- Cada feature, fix o cambio técnico debe implementarse en su propia rama.
- Nunca se debe implementar directamente sobre `main`.
- Nunca se debe implementar directamente sobre `develop`.
- Mientras este repositorio siga usando `master`, tampoco se debe implementar directamente sobre `master`.
- La rama debe crearse antes de hacer cambios, con un nombre claro y específico.

## Merges

- No hacer merge a `main`.
- No hacer merge a `develop`.
- No hacer merge a `master`.
- Solo hacer merge cuando el usuario lo indique de forma explícita.
- La instrucción válida será del tipo: `hacer merge con main` o `hacer merge con develop`.

## Forma de trabajo

- Un cambio por rama, siempre que sea razonable.
- Hacer commit de los cambios dentro de su rama correspondiente.
- Si ya se está sobre una rama base, detenerse y crear una rama de trabajo antes de implementar.

## Modelo de dos agentes (Frontend / Backend)

- Se permite y recomienda operar con dos agentes especializados:
  - `frontend-agent`: responsable exclusivo de UI/UX.
  - `backend-agent`: responsable exclusivo de lógica de negocio, APIs y datos.

### Ownership por agente

- `frontend-agent`:
  - `src/views/**`
  - `public/styles/**`
  - `public/scripts/**` (solo comportamiento de interfaz)
  - `public/assets/**` (cuando aplique a presentación)
- `backend-agent`:
  - `src/modules/**`
  - `src/shared/**`
  - `src/config/**`
  - `src/types/**`
  - migraciones, repositorios y persistencia

### Reglas de coordinación

- No editar archivos propiedad del otro agente salvo instrucción explícita del usuario.
- Definir contrato de integración antes de implementar:
  - nombres y forma de `pageData`,
  - estados de flujo (`loading`, `error`, `success`),
  - rutas y redirects esperados.
- Si un cambio requiere tocar ambos lados, dividir en dos commits:
  - primero backend (contrato),
  - luego frontend (consumo visual del contrato).

### Orquestación obligatoria por agente principal

- El agente principal (orquestador) debe coordinar, supervisar e integrar el trabajo de `frontend-agent` y `backend-agent`.
- El agente principal no delega la decisión final de arquitectura, integración ni calidad.
- Flujo obligatorio:
  1. definir objetivo y alcance del cambio,
  2. dividir trabajo por ownership (frontend/backend),
  3. ejecutar ambos sub-agentes en paralelo cuando no haya bloqueo cruzado,
  4. consolidar cambios y resolver conflictos,
  5. correr validaciones técnicas,
  6. entregar resultado final al usuario.
- Cada sub-agente debe reportar:
  - archivos modificados,
  - contrato afectado (`pageData`, rutas, payloads, estados),
  - riesgos o supuestos.
- El agente principal debe bloquear merge/push si:
  - hay solapamiento de ownership sin justificación,
  - no hay validación mínima,
  - el contrato entre frontend y backend es inconsistente.
- La respuesta final al usuario siempre la emite el agente principal.

### Validación mínima antes de merge

- `backend-agent`: `npm run verify` obligatorio.
- `frontend-agent`: smoke visual/manual de rutas afectadas + `npm run build`.
- Integración final: validar journey completo E2E de la funcionalidad tocada.

## Versionado semantico y variable de entorno

- A partir de ahora, todo cierre de cambio debe evaluar versionado semantico en formato `MAYOR.MENOR.FIX`.
- `MAYOR`: cambios incompatibles, ruptura de API/flujo, migraciones destructivas o cambios operativos que requieran accion manual.
- `MENOR`: nuevas funcionalidades compatibles hacia atras o mejoras funcionales sin ruptura.
- `FIX`: correcciones compatibles, ajustes internos o fixes sin nueva funcionalidad.
- La fuente de verdad de la version debe vivir en un archivo versionado por git y empaquetado en el build/deploy (ejemplo recomendado: `config/version.json`).
- La app debe leer la version desde ese archivo versionado en runtime; no depender de `.env` para mostrar version en UI.
- `APP_VERSION` puede existir como variable de entorno de soporte, pero no debe ser la fuente primaria para version visible en producto.
- En cada cambio que implique bump de version, se debe actualizar ese archivo versionado y confirmar que viaja en el artefacto desplegado.
- Antes de cerrar, commitear, mergear o desplegar una rama, reportar el bump recomendado y el valor esperado de version en archivo + `APP_VERSION` (si aplica).
