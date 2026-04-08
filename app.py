from io import BytesIO
import textwrap
import unicodedata

from fpdf import FPDF
import pandas as pd
import plotly.express as px
import streamlit as st


LIKERT_OPTIONS = [
    {"value": 1, "emoji": "✖", "label": "Para nada", "short": "1", "color": "#ef5b4c"},
    {"value": 2, "emoji": "👎", "label": "No tanto", "short": "2", "color": "#f39a7f"},
    {"value": 3, "emoji": "😐", "label": "Me da igual", "short": "3", "color": "#c6cbd5"},
    {"value": 4, "emoji": "👍", "label": "Puede ser", "short": "4", "color": "#8fd98c"},
    {"value": 5, "emoji": "🔥", "label": "Sí, soy yo", "short": "5", "color": "#3db54a"},
]

HOOK_QUESTIONS = [
    ("v1", "Siento una urgencia por tomar el control y organizar el caos a mi alrededor."),
    ("v2", "Prefiero una verdad dolorosa e incómoda antes que vivir una mentira feliz."),
    ("v3", "Siento que mi propósito es proteger, nutrir o sanar a los demás."),
    ("v4", "Me asfixia la rutina; necesito libertad constante para explorar."),
    ("v5", "Creo que la realidad se puede transformar si cambiamos nuestra mentalidad."),
    ("v6", "He aceptado que el mundo es duro, así que prefiero ser realista."),
    ("v7", "Necesito dejar un legado tangible, algo que yo haya creado."),
    ("v8", "En la vida, la lógica y los datos son mejores guías que las emociones."),
    ("v9", "Invierto mucha energía en que mi imagen pública sea impecable."),
    ("v10", "A veces tengo impulsos que me asustan o contradicen mi moral."),
]

PREMIUM_QUESTIONS = [
    ("p1", "Me castigo en silencio cuando cometo un error."),
    ("p2", "Siento una rabia irracional hacia quienes viven sin reglas."),
    ("p3", "Sacrifico mis deseos por temor a perder respeto."),
    ("p4", "Temo que si mostrara mi verdadera cara, la gente se alejaría."),
    ("p5", "Tengo fantasías de abandonar mis responsabilidades."),
    ("p6", "Priorizo la armonía emocional sobre la lógica fría."),
    ("p7", "Me siento seguro con un plan estructurado; odio improvisar."),
    ("p8", "Prefiero discutir futuros posibles que detalles concretos."),
    ("p9", "Cuestiono la autoridad si eso mejora la eficiencia."),
    ("p10", "El deber y preservar las instituciones es lo principal."),
    ("p11", "Siento que algo me llama a un cambio radical."),
    ("p12", "Siento que mi antigua identidad se desmorona."),
    ("p13", "He superado una crisis y quiero compartir mi aprendizaje."),
    ("p14", "Luchan por devolverme a mi antigua zona de confort."),
    ("p15", "He integrado mis partes oscuras y siento paz."),
]


def normalizar_pdf(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")


def obtener_ranking(scores: dict[str, float]) -> list[tuple[str, float]]:
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)


def escribir_parrafo_pdf(pdf: FPDF, texto: str, line_height: int = 7, width: int = 82) -> None:
    for bloque in texto.split("\n"):
        lineas = textwrap.wrap(bloque, width=width) or [""]
        for linea in lineas:
            pdf.cell(0, line_height, normalizar_pdf(linea), ln=1)


def obtener_rango_edad(edad: int) -> str:
    if edad <= 34:
        return "18 - 34 años (Construcción del Ego)"
    if edad <= 50:
        return "35 - 50 años (La Transición / Metanoia)"
    return "51+ años (Integración y Sabiduría)"


