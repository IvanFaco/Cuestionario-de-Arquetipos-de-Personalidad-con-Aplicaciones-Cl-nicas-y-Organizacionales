import { env } from "../../config/env.js";
import { buildResultInterpretation, mapScoresForDisplay } from "./assessment.interpretation.js";
import {
  REPORT_ACTION_STEP_COUNT,
  REPORT_INTRO_TITLE,
  REPORT_SECTIONS,
  REPORT_TITLE,
  calculateDominantArchetypes,
  calculateRepressedArchetypes,
  enforceActionStepCount,
  hasProhibitedNarrativePattern,
  normalizeHeroJourney,
  normalizeKeirsey,
  normalizeShadow
} from "./assessment.report-contract.js";
import type { DemoProfile, HookOutcome, PremiumOutcome } from "./assessment.types.js";

type ReportInput = {
  demo: DemoProfile;
  hook: HookOutcome;
  premium: PremiumOutcome;
};

type AiReportResult = {
  text: string;
  source: "webhook" | "fallback";
  error?: string;
};

type FetchLike = typeof fetch;

function buildReportPayload(input: ReportInput) {
  const interpretation = buildResultInterpretation(input);
  const dominantArchetypes = mapScoresForDisplay(calculateDominantArchetypes(input.hook.ranking)).map((item) => ({
    name: item.displayName,
    score: Number(item.score.toFixed(1))
  }));
  const repressedArchetypes = mapScoresForDisplay(calculateRepressedArchetypes(input.hook.ranking)).map((item) => ({
    name: item.displayName,
    score: Number(item.score.toFixed(1))
  }));
  const normalizedShadow = normalizeShadow({
    persona: input.hook.estructuras.Persona,
    shadowBase: input.hook.estructuras.Sombra_Base,
    shadowTotal: input.premium.Sombra_Total
  });
  const normalizedKeirsey = normalizeKeirsey(input.premium.Keirsey);
  const normalizedHeroJourney = normalizeHeroJourney(input.premium.Campbell);
  const actionPlan = enforceActionStepCount(interpretation.actionPlan, interpretation.actionPlan);

  return {
    profile: {
      name: input.demo.nombre,
      objective: input.demo.objetivo,
      objectiveLabel: input.demo.objetivo_label
    },
    results: {
      dominantArchetype: interpretation.dominant.displayName,
      dominantArchetypes,
      repressedArchetypes,
      triad: interpretation.triad,
      archetypeRanking: mapScoresForDisplay(input.hook.ranking).map((item) => ({
        name: item.displayName,
        score: Number(item.score.toFixed(1))
      })),
      structures: {
        persona: input.hook.estructuras.Persona,
        shadowBase: input.hook.estructuras.Sombra_Base,
        shadowTotal: Number(input.premium.Sombra_Total.toFixed(1))
      },
      normalizedShadow,
      keirsey: input.premium.Keirsey,
      normalizedKeirsey,
      campbell: input.premium.Campbell,
      normalizedHeroJourney
    },
    interpretationSeed: {
      whatMovesYou: interpretation.dominant.motivation,
      whatStrengthensYou: interpretation.dominant.strength,
      stressSabotage: interpretation.dominant.stress,
      shadow: interpretation.shadow,
      keirsey: interpretation.keirsey,
      campbell: interpretation.campbell,
      actionPlan
    }
  };
}

