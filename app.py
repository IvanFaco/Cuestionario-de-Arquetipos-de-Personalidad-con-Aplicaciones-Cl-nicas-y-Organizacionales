from io import BytesIO
import textwrap
import unicodedata

from fpdf import FPDF
import pandas as pd
import plotly.express as px
import streamlit as st


LIKERT_OPTIONS = [
    {"value": 1, "emoji": "✖", "label": "Para nada", "short": "1", "color": "#f06d57"},
    {"value": 2, "emoji": "👎", "label": "No tanto", "short": "2", "color": "#f2b4aa"},
    {"value": 3, "emoji": "😐", "label": "Me da igual", "short": "3", "color": "#d9d6ca"},
    {"value": 4, "emoji": "👍", "label": "Puede ser", "short": "4", "color": "#a8d094"},
    {"value": 5, "emoji": "🔥", "label": "Sí, soy yo", "short": "5", "color": "#49b74b"},
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
    :root {
        --surface: #ffffff;
        --surface-muted: #f4f8fc;
        --surface-strong: #edf5ff;
        --ink-strong: #17344a;
        --ink-soft: #597083;
        --border-soft: rgba(43, 99, 140, 0.12);
        --shadow-soft: 0 18px 40px rgba(31, 68, 103, 0.12);
        --blue-strong: #1d58f2;
        --blue-soft: #1596f6;
    }
    .stApp {
        background:
            radial-gradient(circle at top, rgba(111, 181, 214, 0.14), transparent 30%),
            linear-gradient(180deg, #f5fbff 0%, #eaf2f8 100%);
        color: var(--ink-strong);
    }
    [data-testid="stAppViewContainer"] {
        max-width: 460px;
        margin: 0 auto;
    }
    .block-container {
        padding-top: 1rem;
        padding-bottom: 2rem;
    }
    [data-testid="stHeader"] {
        background: transparent;
    }
    h1, h2, h3, h4, h5, h6 {
        color: var(--ink-strong) !important;
        letter-spacing: -0.03em;
    }
    p, li, label, span, div {
        color: var(--ink-soft);
    }
    .stage-page {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        min-height: 100%;
    }
    .hero-card,
    .panel-card,
    .summary-card,
    .ranking-card {
        background: var(--surface);
        border: 1px solid var(--border-soft);
        border-radius: 1.6rem;
        box-shadow: var(--shadow-soft);
    }
    .hero-card,
    .summary-card,
    .ranking-card {
        padding: 1.05rem;
    }
    .panel-card {
        padding: 1rem;
        background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
    }
    .eyebrow {
        color: #3f789a;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 0.4rem;
    }
    .hero-title {
        color: var(--ink-strong);
        font-size: clamp(1.95rem, 7vw, 2.8rem);
        line-height: 0.98;
        margin: 0;
    }
    .hero-copy {
        font-size: 0.98rem;
        line-height: 1.45;
        margin: 0.7rem 0 0;
    }
    .landing-bullets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: 0.95rem;
    }
    .landing-bullets span,
    .metric-chip,
    .status-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2rem;
        padding: 0 0.75rem;
        border-radius: 999px;
        font-size: 0.74rem;
        font-weight: 800;
    }
    .landing-bullets span,
    .metric-chip {
        background: rgba(255, 255, 255, 0.74);
        border: 1px solid var(--border-soft);
        color: var(--ink-strong);
    }
    .status-pill {
        background: #153b52;
        color: white;
    }
    .stat-strip {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.55rem;
        margin-top: 1rem;
    }
    .mini-stat {
        padding: 0.75rem;
        border-radius: 1rem;
        border: 1px solid var(--border-soft);
        background: linear-gradient(180deg, #fff 0%, #f7fbfe 100%);
    }
    .mini-stat__value {
        display: block;
        font-size: 1rem;
        font-weight: 800;
        color: var(--ink-strong);
    }
    .mini-stat__label {
        font-size: 0.72rem;
        color: var(--ink-soft);
    }
    .form-title {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--ink-strong);
        margin-bottom: 0.4rem;
    }
    .surface-note {
        padding: 0.8rem 0.9rem;
        border-radius: 1rem;
        background: linear-gradient(180deg, #f8fbfe 0%, #eef5fa 100%);
        border: 1px solid var(--border-soft);
        color: var(--ink-soft);
        font-size: 0.84rem;
        line-height: 1.35;
    }
    .question-progress {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
    }
    .question-progress__track {
        flex: 1 1 auto;
        height: 0.7rem;
        border-radius: 999px;
        background: #d0d1d4;
        overflow: hidden;
    }
    .question-progress__fill {
        height: 100%;
        background: linear-gradient(90deg, #0a8e0d 0%, #14910f 100%);
        border-radius: 999px;
    }
    .question-progress__count {
        color: #232a31;
        font-size: 0.86rem;
        font-weight: 800;
    }
    .question-title {
        font-size: clamp(1.2rem, 5vw, 1.65rem);
        font-weight: 800;
        line-height: 1.04;
        text-align: center;
        max-width: 17rem;
        margin: 0.15rem auto 0;
        color: var(--ink-strong);
    }
    .question-card-panel__body {
        min-height: 16rem;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    .question-text {
        color: #1f2328;
        font-size: clamp(1.45rem, 6vw, 2.15rem);
        font-weight: 800;
        line-height: 1.02;
        letter-spacing: -0.04em;
        max-width: 18rem;
        margin: 0;
    }
    .question-selection {
        margin-top: 1rem;
        min-height: 4.7rem;
        padding: 0.9rem 1rem;
        border-radius: 1.4rem;
        background: #f0f1f4;
        text-align: center;
    }
    .question-selection__label {
        display: block;
        font-size: 0.88rem;
        color: #282d32;
    }
    .question-selection__value {
        display: block;
        margin-top: 0.25rem;
        color: #2f2f2f;
        font-size: 1.02rem;
        font-weight: 800;
        line-height: 1.15;
    }
    .question-help {
        text-align: center;
        font-size: 0.82rem;
        margin-top: 0.4rem;
        color: #708395;
    }
    .likert-note {
        margin-top: 0.55rem;
        padding: 0.8rem 0.9rem;
        border-radius: 1rem;
        background: linear-gradient(180deg, #f8fbfe 0%, #eef5fa 100%);
        border: 1px solid var(--border-soft);
        text-align: center;
        font-size: 0.84rem;
        font-weight: 700;
    }
    .likert-label {
        margin-top: 0.32rem;
        min-height: 2rem;
        text-align: center;
        font-size: 0.74rem;
        line-height: 1.08;
        color: #8b837a;
    }
    .likert-label.active {
        color: #3a3530;
        font-weight: 700;
    }
    .teaser-headline {
        color: #17344a;
        font-size: clamp(1.9rem, 7vw, 2.8rem);
        line-height: 0.96;
        letter-spacing: -0.05em;
        margin: 0.15rem 0 0;
    }
    .teaser-summary {
        color: #597083;
        font-size: 0.98rem;
        line-height: 1.45;
    }
    .teaser-ranking,
    .dashboard-metrics,
    .dashboard-meta {
        display: grid;
        gap: 0.55rem;
    }
    .teaser-ranking {
        grid-template-columns: repeat(3, 1fr);
        margin-top: 0.9rem;
    }
    .dashboard-metrics {
        grid-template-columns: repeat(3, 1fr);
        margin-top: 0.9rem;
    }
    .dashboard-meta {
        grid-template-columns: repeat(2, 1fr);
        margin-top: 0.9rem;
    }
    .teaser-ranking__item,
    .dashboard-metric,
    .dashboard-meta__item {
        padding: 0.8rem 0.7rem;
        border-radius: 1.1rem;
        border: 1px solid var(--border-soft);
        background: linear-gradient(180deg, #ffffff 0%, #f4f8fc 100%);
    }
    .teaser-ranking__position,
    .dashboard-metric__label,
    .dashboard-meta__label {
        color: #3f789a;
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .teaser-ranking__name,
    .dashboard-meta__value {
        color: #17344a;
        font-size: 0.9rem;
        line-height: 1.18;
        margin-top: 0.2rem;
    }
    .dashboard-metric__value {
        color: #17344a;
        font-size: 1.4rem;
        font-weight: 800;
        line-height: 1;
        margin-top: 0.2rem;
    }
    .ranking-list {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        margin-top: 0.8rem;
    }
    .ranking-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.55rem 0.7rem;
        border-radius: 0.85rem;
        background: #f3f8fc;
    }
    .ranking-item__name {
        color: var(--ink-strong);
        font-size: 0.85rem;
    }
    .ranking-item__score {
        min-width: 3rem;
        text-align: center;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        background: white;
        border: 1px solid var(--border-soft);
        color: var(--ink-strong);
        font-size: 0.76rem;
        font-weight: 800;
    }
    .stSelectbox label, .stNumberInput label {
        font-weight: 700 !important;
    }
    .stSelectbox > div > div,
    .stNumberInput > div > div > input {
        border-radius: 1rem !important;
        border-color: rgba(43, 99, 140, 0.16) !important;
        min-height: 3rem;
    }
    .stButton > button,
    .stDownloadButton > button {
        width: 100%;
        border-radius: 999px !important;
        min-height: 3rem;
        font-weight: 800 !important;
        border: none !important;
        box-shadow: 0 10px 24px rgba(34, 76, 112, 0.12);
    }
    .primary-cta .stButton > button,
    .primary-cta .stDownloadButton > button {
        min-height: 3.4rem;
        background: linear-gradient(135deg, var(--blue-strong) 0%, var(--blue-soft) 100%) !important;
        color: white !important;
    }
    .back-button .stButton > button {
        min-height: 3.2rem;
        background: #ffffff !important;
        color: #8c98a3 !important;
        border: 1px solid rgba(27, 79, 120, 0.08) !important;
    }
    .answer-button .stButton > button {
        min-height: 3.4rem;
        font-size: 1.15rem !important;
        color: #18212a !important;
        background: #ffffff !important;
    }
    .answer-button-1 .stButton > button { background: #f06d57 !important; color: white !important; }
    .answer-button-2 .stButton > button { background: #f2b4aa !important; color: #402620 !important; }
    .answer-button-3 .stButton > button { background: #d9d6ca !important; color: #3b3935 !important; }
    .answer-button-4 .stButton > button { background: #a8d094 !important; color: #17341f !important; }
    .answer-button-5 .stButton > button { background: #49b74b !important; color: white !important; }
    .answer-button-selected .stButton > button {
        transform: translateY(-2px) scale(1.03);
        box-shadow:
            0 0 0 4px rgba(255,255,255,0.95),
            0 16px 26px rgba(69, 92, 141, 0.18) !important;
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
            "Alto nivel de represión. Conviene integrar vulnerabilidad y bajar la autoexigencia antes del burnout."
        )
    else:
        sombra_texto = (
            "Relación sana con los impulsos e identidad. La autenticidad aparece como un recurso disponible."
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
            f"La tríada dominante ({triada}) sugiere un estilo de adaptación consistente "
            "entre estructura, defensa y dirección vital."
        ),
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, normalizar_pdf("2. Ranking de arquetipos"), ln=1)
    pdf.set_font("Helvetica", "", 11)
    for indice, (nombre, puntaje) in enumerate(ranking, start=1):
        pdf.cell(0, 6, normalizar_pdf(f"{indice}. {nombre}: {puntaje:.1f} puntos"), ln=1)
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
        "Bajar la distancia entre imagen pública y experiencia emocional real.",
        "Usar el temperamento Keirsey como criterio para decidir bajo estrés.",
        f"Trabajar la etapa Campbell actual: {estructuras.get('Campbell', 'No disponible')}.",
    ]
    for recomendacion in recomendaciones:
        escribir_parrafo_pdf(pdf, f"- {recomendacion}")

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    escribir_parrafo_pdf(
        pdf,
        "Documento interpretativo y educativo. No sustituye evaluación clínica profesional.",
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


def render_question_status_note(selected_value: int | None = None) -> None:
    if selected_value:
        selected = next(option for option in LIKERT_OPTIONS if option["value"] == selected_value)
        message = f"Elegiste: {selected['label']}. La respuesta se guarda y avanza automáticamente."
    else:
        message = "Aún no eliges una opción. Selecciona una respuesta para continuar."
    st.markdown(f"<div class='likert-note'>{message}</div>", unsafe_allow_html=True)


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


def render_progress(current_index: int, total_questions: int, progress_value: float) -> None:
    st.markdown(
        f"""
<div class="question-progress">
    <div class="question-progress__track">
        <div class="question-progress__fill" style="width: {progress_value * 100:.0f}%;"></div>
    </div>
    <span class="question-progress__count">{current_index + 1}/{total_questions}</span>
</div>
""",
        unsafe_allow_html=True,
    )


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

    st.markdown('<div class="stage-page">', unsafe_allow_html=True)
    render_progress(current_index, len(questions), progress_value)
    st.markdown(f"<h1 class='question-title'>{title}</h1>", unsafe_allow_html=True)

    selected_label = "Selecciona una respuesta"
    selected_hint = "Aún no eliges una opción"
    if selected_value:
        selected = next(option for option in LIKERT_OPTIONS if option["value"] == selected_value)
        selected_label = selected["label"]
        selected_hint = "Elegiste"

    st.markdown(
        f"""
<div class="panel-card">
    <div class="question-card-panel__body">
        <p class="question-text">"{prompt}"</p>
    </div>
    <div class="question-selection">
        <span class="question-selection__label">{selected_hint}</span>
        <span class="question-selection__value">{selected_label}</span>
    </div>
    <div class="question-help">{subtitle}</div>
</div>
""",
        unsafe_allow_html=True,
    )

    button_cols = st.columns(5, gap="small")
    for option, col in zip(LIKERT_OPTIONS, button_cols):
        with col:
            selected_class = " answer-button-selected" if selected_value == option["value"] else ""
            st.markdown(
                f"<div class='answer-button answer-button-{option['value']}{selected_class}'>",
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
            label_class = "likert-label active" if selected_value == option["value"] else "likert-label"
            st.markdown(f"<div class='{label_class}'>{option['label']}</div>", unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)

    render_question_status_note(selected_value)

    nav_left, nav_right = st.columns([1, 3], gap="small")
    with nav_left:
        if current_index > 0:
            st.markdown("<div class='back-button'>", unsafe_allow_html=True)
            if st.button("←", key=f"back_{state_answers_key}", use_container_width=True):
                st.session_state[index_key] -= 1
                st.rerun()
            st.markdown("</div>", unsafe_allow_html=True)
    with nav_right:
        st.markdown(
            "<div class='surface-note'>Cada selección se registra al instante para mantener el flujo ágil en móvil.</div>",
            unsafe_allow_html=True,
        )
    st.markdown("</div>", unsafe_allow_html=True)


def render_landing() -> None:
    st.markdown(
        """
<div class="stage-page">
    <div class="hero-card">
        <div class="eyebrow">Mapa Psicológico Premium</div>
        <div class="status-pill">Experiencia móvil guiada</div>
        <h1 class="hero-title">El mapa de tu psique</h1>
        <p class="hero-copy">Descubre tu estructura psicológica, tu sombra y tu temperamento con una experiencia más clara, ligera y lista para explorarse paso a paso.</p>
        <div class="landing-bullets">
            <span>12 arquetipos</span>
            <span>Sombra junguiana</span>
            <span>PDF ejecutivo</span>
            <span>Lectura guiada</span>
        </div>
        <div class="stat-strip">
            <div class="mini-stat">
                <span class="mini-stat__value">10</span>
                <span class="mini-stat__label">preguntas base</span>
            </div>
            <div class="mini-stat">
                <span class="mini-stat__value">15</span>
                <span class="mini-stat__label">preguntas premium</span>
            </div>
            <div class="mini-stat">
                <span class="mini-stat__value">2</span>
                <span class="mini-stat__label">páginas PDF</span>
            </div>
        </div>
    </div>
</div>
""",
        unsafe_allow_html=True,
    )
    st.markdown("<div class='panel-card'>", unsafe_allow_html=True)
    st.markdown("<div class='form-title'>Paso 1: calibración demográfica</div>", unsafe_allow_html=True)
    st.markdown(
        "<div class='surface-note'>Necesitamos una base breve para personalizar el mapa y ubicar tu etapa evolutiva.</div>",
        unsafe_allow_html=True,
    )
    genero = st.selectbox("Género", ["Hombre", "Mujer", "Otro"])
    edad = st.number_input("Edad exacta", min_value=18, max_value=99, value=35, step=1)
    st.markdown("<div class='primary-cta'>", unsafe_allow_html=True)
    if st.button("Continuar al test clínico", type="primary", use_container_width=True):
        st.session_state.demo = {
            "genero": genero,
            "edad_exacta": int(edad),
            "rango_edad": obtener_rango_edad(int(edad)),
        }
        st.session_state.hook_answers = {}
        st.session_state.hook_index = 0
        st.session_state.step = "hook_quiz"
        st.rerun()
    st.markdown("</div></div>", unsafe_allow_html=True)


def render_ranking_cards(ranking: list[tuple[str, float]], count: int = 3) -> str:
    cards = []
    for position, (nombre, _) in enumerate(ranking[:count], start=1):
        cards.append(
            f"""
<div class="teaser-ranking__item">
    <div class="teaser-ranking__position">Top {position}</div>
    <div class="teaser-ranking__name">{nombre}</div>
</div>
"""
        )
    return "".join(cards)


def render_score_list(ranking: list[tuple[str, float]]) -> str:
    return "".join(
        f"""
<div class="ranking-item">
    <span class="ranking-item__name">{nombre}</span>
    <span class="ranking-item__score">{puntaje:.1f}</span>
</div>
"""
        for nombre, puntaje in ranking
    )


def render_teaser() -> None:
    ordenados = obtener_ranking(st.session_state.scores)
    dominante = ordenados[0][0]
    edad_exacta = st.session_state.demo.get("edad_exacta", "No especificada")

    st.markdown(
        f"""
<div class="stage-page">
    <div class="summary-card">
        <div class="eyebrow">Diagnóstico estructural preliminar</div>
        <div class="metric-chip">50% completado</div>
        <h2 class="teaser-headline">{dominante}</h2>
        <p class="teaser-summary">A tus <strong>{edad_exacta}</strong> años, tu psique se organiza primero desde la energía del <strong>{dominante}</strong>. Hay capacidad de estructura, lectura rápida del entorno y necesidad de coherencia interna.</p>
        <div class="teaser-ranking">
            {render_ranking_cards(ordenados)}
        </div>
    </div>
</div>
""",
        unsafe_allow_html=True,
    )
    st.markdown(
        """
<div class="panel-card">
    <div class="eyebrow">Punto ciego detectado</div>
    <p class="hero-copy">Vemos una tensión entre tu imagen pública y algunos impulsos ocultos. Si esa sombra no se integra, puede aparecer como fatiga, rigidez o burnout.</p>
    <div class="surface-note">Desbloquea el mapa profundo para sumar sombra junguiana, Keirsey, Campbell y el PDF ejecutivo.</div>
</div>
""",
        unsafe_allow_html=True,
    )
    st.markdown("<div class='primary-cta'>", unsafe_allow_html=True)
    if st.button("Acceder al test de calibración profunda", type="primary", use_container_width=True):
        st.session_state.premium_answers = {}
        st.session_state.premium_index = 0
        st.session_state.step = "premium_quiz"
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)


def render_dashboard() -> None:
    ordenados = obtener_ranking(st.session_state.scores)
    dominante, dominante_score = ordenados[0]
    top_three = ", ".join(nombre for nombre, _ in ordenados[:3])
    sombra_total = st.session_state.estructuras["Sombra_Total"]

    st.markdown(
        f"""
<div class="stage-page">
    <div class="summary-card">
        <div class="eyebrow">Mapa clínico y estructural</div>
        <div class="status-pill">Diagnóstico listo</div>
        <h1 class="hero-title">{dominante}</h1>
        <p class="hero-copy">Tu tríada dominante es <strong>{top_three}</strong>. La lectura integra arquetipo, estructura defensiva y dirección evolutiva en una sola vista.</p>
        <div class="dashboard-metrics">
            <div class="dashboard-metric">
                <div class="dashboard-metric__label">Dominante</div>
                <div class="dashboard-metric__value">{dominante_score:.1f}</div>
            </div>
            <div class="dashboard-metric">
                <div class="dashboard-metric__label">Persona</div>
                <div class="dashboard-metric__value">{st.session_state.estructuras['Persona']:.1f}</div>
            </div>
            <div class="dashboard-metric">
                <div class="dashboard-metric__label">Sombra</div>
                <div class="dashboard-metric__value">{sombra_total:.1f}</div>
            </div>
        </div>
        <div class="dashboard-meta">
            <div class="dashboard-meta__item">
                <div class="dashboard-meta__label">Keirsey</div>
                <div class="dashboard-meta__value">{st.session_state.estructuras['Keirsey']}</div>
            </div>
            <div class="dashboard-meta__item">
                <div class="dashboard-meta__label">Campbell</div>
                <div class="dashboard-meta__value">{st.session_state.estructuras['Campbell']}</div>
            </div>
        </div>
    </div>
</div>
""",
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns(2, gap="small")
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
            line_color="#1596f6",
            fillcolor="rgba(21, 150, 246, 0.18)",
        )
        fig_radar.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#31456f"),
            margin=dict(l=10, r=10, t=10, b=10),
        )
        st.plotly_chart(fig_radar, use_container_width=True)

    with col2:
        data_est = {
            "Persona": st.session_state.estructuras["Persona"],
            "Sombra": st.session_state.estructuras["Sombra_Total"],
        }
        df_bar = pd.DataFrame(dict(Dim=list(data_est.keys()), Puntos=list(data_est.values())))
        fig_bar = px.bar(
            df_bar,
            x="Dim",
            y="Puntos",
            range_y=[0, 5],
            color_discrete_sequence=["#153b52"],
        )
        fig_bar.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#31456f"),
            margin=dict(l=10, r=10, t=10, b=10),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    insight = (
        "alta represión, conviene integrar vulnerabilidad antes del burnout."
        if sombra_total >= 3.5
        else "relación saludable con tus impulsos y buena autenticidad disponible."
    )
    st.markdown(
        f"""
<div class="ranking-card">
    <div class="eyebrow">Ranking completo</div>
    <div class="surface-note">Sombra: {insight}</div>
    <div class="ranking-list">
        {render_score_list(ordenados)}
    </div>
</div>
""",
        unsafe_allow_html=True,
    )
    pdf_buffer = construir_pdf_reporte()
    st.markdown("<div class='primary-cta'>", unsafe_allow_html=True)
    st.download_button(
        "Descargar diagnóstico ejecutivo en PDF",
        data=pdf_buffer,
        file_name="Reporte_Clinico_Ejecutivo.pdf",
        mime="application/pdf",
        use_container_width=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)


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
        title="¿Te identificas con la siguiente afirmación?",
        subtitle="Elige la intensidad que mejor describe tu impulso actual.",
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
        title="Calibración profunda",
        subtitle="Responde con honestidad. Vamos una pregunta a la vez para afinar el mapa final.",
        questions=PREMIUM_QUESTIONS,
        state_answers_key="premium_answers",
        index_key="premium_index",
        progress_start=0.5,
        progress_end=1.0,
        on_complete=procesar_premium,
    )
else:
    render_dashboard()