def inicializar_estado() -> None:
    defaults = {
        "step": "landing",
        "demo": {},
        "scores": {},
        "estructuras": {},
        "hook_answers": {},
        "hook_index": 0,
        "premium_answers": {},
        "premium_index": 0,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def aplicar_estilos() -> None:
    st.markdown(
        """
<style>
    .stApp {
        background:
            radial-gradient(circle at top, rgba(255,255,255,0.7), transparent 30%),
            linear-gradient(180deg, #f8fbff 0%, #edf3fb 100%);
        color: #26324b;
    }
    [data-testid="stAppViewContainer"] {
        max-width: 430px;
        margin: 0 auto;
    }
    .block-container {
        padding-top: 1.1rem;
        padding-bottom: 2rem;
    }
    h1, h2, h3, h4, h5, h6 {
        color: #25324c !important;
        font-weight: 800 !important;
        letter-spacing: -0.02em;
    }
    p, span, label, div {
        color: #5c6b87;
    }
    .hero-card, .question-card, .summary-card {
        background: rgba(255,255,255,0.88);
        border: 1px solid rgba(132, 151, 193, 0.20);
        box-shadow: 0 22px 48px rgba(69, 91, 138, 0.14);
        border-radius: 30px;
        padding: 1.25rem 1.05rem 1.15rem;
        backdrop-filter: blur(10px);
    }
    .hero-card {
        text-align: center;
    }
    .eyebrow {
        color: #7f8dab;
        text-transform: uppercase;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        margin-bottom: 0.45rem;
    }
    .metric-chip {
        display: inline-block;
        padding: 0.35rem 0.72rem;
        border-radius: 999px;
        background: #eef4ff;
        color: #5670a4;
        font-size: 0.77rem;
        font-weight: 800;
        margin: 0.2rem auto 0.85rem;
    }
    .question-card {
        text-align: center;
    }
    .question-text {
        color: #22304b;
        font-size: 1.62rem;
        font-weight: 800;
        line-height: 1.16;
        margin: 0.95rem 0 0.8rem;
    }
    .question-quote {
        background: white;
        border-radius: 22px;
        box-shadow: inset 0 0 0 1px rgba(141, 161, 203, 0.12);
        padding: 1.2rem 1rem;
        margin-top: 0.8rem;
    }
    .question-help {
        text-align: center;
        color: #7a87a3;
        font-size: 0.92rem;
        margin-top: 0.85rem;
    }
    .evolution-bar {
        width: 100%;
        height: 16px;
        border-radius: 999px;
        background: rgba(217, 226, 242, 0.95);
        overflow: hidden;
        box-shadow: inset 0 1px 2px rgba(110, 129, 171, 0.10);
        margin-top: 0.95rem;
    }
    .evolution-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #ef5b4c 0%, #f6b46b 35%, #8fd98c 68%, #3db54a 100%);
    }
    .likert-label {
        text-align: center;
        color: #5f6f8f;
        font-size: 0.68rem;
        line-height: 1.02;
        font-weight: 700;
        margin-top: 0.36rem;
        min-height: 30px;
    }
    .question-bottom-note {
        margin-top: 0.8rem;
        border-radius: 18px;
        background: rgba(255,255,255,0.82);
        border: 1px solid rgba(132, 151, 193, 0.16);
        box-shadow: 0 10px 24px rgba(68, 89, 135, 0.08);
        padding: 0.75rem 0.9rem;
        text-align: center;
        color: #5e739e;
        font-size: 0.9rem;
        line-height: 1.35;
        font-weight: 700;
    }
    .stButton > button {
        width: 100%;
        min-height: 3rem;
        border-radius: 20px !important;
        border: 1px solid rgba(93, 116, 168, 0.12) !important;
        background: rgba(255,255,255,0.96) !important;
        color: #27406d !important;
        font-weight: 800 !important;
        box-shadow: 0 8px 18px rgba(66, 88, 134, 0.10);
    }
    .stButton > button:hover {
        transform: translateY(-1px);
        border-color: rgba(73, 124, 214, 0.28) !important;
    }
    .answer-button-1 .stButton > button,
    .answer-button-2 .stButton > button,
    .answer-button-3 .stButton > button,
    .answer-button-4 .stButton > button,
    .answer-button-5 .stButton > button {
        min-height: 2.55rem;
        border-radius: 999px !important;
        color: white !important;
        border: none !important;
        font-size: 1.15rem !important;
        line-height: 1 !important;
        padding: 0 !important;
        box-shadow: 0 10px 18px rgba(82, 98, 132, 0.16);
    }
    .answer-button-1 .stButton > button { background: #ef5b4c !important; }
    .answer-button-2 .stButton > button { background: #f39a7f !important; }
    .answer-button-3 .stButton > button { background: #bfc5cf !important; color: #3e4654 !important; }
    .answer-button-4 .stButton > button { background: #8fd98c !important; }
    .answer-button-5 .stButton > button { background: #3db54a !important; }
    .answer-button-1 .stButton > button:hover,
    .answer-button-2 .stButton > button:hover,
    .answer-button-3 .stButton > button:hover,
    .answer-button-4 .stButton > button:hover,
    .answer-button-5 .stButton > button:hover {
        transform: translateY(-3px) scale(1.06);
        box-shadow: 0 16px 24px rgba(69, 92, 141, 0.22) !important;
        filter: saturate(1.08) brightness(1.02);
    }
    .answer-button-selected .stButton > button {
        transform: translateY(-3px) scale(1.06);
        box-shadow: 0 18px 28px rgba(69, 92, 141, 0.26) !important;
        outline: 4px solid rgba(255,255,255,0.95);
    }
    .nav-button .stButton > button {
        min-height: 2.5rem;
        border-radius: 999px !important;
    }
    .cta-button .stButton > button {
        min-height: 3.25rem;
        border-radius: 999px !important;
        background: linear-gradient(135deg, #56a8ff 0%, #2b76f1 100%) !important;
        color: white !important;
        border: none !important;
    }
    [data-testid="stProgressBar"] > div > div {
        background: linear-gradient(90deg, #ef5b4c 0%, #f6b46b 35%, #8fd98c 68%, #3db54a 100%) !important;
    }
</style>
""",
        unsafe_allow_html=True,
    )


def construir_pdf_reporte() -> BytesIO:
    scores = st.session_state.scores
    estructuras = st.session_state.estructuras
    demo = st.session_state.demo
    ranking = obtener_ranking(scores)
    dominante = ranking[0][0]
    triada = ", ".join(nombre for nombre, _ in ranking[:3])
    sombra_total = estructuras.get("Sombra_Total", 0)

    if sombra_total >= 3.5:
        sombra_texto = (
            "Alto nivel de represion. Conviene integrar vulnerabilidad y bajar la autoexigencia antes del burnout."
        )
    else:
        sombra_texto = (
            "Relacion sana con los impulsos e identidad. La autenticidad aparece como un recurso disponible."
        )

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    escribir_parrafo_pdf(pdf, "Reporte Clinico Ejecutivo", line_height=10, width=50)
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 11)
    escribir_parrafo_pdf(
        pdf,
        (
            f"Perfil base: {demo.get('genero', 'No especificado')} | "
            f"{demo.get('edad_exacta', 'No especificado')} años | "
            f"{demo.get('rango_edad', 'No especificado')}"
        ),
    )
    escribir_parrafo_pdf(pdf, f"Estructura dominante: {dominante} | Triada principal: {triada}")
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, normalizar_pdf("1. Lectura ejecutiva"), ln=1)
    pdf.set_font("Helvetica", "", 11)
    escribir_parrafo_pdf(
        pdf,
        (
            f"La psique se organiza principalmente desde el arquetipo {dominante}. "
            f"La triada dominante ({triada}) sugiere un estilo de adaptacion consistente "
            "entre estructura, defensa y direccion vital."
        ),
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, normalizar_pdf("2. Ranking de arquetipos"), ln=1)
    pdf.set_font("Helvetica", "", 11)
    for indice, (nombre, puntaje) in enumerate(ranking, start=1):
        pdf.cell(
            0,
            6,
            normalizar_pdf(f"{indice}. {nombre}: {puntaje:.1f} puntos"),
            ln=1,
        )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, normalizar_pdf("3. Estructuras clinicas"), ln=1)
    pdf.set_font("Helvetica", "", 11)
    escribir_parrafo_pdf(
        pdf,
        f"Persona: {estructuras.get('Persona', 0):.1f}/5 | Sombra profunda: {sombra_total:.1f}/5",
    )
    escribir_parrafo_pdf(pdf, f"Sombra: {sombra_texto}")
    escribir_parrafo_pdf(
        pdf,
        f"Keirsey: {estructuras.get('Keirsey', 'No disponible')}. "
        f"Campbell: {estructuras.get('Campbell', 'No disponible')}.",
    )

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    escribir_parrafo_pdf(pdf, "Plan de accion breve", line_height=9, width=40)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 11)
    recomendaciones = [
        f"Fortalecer el arquetipo dominante ({dominante}) sin rigidizar la identidad.",
        "Bajar la distancia entre imagen publica y experiencia emocional real.",
        "Usar el temperamento Keirsey como criterio para decidir bajo estres.",
        f"Trabajar la etapa Campbell actual: {estructuras.get('Campbell', 'No disponible')}.",
    ]
    for recomendacion in recomendaciones:
        escribir_parrafo_pdf(pdf, f"- {recomendacion}")

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    escribir_parrafo_pdf(
        pdf,
        "Documento interpretativo y educativo. No sustituye evaluacion clinica profesional.",
        line_height=5,
        width=95,
    )

    contenido_pdf = pdf.output(dest="S")
    pdf_bytes = contenido_pdf.encode("latin-1") if isinstance(contenido_pdf, str) else bytes(contenido_pdf)
    buffer = BytesIO(pdf_bytes)
    buffer.seek(0)
    return buffer


