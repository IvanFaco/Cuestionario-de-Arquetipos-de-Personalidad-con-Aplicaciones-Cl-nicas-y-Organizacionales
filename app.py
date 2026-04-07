from __future__ import annotations

from datetime import datetime
from io import BytesIO
import unicodedata

from fpdf import FPDF
import pandas as pd
import plotly.express as px
import streamlit as st


st.set_page_config(
    page_title="Test de Arquetipos Premium",
    layout="centered",
)


ARQUETIPOS = [
    "Inocente",
    "Huérfano",
    "Guerrero",
    "Cuidador",
    "Explorador",
    "Amante",
    "Rebelde",
    "Creador",
    "Gobernante",
    "Mago",
    "Sabio",
    "Bufón",
]


def obtener_scores_iniciales() -> dict[str, int]:
    return {arquetipo: 0 for arquetipo in ARQUETIPOS}


def inicializar_estado() -> None:
    defaults = {
        "step": "landing",
        "scores": obtener_scores_iniciales(),
        "dominante": "",
        "campbell": "",
        "keirsey": "",
        "free_answers": {},
    }

    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def reiniciar_simulador() -> None:
    st.session_state.clear()


def calcular_scores_free(respuestas: dict[str, str]) -> dict[str, int]:
    scores = obtener_scores_iniciales()

    q1 = respuestas["q1"]
    q2 = respuestas["q2"]
    q3 = respuestas["q3"]
    q4 = respuestas["q4"]
    q5 = respuestas["q5"]
    q6 = respuestas["q6"]
    q7 = respuestas["q7"]
    q8 = respuestas["q8"]

    if "A)" in q1:
        scores["Sabio"] += 2
    if "B)" in q1:
        scores["Gobernante"] += 2
    if "C)" in q1:
        scores["Cuidador"] += 2
        scores["Amante"] += 2
    if "D)" in q1:
        scores["Explorador"] += 2

    if "A)" in q3:
        scores["Sabio"] += 2
    if "B)" in q3:
        scores["Guerrero"] += 2
        scores["Gobernante"] += 1
    if "C)" in q3:
        scores["Huérfano"] += 2
        scores["Amante"] += 1
    if "D)" in q3:
        scores["Explorador"] += 2
        scores["Inocente"] += 1

    if "A)" in q8:
        scores["Sabio"] += 3
    if "B)" in q8:
        scores["Gobernante"] += 3
    if "C)" in q8:
        scores["Amante"] += 3
    if "D)" in q8:
        scores["Explorador"] += 3

    for respuesta in [q2, q4, q5, q6, q7]:
        if "A)" in respuesta:
            scores["Sabio"] += 1
        if "B)" in respuesta:
            scores["Guerrero"] += 1
        if "C)" in respuesta:
            scores["Cuidador"] += 1
        if "D)" in respuesta:
            scores["Bufón"] += 1

    return scores


def obtener_tension_sombra(respuestas: dict[str, str]) -> str:
    q2 = respuestas["q2"]
    q5 = respuestas["q5"]

    if "A)" in q2 or "A)" in q5:
        return "intelectualización y desconexión afectiva"
    if "B)" in q2 or "B)" in q5:
        return "control excesivo y sobrecarga por autoexigencia"
    if "C)" in q2 or "C)" in q5:
        return "sacrificio crónico y desgaste emocional"
    return "evasión, impulsividad y fuga del conflicto"


def interpretar_keirsey(codigo: str) -> tuple[str, str]:
    interpretaciones = {
        "AA": ("Guardián (SJ)", "Tu enfoque natural es logístico, estable y protector de la estructura."),
        "AB": ("Artesano (SP)", "Tu enfoque natural es táctico, práctico y altamente adaptable."),
        "BA": ("Idealista (NF)", "Tu enfoque natural es empático, diplomático y orientado al significado."),
        "BB": ("Racional (NT)", "Tu enfoque natural es estratégico, abstracto y centrado en sistemas."),
    }
    return interpretaciones.get(codigo, interpretaciones["BB"])


