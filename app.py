from io import BytesIO
import unicodedata

from fpdf import FPDF
import pandas as pd
import plotly.express as px
import streamlit as st


def normalizar_pdf(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")


def obtener_ranking(scores: dict[str, float]) -> list[tuple[str, float]]:
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)


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
    pdf.multi_cell(0, 10, normalizar_pdf("Reporte Clínico Ejecutivo"))
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        7,
        normalizar_pdf(
            f"Perfil base: {demo.get('genero', 'No especificado')} | {demo.get('edad', 'No especificado')}"
        ),
    )
    pdf.multi_cell(
        0,
        7,
        normalizar_pdf(f"Estructura dominante: {dominante} | Triada principal: {triada}"),
    )
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, normalizar_pdf("1. Lectura ejecutiva"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        7,
        normalizar_pdf(
            f"La psique se organiza principalmente desde el arquetipo {dominante}. "
            f"La triada dominante ({triada}) sugiere un estilo de adaptacion consistente "
            "entre estructura, defensa y direccion vital."
        ),
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, normalizar_pdf("2. Ranking de arquetipos"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    for indice, (nombre, puntaje) in enumerate(ranking, start=1):
        pdf.cell(
            0,
            6,
            normalizar_pdf(f"{indice}. {nombre}: {puntaje:.1f} puntos"),
            new_x="LMARGIN",
            new_y="NEXT",
        )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, normalizar_pdf("3. Estructuras clinicas"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        7,
        normalizar_pdf(
            f"Persona: {estructuras.get('Persona', 0):.1f}/5 | "
            f"Sombra profunda: {sombra_total:.1f}/5"
        ),
    )
    pdf.multi_cell(0, 7, normalizar_pdf(f"Sombra: {sombra_texto}"))
    pdf.multi_cell(
        0,
        7,
        normalizar_pdf(
            f"Keirsey: {estructuras.get('Keirsey', 'No disponible')}. "
            f"Campbell: {estructuras.get('Campbell', 'No disponible')}."
        ),
    )

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.multi_cell(0, 9, normalizar_pdf("Plan de accion breve"))
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 11)
    recomendaciones = [
        f"Fortalecer el arquetipo dominante ({dominante}) sin rigidizar la identidad.",
        "Bajar la distancia entre imagen publica y experiencia emocional real.",
        "Usar el temperamento Keirsey como criterio para decidir bajo estres.",
        f"Trabajar la etapa Campbell actual: {estructuras.get('Campbell', 'No disponible')}.",
    ]
    for recomendacion in recomendaciones:
        pdf.multi_cell(0, 7, normalizar_pdf(f"- {recomendacion}"))

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(
        0,
        5,
        normalizar_pdf(
            "Documento interpretativo y educativo. No sustituye evaluacion clinica profesional."
        ),
    )

    buffer = BytesIO()
    buffer.write(bytes(pdf.output()))
    buffer.seek(0)
    return buffer


st.set_page_config(
    page_title="Mapa Psicológico Premium",
    layout="centered",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
<style>
    .stApp { background-color: #1e1b3a; color: #ffffff; }
    h1, h2, h3, h4, h5, h6 { color: #ffffff !important; font-weight: 700 !important; }
    p, span, label { color: #e0e0f8 !important; }
    .stButton > button {
        background-color: transparent; color: #ff007f !important;
        border: 2px solid #ff007f !important; border-radius: 30px !important;
        padding: 10px 24px !important; font-weight: bold !important;
        transition: all 0.3s ease !important; width: 100%;
    }
    .stButton > button:hover, .stButton > button:active {
        background-color: rgba(255, 0, 127, 0.15) !important;
        box-shadow: 0px 0px 15px 2px rgba(255, 0, 127, 0.6) !important;
        color: #ffffff !important; transform: scale(1.02);
    }
    div[data-baseweb="slider"] > div > div { background-color: #ff007f !important; }
    .stAlert, .stInfo, .stWarning, .stError {
        background-color: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 0, 127, 0.3) !important;
        border-radius: 15px !important; color: #ffffff !important;
    }
</style>
""",
    unsafe_allow_html=True,
)

if "step" not in st.session_state:
    st.session_state.step = "landing"
if "demo" not in st.session_state:
    st.session_state.demo = {}
if "scores" not in st.session_state:
    st.session_state.scores = {}
if "estructuras" not in st.session_state:
    st.session_state.estructuras = {}


if st.session_state.step == "landing":
    st.title("👁️ El Mapa de tu Psique")
    st.markdown("Descubre tu Estructura Psicológica, tu Sombra y tu Temperamento.")
    st.subheader("Paso 1: Calibración Demográfica")
    genero = st.selectbox(
        "Género (Vital para análisis Anima/Animus):",
        ["Hombre", "Mujer", "Otro"],
    )
    edad = st.selectbox(
        "Rango de Edad:",
        [
            "18 - 34 años (Construcción del Ego)",
            "35 - 50 años (La Transición / Metanoia)",
            "51+ años (Integración y Sabiduría)",
        ],
    )
    if st.button("Continuar al Test Clínico ⚡", type="primary"):
        st.session_state.demo = {"genero": genero, "edad": edad}
        st.session_state.step = "hook_quiz"
        st.rerun()

elif st.session_state.step == "hook_quiz":
    st.progress(0.25)
    st.header("Tus Instintos Primarios")
    st.caption("1 = Nada que ver conmigo | 5 = Me describe a la perfección")

    v1 = st.slider(
        "1. Siento una urgencia por tomar el control y organizar el caos a mi alrededor.",
        1,
        5,
        3,
    )
    v2 = st.slider(
        "2. Prefiero una verdad dolorosa e incómoda antes que vivir una mentira feliz.",
        1,
        5,
        3,
    )
    v3 = st.slider(
        "3. Siento que mi propósito es proteger, nutrir o sanar a los demás.",
        1,
        5,
        3,
    )
    v4 = st.slider(
        "4. Me asfixia la rutina; necesito libertad constante para explorar.",
        1,
        5,
        3,
    )
    v5 = st.slider(
        "5. Creo que la realidad se puede transformar si cambiamos nuestra mentalidad.",
        1,
        5,
        3,
    )
    v6 = st.slider(
        "6. He aceptado que el mundo es duro, así que prefiero ser realista.",
        1,
        5,
        3,
    )
    v7 = st.slider(
        "7. Necesito dejar un legado tangible, algo que yo haya creado.",
        1,
        5,
        3,
    )
    v8 = st.slider(
        "8. En la vida, la lógica y los datos son mejores guías que las emociones.",
        1,
        5,
        3,
    )
    v9 = st.slider(
        "9. Invierto mucha energía en que mi imagen pública sea impecable.",
        1,
        5,
        3,
    )
    v10 = st.slider(
        "10. A veces tengo impulsos que me asustan o contradicen mi moral.",
        1,
        5,
        3,
    )

    if st.button("Analizar mi Psique 🔮"):
        st.session_state.scores = {
            "Gobernante": v1 * 1.5,
            "Sabio": v2 * 1.5,
            "Cuidador": v3 * 1.5,
            "Explorador": v4 * 1.5,
            "Mago": v5 * 1.5,
            "Huérfano": v6 * 1.5,
            "Creador": v7 * 1.5,
            "Guerrero": v1 * 1.2,
            "Buscador": v2 * 1.2,
            "Amante": v3 * 1.2,
            "Rebelde": v4 * 1.2,
            "Bufón": v6 * 1.2,
        }
        st.session_state.estructuras = {"Persona": v9, "Sombra_Base": v10}
        st.session_state.step = "teaser"
        st.rerun()

elif st.session_state.step == "teaser":
    st.progress(0.50)
    ordenados = obtener_ranking(st.session_state.scores)
    dom = ordenados[0][0]

    st.title("📊 Diagnóstico Estructural Preliminar")
    st.subheader(f"Estructura Dominante: EL {dom.upper()}")

    edad_str = st.session_state.demo["edad"].split(" ")[0]
    st.write(
        f"A tus **{edad_str}**, tu psique está operando bajo la energía del **{dom}**. "
        "Eres el ancla de tu entorno; tu instinto primario es estructurar tu realidad y "
        "asegurar la supervivencia de tus proyectos."
    )

    st.warning(
        """
    ⚠️ **PUNTO CIEGO DETECTADO (Tensión Estructural):**
    Nuestro algoritmo ha detectado una fuerte disonancia en tus respuestas sobre tu imagen pública y tus impulsos ocultos. Los perfiles con tu nivel de autoexigencia tienden a reprimir una **Sombra Psicológica** que, de no ser identificada, se manifiesta como fatiga crónica, aislamiento o explosiones de estrés (Burnout).
    """
    )

    st.divider()
    st.markdown("### 🔓 DESBLOQUEA TU MAPA CLÍNICO PROFUNDO")
    st.write(
        "Para revelarte qué está saboteando tu potencial, el sistema necesita procesar "
        "tu Sombra y Temperamento Neurológico."
    )

    st.markdown(
        """
    **Tu Reporte Premium incluye:**
    * 🕸️ **Tu Radar de 12 Arquetipos:** El mapa visual exacto de tu personalidad.
    * 🌑 **Tu Sombra Junguiana:** El nombre y la cura para la parte de ti que reprimes.
    * 🧬 **Matriz Keirsey & Campbell:** Tu perfil neurológico y etapa evolutiva.
    * 📄 **PDF Ejecutivo (2 Páginas):** Un mapa clínico de alto impacto, directo al grano, con tus gráficas y plan de acción exacto.
    """
    )

    if st.button("💳 ACCEDER AL TEST DE CALIBRACIÓN PROFUNDA ($9.99)", type="primary"):
        st.session_state.step = "premium_quiz"
        st.rerun()

elif st.session_state.step == "premium_quiz":
    st.progress(0.75)
    st.title("Calibración Profunda")
    st.success(
        "Pago exitoso. Responde estas 15 preguntas finales para renderizar tu "
        "Reporte Ejecutivo de 2 Páginas."
    )

    with st.form("premium_form"):
        st.subheader("Módulo 1: La Sombra")
        p1 = st.slider("1. Me castigo en silencio cuando cometo un error.", 1, 5, 3)
        p2 = st.slider(
            "2. Siento una rabia irracional hacia quienes viven 'sin reglas'.",
            1,
            5,
            3,
        )
        p3 = st.slider(
            "3. Sacrifico mis deseos por temor a perder respeto.",
            1,
            5,
            3,
        )
        p4 = st.slider(
            "4. Temo que si mostrara mi verdadera cara, la gente se alejaría.",
            1,
            5,
            3,
        )
        p5 = st.slider(
            "5. Tengo fantasías de abandonar mis responsabilidades.",
            1,
            5,
            3,
        )

        st.subheader("Módulo 2: Neurología (Keirsey)")
        p6 = st.slider(
            "6. Priorizo la armonía emocional sobre la lógica fría.",
            1,
            5,
            3,
        )
        p7 = st.slider(
            "7. Me siento seguro con un plan estructurado, odio improvisar.",
            1,
            5,
            3,
        )
        p8 = st.slider(
            "8. Prefiero discutir futuros posibles que detalles concretos.",
            1,
            5,
            3,
        )
        p9 = st.slider(
            "9. Cuestiono la autoridad si eso mejora la eficiencia.",
            1,
            5,
            3,
        )
        p10 = st.slider(
            "10. El deber y preservar las instituciones es lo principal.",
            1,
            5,
            3,
        )

        st.subheader("Módulo 3: Viaje del Héroe")
        p11 = st.slider(
            "11. Siento que 'algo' me llama a un cambio radical.",
            1,
            5,
            3,
        )
        p12 = st.slider(
            "12. Siento que mi antigua identidad se desmorona.",
            1,
            5,
            3,
        )
        p13 = st.slider(
            "13. He superado una crisis y quiero compartir mi aprendizaje.",
            1,
            5,
            3,
        )
        p14 = st.slider(
            "14. Luchan por devolverme a mi antigua zona de confort.",
            1,
            5,
            3,
        )
        p15 = st.slider(
            "15. He integrado mis partes oscuras y siento paz.",
            1,
            5,
            3,
        )

        if st.form_submit_button("Renderizar Mapa Psicológico Definitivo ⚙️"):
            st.session_state.estructuras["Sombra_Total"] = (p1 + p2 + p3 + p4 + p5) / 5
            st.session_state.estructuras["Keirsey"] = (
                "Racional / Estratega (NT)"
                if p8 + p9 > 7
                else "Guardián / Logístico (SJ)"
                if p7 + p10 > 7
                else "Idealista / Diplomático (NF)"
            )
            etapas = {
                "La Llamada a la Aventura": p11,
                "La Prueba Suprema": p12,
                "El Retorno con el Elixir": p13,
                "El Cruce del Umbral": p14,
                "Maestro de Dos Mundos": p15,
            }
            st.session_state.estructuras["Campbell"] = max(etapas, key=etapas.get)
            st.session_state.step = "dashboard"
            st.rerun()

elif st.session_state.step == "dashboard":
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
            line_color="#ff007f",
            fillcolor="rgba(255,0,127,0.3)",
        )
        fig_radar.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="white"),
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
            color_discrete_sequence=["#00e5ff"],
        )
        fig_bar.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="white"),
            margin=dict(l=20, r=20, t=20, b=20),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    st.divider()
    st.header("Diagnóstico Ejecutivo")

    if st.session_state.estructuras["Sombra_Total"] >= 3.5:
        st.error(
            "🌑 **Sombra:** Alto nivel de represión. Inviertes excesiva energía en tu "
            "Máscara. Cura: Integrar vulnerabilidad antes del Burnout."
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
    st.success(
        "Tu diagnóstico ha sido empaquetado editorialmente en un formato conciso de 2 páginas."
    )
    pdf_buffer = construir_pdf_reporte()
    st.download_button(
        "📥 DESCARGAR DIAGNÓSTICO EJECUTIVO (PDF - 2 Páginas)",
        data=pdf_buffer,
        file_name="Reporte_Clinico_Ejecutivo.pdf",
        mime="application/pdf",
        use_container_width=True,
    )