def calcular_scores_hook() -> dict[str, float]:
    answers = st.session_state.hook_answers
    return {
        "Gobernante": answers["v1"] * 1.5,
        "Sabio": answers["v2"] * 1.5,
        "Cuidador": answers["v3"] * 1.5,
        "Explorador": answers["v4"] * 1.5,
        "Mago": answers["v5"] * 1.5,
        "Huérfano": answers["v6"] * 1.5,
        "Creador": answers["v7"] * 1.5,
        "Guerrero": answers["v1"] * 1.2,
        "Buscador": answers["v2"] * 1.2,
        "Amante": answers["v3"] * 1.2,
        "Rebelde": answers["v4"] * 1.2,
        "Bufón": answers["v6"] * 1.2,
    }


def procesar_hook() -> None:
    answers = st.session_state.hook_answers
    st.session_state.scores = calcular_scores_hook()
    st.session_state.estructuras = {
        "Persona": answers["v9"],
        "Sombra_Base": answers["v10"],
    }
    st.session_state.step = "teaser"
    st.rerun()


def procesar_premium() -> None:
    answers = st.session_state.premium_answers
    st.session_state.estructuras["Sombra_Total"] = (
        answers["p1"] + answers["p2"] + answers["p3"] + answers["p4"] + answers["p5"]
    ) / 5
    st.session_state.estructuras["Keirsey"] = (
        "Racional / Estratega (NT)"
        if answers["p8"] + answers["p9"] > 7
        else "Guardián / Logístico (SJ)"
        if answers["p7"] + answers["p10"] > 7
        else "Idealista / Diplomático (NF)"
    )
    etapas = {
        "La Llamada a la Aventura": answers["p11"],
        "La Prueba Suprema": answers["p12"],
        "El Retorno con el Elixir": answers["p13"],
        "El Cruce del Umbral": answers["p14"],
        "Maestro de Dos Mundos": answers["p15"],
    }
    st.session_state.estructuras["Campbell"] = max(etapas, key=etapas.get)
    st.session_state.step = "dashboard"
    st.rerun()