export function buildAiReportUserMessage(input: ReportInput): string {
  const payload = buildReportPayload(input);
  const agentHeadings = [
    REPORT_INTRO_TITLE,
    "1. Apertura y Espejo (Radar de Ejes)",
    "Pregunta metacognitiva:",
    "2. Profundidad y Autosabotaje (Tu Sombra Oculta)",
    "Pregunta metacognitiva:",
    "3. El Sistema Operativo bajo Presion (Matriz Keirsey)",
    "Pregunta metacognitiva:",
    "4. El Horizonte Evolutivo (El Viaje del Heroe)",
    "Pregunta metacognitiva:",
    "5. Cierre y Plan de Accion (Siguientes Pasos)",
    "Pregunta guia:"
  ];
  const formatScoreList = (items: { name: string; score: number }[]) =>
    items.map((item) => `${item.name} (${item.score})`).join(", ");

  return [
    "Genera el informe premium descargable de MiRealYo a partir del resultado del test.",
    "El agente solo debe devolver prosa interpretativa. Devuelve solo texto crudo del informe, sin JSON.",
    "No generes graficas, imagenes, tablas ni instrucciones visuales: MiRealYo renderiza las graficas con los datos locales del test.",
    "Datos obligatorios para la narracion del agente:",
    `[NOMBRE_PERSONA]: ${payload.profile.name}`,
    `[ARQUETIPOS_DOMINANTES]: ${formatScoreList(payload.results.dominantArchetypes)}`,
    `[ARQUETIPOS_REPRIMIDOS]: ${formatScoreList(payload.results.repressedArchetypes)}`,
    `[NIVEL_DE_SOMBRA]: ${payload.results.normalizedShadow.load} (${payload.results.normalizedShadow.shadowTotal}/5)`,
    `[ESTILO_KEIRSEY]: ${payload.results.normalizedKeirsey.label}`,
    `[ETAPA_VIAJE_HEROE]: ${payload.results.normalizedHeroJourney.stage}`,
    "El informe debe seguir exactamente esta estructura narrativa y usar estos encabezados:",
    ...agentHeadings,
    "El informe debe ser claro, calido, directo, accionable y visualmente pensado para un PDF premium.",
    "Cada seccion narrativa debe tener entre 90 y 130 palabras.",
    `El plan tactico debe tener exactamente ${REPORT_ACTION_STEP_COUNT} pasos numerados, sin pasos extra.`,
    "Traduce los puntajes a narrativa vital; no entregues solo etiquetas.",
    "Evita promesas clinicas absolutas y aclara que es una lectura interpretativa y educativa.",
    "Resultado del test en JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

export function buildFallbackReportText(input: ReportInput): string {
  const interpretation = buildResultInterpretation(input);
  const ranking = mapScoresForDisplay(input.hook.ranking);
  const topThree = ranking.slice(0, 3).map((item) => `${item.displayName} (${item.score.toFixed(1)})`).join(", ");
  const actionPlan = enforceActionStepCount(interpretation.actionPlan, interpretation.actionPlan);

  return [
    REPORT_TITLE,
    "",
    REPORT_INTRO_TITLE,
    `${input.demo.nombre}, esta lectura integra tu mapa de arquetipos, estructura interna, respuesta bajo estres y etapa evolutiva actual. No busca encerrarte en una etiqueta: funciona como un espejo para reconocer fuerzas dominantes, tensiones ocultas y acciones concretas para avanzar con mas conciencia.`,
    "",
    `1. ${REPORT_SECTIONS[0].title}`,
    REPORT_SECTIONS[0].subtitle,
    `${interpretation.quickSummary} La triada principal (${topThree}) sugiere que tu energia vital se organiza alrededor de ${interpretation.dominant.displayName}: ${interpretation.dominant.motivation} En terminos practicos, esta fortaleza se expresa cuando conviertes tu energia dominante en decisiones, limites y acciones observables.`,
    `${REPORT_SECTIONS[0].questionLabel}: Que parte de esta triada estas usando como recurso y cual podria estar ocupando demasiado espacio en tus decisiones?`,
    "",
    `2. ${REPORT_SECTIONS[1].title}`,
    REPORT_SECTIONS[1].subtitle,
    `Persona marca ${input.hook.estructuras.Persona.toFixed(1)}/5, Sombra base ${input.hook.estructuras.Sombra_Base.toFixed(1)}/5 y Sombra total ${input.premium.Sombra_Total.toFixed(1)}/5. ${interpretation.shadow.summary} Bajo estres, el autosabotaje puede aparecer como exceso de control, retirada emocional, juicio interno o dificultad para pedir apoyo antes de llegar al limite.`,
    `${REPORT_SECTIONS[1].questionLabel}: Que emocion o necesidad estas intentando mantener fuera de escena para conservar una imagen de fortaleza?`,
    "",
    `3. ${REPORT_SECTIONS[2].title}`,
    `${input.premium.Keirsey}. ${interpretation.keirsey?.summary ?? ""} Esta matriz describe como tiendes a ordenar informacion y decidir cuando aumenta la presion. ${interpretation.keirsey?.nextStep ?? ""}`,
    `${REPORT_SECTIONS[2].questionLabel}: Bajo estres, que criterio usas primero: eficiencia, seguridad, armonia o coherencia interna?`,
    "",
    `4. ${REPORT_SECTIONS[3].title}`,
    `${input.premium.Campbell}. ${interpretation.campbell?.summary ?? ""} Esta etapa senala el tipo de umbral que estas atravesando: no solo que debes resolver, sino que version de ti necesita madurar para sostener el siguiente tramo.`,
    `${REPORT_SECTIONS[3].questionLabel}: Cual es la prueba real de esta etapa: actuar, soltar, pedir ayuda, sostener un limite o confiar en tu propio criterio?`,
    "",
    `5. ${REPORT_SECTIONS[4].title}`,
    ...actionPlan.map((item, index) => `${index + 1}. ${item}`),
    `${REPORT_SECTIONS[4].questionLabel}: Que accion pequena puedes ejecutar en las proximas 24 horas para que este informe deje de ser informacion y se vuelva movimiento?`
  ].join("\n");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido al consultar el webhook.";
}

function sanitizeAgentMessage(value: string): string {
  return value.replace(/\u0000/g, "").trim();
}

function unwrapMarkdownFence(value: string): string {
  const match = value.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : value.trim();
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractAgentMessageFromPayload(payload: unknown, depth = 0): string {
  if (depth > 5) {
    return "";
  }

  if (typeof payload === "string") {
    const sanitized = sanitizeAgentMessage(payload);

    if (!sanitized) {
      return "";
    }

    const unwrapped = unwrapMarkdownFence(sanitized);
    const parsed = parseJsonSafely(unwrapped);

    if (parsed !== null) {
      const nestedMessage = extractAgentMessageFromPayload(parsed, depth + 1);

      if (nestedMessage) {
        return nestedMessage;
      }

      if (/^\s*[\[{]/.test(unwrapped)) {
        return "";
      }
    }

    return unwrapped;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const message = extractAgentMessageFromPayload(item, depth + 1);

      if (message) {
        return message;
      }
    }

    return "";
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const directCandidate = record.agentMessage ?? record.output ?? record.text;

    if (directCandidate !== undefined) {
      const message = extractAgentMessageFromPayload(directCandidate, depth + 1);

      if (message) {
        return message;
      }
    }

    for (const key of ["body", "data", "json", "result"]) {
      const nestedCandidate = record[key];

      if (nestedCandidate !== undefined) {
        const message = extractAgentMessageFromPayload(nestedCandidate, depth + 1);

        if (message) {
          return message;
        }
      }
    }
  }

  return "";
}

function isAgentMessageValid(agentMessage: string): boolean {
  return Boolean(agentMessage.trim()) && !hasProhibitedNarrativePattern(agentMessage);
}

export async function requestAiReport(input: ReportInput, options: {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  webhookUrl?: string;
} = {}): Promise<AiReportResult> {
  const webhookUrl = options.webhookUrl ?? env.aiReport.webhookUrl;
  const fallbackText = buildFallbackReportText(input);

  if (!webhookUrl) {
    return {
      text: fallbackText,
      source: "fallback",
      error: "Webhook de informe IA no configurado."
    };
  }

  const timeoutMs = options.timeoutMs ?? env.aiReport.timeoutMs;
  const controller = timeoutMs > 0 ? new AbortController() : undefined;
  const fetchImpl = options.fetchImpl ?? fetch;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    if (controller) {
      timeout = setTimeout(() => controller.abort(), timeoutMs);
    }

    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        userMessage: buildAiReportUserMessage(input)
      }),
      signal: controller?.signal
    });

    if (!response.ok) {
      throw new Error(`Webhook respondio con estado ${response.status}.`);
    }

    const responseText = await response.text();
    const payload = parseJsonSafely(responseText) ?? responseText;
    const agentMessage = extractAgentMessageFromPayload(payload);

    if (!agentMessage) {
      throw new Error("Webhook no devolvio agentMessage valido.");
    }

    if (!isAgentMessageValid(agentMessage)) {
      throw new Error("Webhook devolvio una respuesta de validacion, no una narrativa valida.");
    }

    return {
      text: agentMessage,
      source: "webhook"
    };
  } catch (error) {
    return {
      text: fallbackText,
      source: "fallback",
      error: getErrorMessage(error)
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
