import type { ArchetypeScore } from "./assessment.types.js";

export const REPORT_TITLE = "INFORME AMPLIADO DE PERSONALIDAD";
export const REPORT_INTRO_TITLE = "Resumen Introduccion";
export const REPORT_SOURCE_LABEL = "Fuente narrativa: Coach de autoconocimiento digital";
export const REPORT_ACTION_STEP_COUNT = 3;

export const REPORT_BRAND = {
  logoPath: "public/assets/logo-256.png",
  name: "MiRealYo.com",
  colors: {
    lavender: "#D2CBE0",
    surface: "#F8F6FC",
    surfaceStrong: "#F1EDF8",
    border: "#E0DCEB",
    ink: "#24304C",
    secondary: "#656C84",
    blue: "#2E7AFF",
    violet: "#7658C4",
    teal: "#4DC4C9",
    coral: "#F38E54",
    success: "#48B478",
    warning: "#F5BE46",
    error: "#E15C5C"
  }
} as const;

export type ReportSectionId = "mapa" | "sombra" | "keirsey" | "heroe" | "pasos";

export type ReportSectionRule = {
  id: ReportSectionId;
  number: string;
  title: string;
  subtitle: string;
  startMarker: string;
  startAliases: string[];
  questionLabel: "Pregunta metacognitiva" | "Pregunta guia";
  minWords: number;
  maxChars: number;
};

export const REPORT_SECTIONS: ReportSectionRule[] = [
  {
    id: "mapa",
    number: "1",
    title: "Tu Mapa Visual: La Fortaleza de la Triada",
    subtitle: "Apertura y Espejo",
    startMarker: "1. Tu Mapa Visual",
    startAliases: [
      "1. Apertura y Espejo",
      "Apertura y Espejo (Radar de Ejes)",
      "Radar de Ejes"
    ],
    questionLabel: "Pregunta metacognitiva",
    minWords: 55,
    maxChars: 860
  },
  {
    id: "sombra",
    number: "2",
    title: "Tu Sombra Oculta",
    subtitle: "Profundidad y Autosabotaje",
    startMarker: "2. Tu Sombra Oculta",
    startAliases: [
      "2. Profundidad y Autosabotaje",
      "Profundidad y Autosabotaje (Tu Sombra Oculta)"
    ],
    questionLabel: "Pregunta metacognitiva",
    minWords: 55,
    maxChars: 860
  },
  {
    id: "keirsey",
    number: "3",
    title: "El Sistema Operativo: Matriz Keirsey",
    subtitle: "",
    startMarker: "3. El Sistema Operativo",
    startAliases: [
      "3. El Sistema Operativo bajo Presion",
      "El Sistema Operativo bajo Presion (Matriz Keirsey)",
      "Matriz Keirsey"
    ],
    questionLabel: "Pregunta metacognitiva",
    minWords: 50,
    maxChars: 760
  },
  {
    id: "heroe",
    number: "4",
    title: "El Horizonte Evolutivo: El Viaje del Heroe",
    subtitle: "",
    startMarker: "4. El Horizonte Evolutivo",
    startAliases: [
      "4. El Horizonte Evolutivo",
      "El Horizonte Evolutivo (El Viaje del Heroe)"
    ],
    questionLabel: "Pregunta metacognitiva",
    minWords: 50,
    maxChars: 760
  },
  {
    id: "pasos",
    number: "5",
    title: "Siguientes Pasos: Plan de Accion Tactico",
    subtitle: "Accion concreta",
    startMarker: "5. Siguientes Pasos",
    startAliases: [
      "5. Cierre y Plan de Accion",
      "Cierre y Plan de Accion (Siguientes Pasos)",
      "Plan de Accion (Siguientes Pasos)"
    ],
    questionLabel: "Pregunta guia",
    minWords: 24,
    maxChars: 640
  }
];

export const REPORT_INTRO_RULE = {
  minWords: 35,
  maxChars: 720
};

export const REPORT_PROHIBITED_PATTERNS = [
  "fuente narrativa agente ia",
  "como modelo de lenguaje",
  "no puedo ayudarte",
  "diagnostico clinico definitivo",
  "diagnostico psicologico",
  "trastorno",
  "patologia",
  "enfermedad mental",
  "cura garantizada",
  "tratamiento medico",
  "terapia obligatoria",
  "ranking keirsey campbell"
];

export const REPORT_RENDER_RULES = {
  page: {
    width: 595.28,
    height: 841.89
  },
  margins: {
    x: 42,
    top: 790,
    bottom: 58
  },
  chartSizes: {
    archetypes: { width: 500, height: 255 },
    shadow: { width: 360, height: 265 },
    keirsey: { width: 500, height: 200 },
    heroJourney: { width: 500, height: 150 },
    actionPlan: { width: 500, height: 205 }
  },
  body: {
    minBoxHeight: 160,
    fontSize: 10.4,
    lineGap: 4
  },
  questionBox: {
    height: 70
  },
  brand: {
    logoSize: 34,
    headerLogoSize: 22
  }
} as const;