def render_likert_selected_note(selected_value: int | None = None) -> None:
    selected_note = "Selecciona una opción para continuar."
    if selected_value:
        selected = next(option for option in LIKERT_OPTIONS if option["value"] == selected_value)
        selected_note = f"Respuesta actual: {selected['label']}"
    st.markdown(
        f"""
<div class="likert-selected-note">{selected_note}</div>
""",
        unsafe_allow_html=True,
    )


def render_question_status_note(selected_value: int | None = None) -> None:
    message = "Selecciona una opción para continuar. La selección se guarda y avanza automáticamente."
    if selected_value:
        selected = next(option for option in LIKERT_OPTIONS if option["value"] == selected_value)
        message = f"Respuesta actual: {selected['label']}. La selección se guarda y avanza automáticamente."
    st.markdown(f"<div class='question-bottom-note'>{message}</div>", unsafe_allow_html=True)


def responder_pregunta(
    answer_key: str,
    answer_value: int,
    state_answers_key: str,
    index_key: str,
    questions: list[tuple[str, str]],
    on_complete,
) -> None:
    st.session_state[state_answers_key][answer_key] = answer_value
    if st.session_state[index_key] >= len(questions) - 1:
        on_complete()
        return
    st.session_state[index_key] += 1
    st.rerun()


