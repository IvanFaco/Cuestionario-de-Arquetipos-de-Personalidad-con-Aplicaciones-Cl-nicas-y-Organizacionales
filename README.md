# Cuestionario de Arquetipos de Personalidad

Aplicación Streamlit para descubrir un arquetipo dominante mediante un funnel breve y luego profundizar el resultado con capas interpretativas inspiradas en Jung, Keirsey y Campbell.

## Características

- Landing inicial orientada a conversión
- Test gratuito de 8 preguntas con puntajes ponderados
- Etapa intermedia de teaser y tensión de sombra
- Calibración premium de 3 preguntas
- Dashboard final con ranking de arquetipos y gráfico interactivo
- Descarga de reporte PDF interpretativo

## Flujo de la aplicación

1. Landing
2. Diagnóstico gratuito
3. Teaser de resultado
4. Calibración premium
5. Dashboard final

## Arquetipos evaluados

1. Inocente
2. Huérfano
3. Guerrero
4. Cuidador
5. Explorador
6. Amante
7. Rebelde
8. Creador
9. Gobernante
10. Mago
11. Sabio
12. Bufón

## Requisitos

- Python 3.8+
- Dependencias definidas en `requirements.txt`

## Instalación

```bash
pip install -r requirements.txt
```

## Ejecutar la aplicación

```bash
streamlit run app.py
```

La aplicación quedará disponible por defecto en `http://localhost:8501`.

## Docker

Build local:

```bash
docker build -t arquetipos-app .
```

Run local:

```bash
docker run --rm -p 8501:8501 arquetipos-app
```

La imagen expone `8501` y también soporta la variable de entorno `PORT`, útil para Coolify.

## Coolify

- Tipo de despliegue: `Dockerfile`
- Puerto interno: `8501`
- Rama recomendada: `develop`
- Comando de inicio adicional: no es necesario

Variables para activar el checkout Wompi del estudio profundo:

- `WOMPI_PUBLIC_KEY`
- `WOMPI_INTEGRITY_SECRET`
- `WOMPI_EVENTS_SECRET`
- `WOMPI_ENV=sandbox`
- `WOMPI_PREMIUM_AMOUNT_CENTS`
- `WOMPI_CURRENCY=COP`

## Notas

- El resultado es interpretativo y educativo.
- No sustituye evaluación clínica profesional.
