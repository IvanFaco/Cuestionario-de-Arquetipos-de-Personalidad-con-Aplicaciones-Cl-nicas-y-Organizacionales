# Baseline Funcional del Producto Actual

## Flujo

La aplicacion actual implementa el siguiente flujo secuencial:

1. `landing`
2. captura demografica
3. `hook_quiz`
4. `teaser`
5. `premium_quiz`
6. `dashboard`
7. descarga de PDF

El estado se mantiene en `st.session_state`.

## Estado minimo actual

- `step`
- `demo`
- `scores`
- `estructuras`
- `hook_answers`
- `hook_index`
- `premium_answers`
- `premium_index`

## Entradas funcionales

### Datos demograficos

- `genero`: `Hombre | Mujer | Otro`
- `rango_edad`: `18_24 | 25_34 | 35_49 | 50_plus`
- `rango_edad_label`: derivado por regla
- `orientacion_espiritual`: opcional
- `orientacion_espiritual_label`: derivado por regla
- `energia_base`: `ecto | meso | endo | mixed`
- `energia_base_label`: derivado por regla
- `energia_somatica_label`: derivado por regla

Regla de rango:

- `18_24`: `18 a 24 anos | Exploracion e identidad emergente`
- `25_34`: `25 a 34 anos | Construccion y afirmacion del yo`
- `35_49`: `35 a 49 anos | Transicion, revision y metanoia`
- `50_plus`: `50 anos o mas | Integracion y sabiduria`

### Hook quiz

- 10 preguntas
- escala Likert de 5 puntos
- guardado inmediato por respuesta
- avance automatico al responder
- retroceso manual solo desde la segunda pregunta

Opciones Likert actuales:

- `1`: `Para nada`
- `2`: `No tanto`
- `3`: `Me da igual`
- `4`: `Puede ser`
- `5`: `Si, soy yo`

### Premium quiz

- 15 preguntas
- misma escala Likert
- mismo patron de guardado y navegacion

## Reglas de scoring

El hook quiz produce `scores` con estas ponderaciones:

- `Gobernante = v1 * 1.5`
- `Sabio = v2 * 1.5`
- `Cuidador = v3 * 1.5`
- `Explorador = v4 * 1.5`
- `Mago = v5 * 1.5`
- `Huerfano = v6 * 1.5`
- `Creador = v7 * 1.5`
- `Guerrero = v1 * 1.2`
- `Buscador = v2 * 1.2`
- `Amante = v3 * 1.2`
- `Rebelde = v4 * 1.2`
- `Bufon = v6 * 1.2`

Notas:

- `v8` no participa en `scores`
- el ranking se ordena de mayor a menor puntaje
- si hay empate, prevalece el orden de insercion actual del diccionario

## Estructuras derivadas

Despues del hook quiz:

- `Persona = v9`
- `Sombra_Base = v10`

Despues del premium quiz:

- `Sombra_Total = promedio(p1..p5)`
- `Keirsey`:
  - `Racional / Estratega (NT)` si `p8 + p9 > 7`
  - `Guardian / Logistico (SJ)` si no y `p7 + p10 > 7`
  - `Idealista / Diplomatico (NF)` en cualquier otro caso
- `Campbell`: maximo valor entre
  - `La Llamada a la Aventura = p11`
  - `La Prueba Suprema = p12`
  - `El Retorno con el Elixir = p13`
  - `El Cruce del Umbral = p14`
  - `Maestro de Dos Mundos = p15`

## Teaser

Debe mostrar al menos:

- arquetipo dominante
- etapa de vida del usuario
- advertencia sobre tension entre imagen publica e impulsos ocultos
- CTA hacia la calibracion profunda

## Dashboard

Debe mostrar al menos:

- arquetipo dominante
- triada principal
- diagnostico de sombra condicionado por `Sombra_Total >= 3.5`
- resultado `Keirsey`
- resultado `Campbell`
- CTA de descarga de PDF

## PDF

El PDF actual contiene dos paginas y estos bloques minimos:

1. encabezado ejecutivo
2. perfil base
3. estructura dominante y triada
4. lectura ejecutiva
5. ranking de arquetipos
6. estructuras clinicas
7. plan de accion breve
8. nota final interpretativa

## Definicion operativa de equivalencia

La nueva implementacion sera aceptada como equivalente si:

- conserva reglas y salidas para los fixtures versionados
- mantiene el mismo flujo principal
- preserva el contenido esencial del teaser, dashboard y PDF
- no introduce pasos extra no justificados en el funnel