def render_questionnaire(
    *,
    title: str,
    subtitle: str,
    questions: list[tuple[str, str]],
    state_answers_key: str,
    index_key: str,
    progress_start: float,
    progress_end: float,
    on_complete,
) -> None:
    current_index = st.session_state[index_key]
    answer_key, prompt = questions[current_index]
    selected_value = st.session_state[state_answers_key].get(answer_key)
    progress_value = progress_start + ((current_index + 1) / len(questions)) * (progress_end - progress_start)

    st.markdown(
        f"""
<div class="question-card">
    <div class="eyebrow">{title}</div>
    <div class="metric-chip">Pregunta {current_index + 1} de {len(questions)}</div>
    <div class="question-quote">
        <div class="question-text">"{prompt}"</div>
    </div>
    <div class="question-help">{subtitle}</div>
</div>
""",
        unsafe_allow_html=True,
    )
    st.markdown(
        f"<div class='evolution-bar'><div class='evolution-fill' style='width:{progress_value * 100:.0f}%;'></div></div>",
        unsafe_allow_html=True,
    )
    cols = st.columns(5, gap="small")
    for option, col in zip(LIKERT_OPTIONS, cols):
        with col:
            selected_class = " answer-button-selected" if selected_value == option["value"] else ""
            st.markdown(
                f"<div class='answer-button-{option['value']}{selected_class}'>",
                unsafe_allow_html=True,
            )
            if st.button(
                option["emoji"],
                key=f"{state_answers_key}_{answer_key}_{option['value']}",
                use_container_width=True,
            ):
                responder_pregunta(
                    answer_key=answer_key,
                    answer_value=option["value"],
                    state_answers_key=state_answers_key,
                    index_key=index_key,
                    questions=questions,
                    on_complete=on_complete,
                )
            st.markdown(f"<div class='likert-label'>{option['label']}</div>", unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)
    render_question_status_note(selected_value)

    nav_left, nav_right = st.columns([1, 1.6], gap="small")
    with nav_left:
        st.markdown("<div class='nav-button'>", unsafe_allow_html=True)
        if current_index > 0 and st.button("← Volver", key=f"back_{state_answers_key}", use_container_width=True):
            st.session_state[index_key] -= 1
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)
    with nav_right:
        st.markdown(
            "<div class='question-footer-note'>La selección se guarda y avanza automáticamente.</div>",
            unsafe_allow_html=True,
        )


def render_landing() -> None:
    st.markdown(
        """
<div class="hero-card">
    <div class="eyebrow">Mapa Psicológico Premium</div>
    <h1>El Mapa de tu Psique</h1>
    <p>Descubre tu estructura psicológica, tu sombra y tu temperamento con una experiencia visual, móvil y guiada.</p>
</div>
""",
        unsafe_allow_html=True,
    )
    st.subheader("Paso 1: Calibración Demográfica")
    genero = st.selectbox("Género", ["Hombre", "Mujer", "Otro"])
    edad = st.number_input(
        "Edad exacta",
        min_value=18,
        max_value=99,
        value=35,
        step=1,
    )
    st.markdown("<div class='cta-button'>", unsafe_allow_html=True)
    if st.button("Continuar al Test Clínico ⚡", type="primary", use_container_width=True):
        st.session_state.demo = {
            "genero": genero,
            "edad_exacta": int(edad),
            "rango_edad": obtener_rango_edad(int(edad)),
        }
        st.session_state.hook_answers = {}
        st.session_state.hook_index = 0
        st.session_state.step = "hook_quiz"
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)


def render_teaser() -> None:
    st.progress(0.50)
    ordenados = obtener_ranking(st.session_state.scores)
    dominante = ordenados[0][0]
    edad_exacta = st.session_state.demo.get("edad_exacta", "No especificada")
    st.markdown(
        f"""
<div class="summary-card">
    <div class="eyebrow">Diagnóstico Estructural Preliminar</div>
    <h3>Estructura Dominante: {dominante.upper()}</h3>
    <p>A tus <strong>{edad_exacta}</strong> años, tu psique está operando bajo la energía del <strong>{dominante}</strong>. Eres el ancla de tu entorno; tu instinto primario es estructurar tu realidad y asegurar la supervivencia de tus proyectos.</p>
</div>
""",
        unsafe_allow_html=True,
    )
    st.warning(
        "Punto ciego detectado: vemos tensión entre tu imagen pública y tus impulsos ocultos. "
        "Si esa sombra no se integra, puede aparecer como fatiga crónica, aislamiento o burnout."
    )
    st.markdown("### 🔓 Desbloquea tu mapa clínico profundo")
    st.markdown(
        """
- Radar de 12 arquetipos
- Sombra junguiana
- Matriz Keirsey y Campbell
- PDF ejecutivo de 2 páginas
"""
    )
    st.markdown("<div class='cta-button'>", unsafe_allow_html=True)
    if st.button("Acceder al test de calibración profunda", type="primary", use_container_width=True):
        st.session_state.premium_answers = {}
        st.session_state.premium_index = 0
        st.session_state.step = "premium_quiz"
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)


