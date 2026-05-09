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

## Versionado semantico y variable de entorno

- A partir de ahora, todo cierre de cambio debe evaluar versionado semantico en formato `MAYOR.MENOR.FIX`.
- `MAYOR`: cambios incompatibles, ruptura de API/flujo, migraciones destructivas o cambios operativos que requieran accion manual.
- `MENOR`: nuevas funcionalidades compatibles hacia atras o mejoras funcionales sin ruptura.
- `FIX`: correcciones compatibles, ajustes internos o fixes sin nueva funcionalidad.
- La fuente de verdad de la version debe vivir en un archivo versionado por git (`VERSION`, `package.json`, `pyproject.toml` u otro manifiesto propio del repo).
- `APP_VERSION` es la variable de entorno runtime/deploy que debe reflejar esa version; no usar `.env` como fuente de verdad porque normalmente no se versiona ni se despliega por git.
- Si el repo ya usa una variable de version especifica, mantenerla solo si el usuario lo confirma; por defecto exponer tambien `APP_VERSION`.
- Antes de cerrar, commitear, mergear o desplegar una rama, reportar el bump recomendado y el valor esperado de `APP_VERSION`.
