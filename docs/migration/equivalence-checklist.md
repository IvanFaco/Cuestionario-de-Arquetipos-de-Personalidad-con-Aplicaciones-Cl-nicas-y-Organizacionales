# Checklist de Equivalencia Operacional

## Cobertura alcanzada

- landing server-render para inicio del funnel
- captura demografica con validacion basica
- hook quiz de 10 preguntas en SSR
- teaser intermedio
- premium quiz de 15 preguntas en SSR
- dashboard final en SSR
- descarga de PDF ejecutivo
- dominio extraido a funciones puras
- fixtures de equivalencia versionados
- tests de scoring, estructuras y PDF

## Verificaciones ejecutadas

- `npm install`
- `npm run build`
- `npm run test`
- recorrido completo del funnel con `curl` y sesion real
- validacion de cabeceras `Content-Type` y `Content-Disposition` del PDF

## Diferencias respecto a Streamlit

- no se migraron graficas interactivas de Plotly
- el dashboard SSR usa ranking textual como reemplazo aceptable
- el PDF recupera la estructura esencial, no una replica visual exacta

## Garantia realista

- equivalencia de dominio: alta
- equivalencia de flujo: alta
- equivalencia del PDF: media-alta
- equivalencia visual pixel perfect: no objetivo en esta migracion
