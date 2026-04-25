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