def render_dashboard() -> None:
    st.progress(1.0)
    st.balloons()
    ordenados = obtener_ranking(st.session_state.scores)

    st.title("👑 TU MAPA CLÍNICO Y ESTRUCTURAL")
    st.write(
        f"**Estructura Dominante:** EL {ordenados[0][0].upper()} | **Tríada:** "
        f"{ordenados[0][0]}, {ordenados[1][0]}, {ordenados[2][0]}"
    )

    col1, col2 = st.columns(2)
    with col1:
        df_radar = pd.DataFrame(
            dict(
                Puntaje=list(st.session_state.scores.values()),
                Arquetipo=list(st.session_state.scores.keys()),
            )
        )
        fig_radar = px.line_polar(
            df_radar,
            r="Puntaje",
            theta="Arquetipo",
            line_close=True,
            range_r=[0, 8],
        )
        fig_radar.update_traces(
            fill="toself",
            line_color="#ff8d59",
            fillcolor="rgba(255, 141, 89, 0.28)",
        )
        fig_radar.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#31456f"),
            margin=dict(l=20, r=20, t=20, b=20),
        )
        st.plotly_chart(fig_radar, use_container_width=True)

    with col2:
        data_est = {
            "Persona": st.session_state.estructuras["Persona"],
            "Sombra Profunda": st.session_state.estructuras["Sombra_Total"],
        }
        df_bar = pd.DataFrame(dict(Dim=list(data_est.keys()), Puntos=list(data_est.values())))
        fig_bar = px.bar(
            df_bar,
            x="Dim",
            y="Puntos",
            range_y=[0, 5],
            color_discrete_sequence=["#4f95ff"],
        )
        fig_bar.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#31456f"),
            margin=dict(l=20, r=20, t=20, b=20),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    st.divider()
    st.header("Diagnóstico Ejecutivo")
    if st.session_state.estructuras["Sombra_Total"] >= 3.5:
        st.error(
            "🌑 **Sombra:** Alto nivel de represión. Inviertes excesiva energía en tu "
            "Máscara. Cura: integrar vulnerabilidad antes del burnout."
        )
    else:
        st.success("🌑 **Sombra:** Relación sana con tus instintos. Autenticidad alta.")

    st.info(
        f"🧬 **Keirsey:** Tu temperamento es **{st.session_state.estructuras['Keirsey']}**. "
        "Esto rige tu procesamiento lógico y reacción al estrés."
    )
    st.warning(
        f"⚔️ **Campbell:** Te encuentras en: **{st.session_state.estructuras['Campbell']}**. "
        "Este es tu próximo desafío evolutivo inmediato."
    )

    st.divider()
    st.success("Tu diagnóstico ya está listo para descarga.")
    pdf_buffer = construir_pdf_reporte()
    st.download_button(
        "📥 DESCARGAR DIAGNÓSTICO EJECUTIVO (PDF - 2 páginas)",
        data=pdf_buffer,
        file_name="Reporte_Clinico_Ejecutivo.pdf",
        mime="application/pdf",
        use_container_width=True,
    )


st.set_page_config(
    page_title="Mapa Psicológico Premium",
    layout="centered",
    initial_sidebar_state="collapsed",
)

inicializar_estado()
aplicar_estilos()

if st.session_state.step == "landing":
    render_landing()
elif st.session_state.step == "hook_quiz":
    render_questionnaire(
        title="Tus Instintos Primarios",
        subtitle="Elige la intensidad que mejor describa tu impulso actual.",
        questions=HOOK_QUESTIONS,
        state_answers_key="hook_answers",
        index_key="hook_index",
        progress_start=0.0,
        progress_end=0.5,
        on_complete=procesar_hook,
    )
elif st.session_state.step == "teaser":
    render_teaser()
elif st.session_state.step == "premium_quiz":
    render_questionnaire(
        title="Calibración Profunda",
        subtitle="Responde con honestidad; una pregunta a la vez para afinar el mapa final.",
        questions=PREMIUM_QUESTIONS,
        state_answers_key="premium_answers",
        index_key="premium_index",
        progress_start=0.5,
        progress_end=1.0,
        on_complete=procesar_premium,
    )
else:
    render_dashboard()