const keirseyProfiles = [
  {
    label: "Racional / Estratega (NT)",
    code: "NT",
    normalized: "Estratega racional",
    stressResponse: "Busca control logico, eficiencia y arquitectura del problema."
  },
  {
    label: "Guardian / Logistico (SJ)",
    code: "SJ",
    normalized: "Guardian logistico",
    stressResponse: "Busca continuidad, reglas claras y reduccion de riesgo."
  },
  {
    label: "Idealista / Diplomatico (NF)",
    code: "NF",
    normalized: "Idealista diplomatico",
    stressResponse: "Busca coherencia interna, sentido humano y cuidado del vinculo."
  }
] as const;

const heroJourneyStages = [
  "La Llamada a la Aventura",
  "El Cruce del Umbral",
  "La Prueba Suprema",
  "El Retorno con el Elixir",
  "Maestro de Dos Mundos"
] as const;

function normalizeForValidation(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateDominantArchetypes(ranking: ArchetypeScore[], count = 3): ArchetypeScore[] {
  return [...ranking].sort((left, right) => right.score - left.score).slice(0, count);
}

export function calculateRepressedArchetypes(ranking: ArchetypeScore[], count = 3): ArchetypeScore[] {
  return [...ranking].sort((left, right) => left.score - right.score).slice(0, count);
}

export function normalizeShadow(values: {
  persona: number;
  shadowBase: number;
  shadowTotal: number;
}) {
  const persona = clamp(values.persona, 0, 5);
  const shadowBase = clamp(values.shadowBase, 0, 5);
  const shadowTotal = clamp(values.shadowTotal, 0, 5);
  const repressionGap = Number(Math.max(0, persona - shadowTotal).toFixed(1));
  const load = shadowTotal >= 4.1 ? "muy alta" : shadowTotal >= 3.5 ? "alta" : shadowTotal >= 2.5 ? "media" : "contenida";

  return {
    persona,
    shadowBase,
    shadowTotal,
    repressionGap,
    load,
    integrationIndex: Number((5 - Math.abs(persona - shadowTotal)).toFixed(1))
  };
}

export function normalizeKeirsey(label: string) {
  return keirseyProfiles.find((profile) => profile.label === label) ?? {
    label,
    code: "MIX",
    normalized: "Perfil mixto",
    stressResponse: "Combina criterio, estructura y sensibilidad segun el contexto."
  };
}

export function normalizeHeroJourney(stage: string) {
  const index = heroJourneyStages.findIndex((item) => item === stage);
  const safeIndex = index >= 0 ? index : 0;

  return {
    stage: heroJourneyStages[safeIndex],
    position: safeIndex + 1,
    total: heroJourneyStages.length,
    progress: Number(((safeIndex + 1) / heroJourneyStages.length).toFixed(2))
  };
}

export function countNarrativeWords(text: string): number {
  return normalizeForValidation(text).split(" ").filter(Boolean).length;
}

export function hasProhibitedNarrativePattern(text: string): boolean {
  const normalized = normalizeForValidation(text);
  return REPORT_PROHIBITED_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function sanitizeNarrativeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !hasProhibitedNarrativePattern(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isNarrativeBodyValid(section: ReportSectionRule, text: string): boolean {
  const cleaned = sanitizeNarrativeText(text);

  return cleaned.length > 0 &&
    countNarrativeWords(cleaned) >= section.minWords &&
    !hasProhibitedNarrativePattern(cleaned);
}

export function isIntroNarrativeValid(text: string): boolean {
  const cleaned = sanitizeNarrativeText(text);

  return cleaned.length > 0 &&
    countNarrativeWords(cleaned) >= REPORT_INTRO_RULE.minWords &&
    !hasProhibitedNarrativePattern(cleaned);
}

export function enforceActionStepCount(candidateSteps: string[], fallbackSteps: string[]): string[] {
  const cleanedCandidate = candidateSteps
    .map(sanitizeNarrativeText)
    .filter((step) => countNarrativeWords(step) >= 4 && !hasProhibitedNarrativePattern(step));
  const cleanedFallback = fallbackSteps
    .map(sanitizeNarrativeText)
    .filter(Boolean);
  const actionRule = REPORT_SECTIONS.find((section) => section.id === "pasos");
  const candidateSlice = cleanedCandidate.slice(0, REPORT_ACTION_STEP_COUNT);
  const candidateMeetsMinimum =
    candidateSlice.length === REPORT_ACTION_STEP_COUNT &&
    countNarrativeWords(candidateSlice.join(" ")) >= (actionRule?.minWords ?? 0);
  const source = candidateMeetsMinimum ? candidateSlice : cleanedFallback;

  return source.slice(0, REPORT_ACTION_STEP_COUNT);
}