def interpretar_campbell(codigo: str) -> str:
    interpretaciones = {
        "A": "Negativa a la Llamada. Sabes que algo debe cambiar, pero el costo subjetivo del cambio todavía pesa demasiado.",
        "B": "La Prueba Suprema. Estás en el tramo más exigente del proceso y tu sombra está pidiendo integración real.",
        "C": "El Retorno. Ya atravesaste la crisis principal y ahora toca convertir aprendizaje en dirección de vida.",
    }
    return interpretaciones.get(codigo, interpretaciones["C"])


def obtener_top_arquetipos(scores: dict[str, int], limite: int = 3) -> list[tuple[str, int]]:
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)[:limite]


def construir_dataframe_scores(scores: dict[str, int]) -> pd.DataFrame:
    df = pd.DataFrame(
        [{"Arquetipo": arquetipo, "Puntaje": puntaje} for arquetipo, puntaje in scores.items()]
    )
    return df.sort_values("Puntaje", ascending=True)


def normalizar_texto_pdf(texto: str) -> str:
    return (
        unicodedata.normalize("NFKD", texto)
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def generar_pdf_reporte() -> BytesIO:
    dominante = st.session_state.dominante
    scores = st.session_state.scores
    keirsey_nombre, keirsey_desc = interpretar_keirsey(st.session_state.keirsey)
    campbell_desc = interpretar_campbell(st.session_state.campbell)
    top_arquetipos = obtener_top_arquetipos(scores)
    tension_sombra = obtener_tension_sombra(st.session_state.free_answers)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, normalizar_texto_pdf("Reporte Premium de Arquetipos"), new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        0,
        8,
        normalizar_texto_pdf(f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}"),
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, normalizar_texto_pdf("1. Estructura principal"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        normalizar_texto_pdf(
            f"Arquetipo dominante: {dominante}. Este es el estilo principal con el que organizas tu energia, decisiones y defensa ante la presion."
        ),
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, normalizar_texto_pdf("2. Ranking de arquetipos"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    for indice, (arquetipo, puntaje) in enumerate(top_arquetipos, start=1):
        pdf.cell(
            0,
            6,
            normalizar_texto_pdf(f"{indice}. {arquetipo}: {puntaje} puntos"),
            new_x="LMARGIN",
            new_y="NEXT",
        )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, normalizar_texto_pdf("3. Tension de sombra"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        normalizar_texto_pdf(
            f"Se detecta una tendencia hacia {tension_sombra}. Este patron sugiere que conviene trabajar integracion emocional y regulacion bajo estres."
        ),
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, normalizar_texto_pdf("4. Temperamento Keirsey"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        normalizar_texto_pdf(f"{keirsey_nombre}. {keirsey_desc}"),
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, normalizar_texto_pdf("5. Viaje del Heroe"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, normalizar_texto_pdf(campbell_desc))
    pdf.ln(4)

    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(
        0,
        5,
        normalizar_texto_pdf(
            "Nota: este reporte es interpretativo y educativo. No sustituye una evaluacion clinica profesional."
        ),
    )

    pdf_bytes = bytes(pdf.output())
    buffer = BytesIO(pdf_bytes)
    buffer.seek(0)
    return buffer


def render_landing() -> None:
    st.title("🙂 Descubre la fuerza que dirige tu vida")
    st.markdown(
        "Existe un patrón psicológico oculto guiando tus decisiones, crisis y relaciones. "
        "Descúbrelo en **60 segundos**."
    )
    if st.button("Empezar el Test Gratuito", use_container_width=True, type="primary"):
        st.session_state.step = "free_quiz"
        st.rerun()


def render_free_quiz() -> None:
    st.progress(0.2, text="Fase 1: Diagnóstico de Arquetipo Dominante")
    st.header("Tu Brújula Interna")

    with st.form("free_form"):
        q1 = st.radio(
            "1. ¿Qué te mueve más en la vida?",
            [
                "A) Entender cómo funciona el mundo y encontrar la verdad objetiva.",
                "B) Construir, liderar y dejar un legado duradero.",
                "C) Conectar profundamente con otros y ayudarlos a sanar.",
                "D) Ser libre, experimentar y no atarme a la rutina.",
            ],
            index=None,
        )
        q2 = st.radio(
            "2. Estalla una crisis inesperada. Tu primer instinto es:",
            [
                "A) Analizar fríamente los datos antes de hacer nada.",
                "B) Tomar el mando inmediatamente y dar órdenes claras.",
                "C) Asegurarte de que todos estén emocionalmente bien.",
                "D) Usar el humor para calmar la tensión o improvisar.",
            ],
            index=None,
        )
        q3 = st.radio(
            "3. Si eres brutalmente honesto/a, lo que más te aterra es:",
            [
                "A) Ser ignorante, engañado o parecer incompetente.",
                "B) Perder el control o mostrar debilidad ante los demás.",
                "C) Quedarte solo/a, no ser amado/a o ser abandonado/a.",
                "D) Sentirte atrapado/a, aburrido/a o sin opciones vitales.",
            ],
            index=None,
        )
        q4 = st.radio(
            "4. ¿Qué suele pensar la gente de ti que NO es cierto?",
            [
                "A) Que soy de hielo.",
                "B) Que no necesito ayuda.",
                "C) Que no tengo problemas.",
                "D) Que soy rebelde sin causa.",
            ],
            index=None,
        )
        q5 = st.radio(
            "5. Bajo estrés extremo, te vuelves:",
            [
                "A) Aislado/a y cínico/a.",
                "B) Autoritario/a y controlador/a.",
                "C) Mártir y complaciente.",
                "D) Escapista y destructivo/a.",
            ],
            index=None,
        )
        q6 = st.radio(
            "6. Confías más en...",
            [
                "A) La lógica pura.",
                "B) La acción inmediata.",
                "C) Tu intuición emocional.",
                "D) Tus instintos físicos.",
            ],
            index=None,
        )
        q7 = st.radio(
            "7. Si pudieras ser recordado por algo, sería:",
            [
                "A) Una idea que cambió todo.",
                "B) Un imperio que construiste.",
                "C) Las vidas que tocaste.",
                "D) Haber vivido bajo tus propias reglas.",
            ],
            index=None,
        )
        q8 = st.radio(
            "8. Elige la palabra que más resuena en tu alma:",
            [
                "A) Verdad.",
                "B) Poder.",
                "C) Armonía.",
                "D) Libertad.",
            ],
            index=None,
        )

        submit_free = st.form_submit_button("Calcular mi Arquetipo Dominante")

    if not submit_free:
        return

    respuestas = {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "q5": q5,
        "q6": q6,
        "q7": q7,
        "q8": q8,
    }

    if not all(respuestas.values()):
        st.error("Por favor, responde todas las preguntas.")
        return

    scores = calcular_scores_free(respuestas)
    st.session_state.scores = scores
    st.session_state.free_answers = respuestas
    st.session_state.dominante = max(scores, key=scores.get)
    st.session_state.step = "paywall"
    st.rerun()


def render_paywall() -> None:
    tension_sombra = obtener_tension_sombra(st.session_state.free_answers)

    st.progress(0.6, text="Mapa Psicológico Generado")
    st.title(f"Tu Arquetipo Dominante es: {st.session_state.dominante.upper()}")
    st.write(
        f"Has sido identificado/a principalmente con la energía del **{st.session_state.dominante}**. "
        "Esta es la fuerza que utilizas para sobrevivir y triunfar. Sin embargo, este es solo el 20% de tu psique."
    )
    st.warning(
        "Alerta del algoritmo: detectamos una fuerte **Tensión de Sombra**. "
        f"Tu patrón dominante bajo presión apunta a **{tension_sombra}**. "
        "Si esto no se integra a tiempo, puede derivar en desgaste o burnout."
    )

    st.divider()
    st.markdown("### Desbloquea tu Diagnóstico Clínico Profundo")
    st.markdown(
        """
Para revelar exactamente qué te está saboteando, necesitamos hacer 3 preguntas finales y cruzar tus datos con:

- Tu Sombra Junguiana exacta
- Tu Temperamento Keirsey
- Tu etapa en el Viaje del Héroe
"""
    )

    if st.button("Desbloquear análisis avanzado", type="primary", use_container_width=True):
        st.session_state.step = "premium_quiz"
        st.rerun()


def render_premium_quiz() -> None:
    st.progress(0.8, text="Fase Premium: Calibración Keirsey y Campbell")
    st.header("Afinando tu Perfil")

    campbell_map = {
        "A) Estoy escuchando un llamado a cambiar, pero me da miedo.": "A",
        "B) Estoy atravesando la etapa más dura y oscura de una crisis.": "B",
        "C) Ya superé la crisis y estoy intentando integrar lo que aprendí.": "C",
    }
    keirsey_estilo_map = {
        "A) Práctico, directo y basado en hechos.": "A",
        "B) Teórico, imaginativo y basado en conceptos.": "B",
    }
    keirsey_accion_map = {
        "A) Seguir procedimientos y reglas comprobadas.": "A",
        "B) Hacer lo que funcione en el momento, improvisando.": "B",
    }

    with st.form("premium_form"):
        st.write("Responde estas 3 preguntas clave para generar tu reporte avanzado:")
        c1 = st.radio(
            "1. En el contexto actual de tu vida, sientes que:",
            list(campbell_map.keys()),
            index=None,
        )
        k1 = st.radio(
            "2. Tu estilo de comunicación natural es:",
            list(keirsey_estilo_map.keys()),
            index=None,
        )
        k2 = st.radio(
            "3. Para lograr tus metas prefieres:",
            list(keirsey_accion_map.keys()),
            index=None,
        )
        submit_premium = st.form_submit_button("Generar reporte final")

    if not submit_premium:
        return

    if not all([c1, k1, k2]):
        st.error("Responde las 3 preguntas finales.")
        return

    st.session_state.campbell = campbell_map[c1]
    st.session_state.keirsey = keirsey_estilo_map[k1] + keirsey_accion_map[k2]
    st.session_state.step = "dashboard"
    st.rerun()


def render_dashboard() -> None:
    scores = st.session_state.scores
    dominante = st.session_state.dominante
    keirsey_nombre, keirsey_desc = interpretar_keirsey(st.session_state.keirsey)
    campbell_desc = interpretar_campbell(st.session_state.campbell)
    top_arquetipos = obtener_top_arquetipos(scores)
    df_scores = construir_dataframe_scores(scores)
    tension_sombra = obtener_tension_sombra(st.session_state.free_answers)

    st.progress(1.0, text="Análisis Completado")
    st.balloons()
    st.title("Tu Mapa Psicológico Profundo")

    st.subheader(f"1. Estructura Principal: {dominante}")
    st.write(
        f"Tu arquetipo central es **{dominante}**. El ranking completo muestra qué energías te sostienen "
        "y cuáles quedan más desplazadas en tu estilo actual."
    )

    fig = px.bar(
        df_scores,
        x="Puntaje",
        y="Arquetipo",
        orientation="h",
        color="Puntaje",
        color_continuous_scale="Tealgrn",
        text="Puntaje",
    )
    fig.update_layout(height=520, showlegend=False, coloraxis_showscale=False)
    fig.update_traces(textposition="outside")
    st.plotly_chart(fig, use_container_width=True)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Dominante", top_arquetipos[0][0], top_arquetipos[0][1])
    with col2:
        st.metric("Secundario", top_arquetipos[1][0], top_arquetipos[1][1])
    with col3:
        st.metric("Terciario", top_arquetipos[2][0], top_arquetipos[2][1])

    st.subheader("2. Temperamento Neurológico (Keirsey)")
    st.write(f"**{keirsey_nombre}**. {keirsey_desc}")

    st.subheader("3. El Viaje del Héroe (Joseph Campbell)")
    st.write(campbell_desc)

    st.subheader("4. Tensión de Sombra")
    st.info(
        f"Tu combinación de respuestas sugiere una tensión principal hacia **{tension_sombra}**. "
        "La integración pasa por regular esa defensa sin perder la fortaleza de tu arquetipo dominante."
    )

    st.divider()
    pdf_buffer = generar_pdf_reporte()
    st.download_button(
        "Descargar Reporte PDF Clínico",
        data=pdf_buffer,
        file_name="Tu_Arquetipo_Premium.pdf",
        mime="application/pdf",
        use_container_width=True,
    )
    st.button("Reiniciar simulador", on_click=reiniciar_simulador, use_container_width=True)


inicializar_estado()

if st.session_state.step == "landing":
    render_landing()
elif st.session_state.step == "free_quiz":
    render_free_quiz()
elif st.session_state.step == "paywall":
    render_paywall()
elif st.session_state.step == "premium_quiz":
    render_premium_quiz()
else:
    render_dashboard()
