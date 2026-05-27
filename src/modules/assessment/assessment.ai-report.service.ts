import { env } from "../../config/env.js";
import { buildResultInterpretation, mapScoresForDisplay } from "./assessment.interpretation.js";
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

  return {
    profile: {
      name: input.demo.nombre,
      objective: input.demo.objetivo,
      objectiveLabel: input.demo.objetivo_label
    },
    results: {
      dominantArchetype: interpretation.dominant.displayName,
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
      keirsey: input.premium.Keirsey,
      campbell: input.premium.Campbell
    },
    interpretationSeed: {
      whatMovesYou: interpretation.dominant.motivation,
      whatStrengthensYou: interpretation.dominant.strength,
      stressSabotage: interpretation.dominant.stress,
      shadow: interpretation.shadow,
      keirsey: interpretation.keirsey,
      campbell: interpretation.campbell,
      actionPlan: interpretation.actionPlan
    }
  };
}

export function buildAiReportUserMessage(input: ReportInput): string {
  return [
    "Genera el informe premium descargable de MiRealYo a partir del resultado del test.",
    "Devuelve solo texto crudo del informe, sin JSON.",
    "El informe debe seguir exactamente esta estructura y usar estos encabezados:",
    "Titulo: INFORME AMPLIADO DE PERSONALIDAD",
    "Resumen Introduccion",
    "1. Tu Mapa Visual: La Fortaleza de la Triada",
    "Apertura y Espejo",
    "Pregunta metacognitiva:",
    "2. Tu Sombra Oculta",
    "Profundidad y Autosabotaje",
    "Pregunta metacognitiva:",
    "3. El Sistema Operativo: Matriz Keirsey",
    "Pregunta metacognitiva:",
    "4. El Horizonte Evolutivo: El Viaje del Heroe",
    "Pregunta metacognitiva:",
    "5. Siguientes Pasos: Plan de Accion Tactico",
    "Pregunta guia:",
    "El informe debe ser claro, calido, directo, accionable y visualmente pensado para un PDF premium.",
    "Cada seccion debe tener entre 90 y 130 palabras, excepto el plan tactico, que debe tener 4 acciones concretas.",
    "Traduce los puntajes a narrativa vital; no entregues solo etiquetas.",
    "Evita promesas clinicas absolutas y aclara que es una lectura interpretativa y educativa.",
    "Resultado del test en JSON:",
    JSON.stringify(buildReportPayload(input), null, 2)
  ].join("\n");
}

export function buildFallbackReportText(input: ReportInput): string {
  const interpretation = buildResultInterpretation(input);
  const ranking = mapScoresForDisplay(input.hook.ranking);
  const topThree = ranking.slice(0, 3).map((item) => `${item.displayName} (${item.score.toFixed(1)})`).join(", ");

  return [
    "INFORME AMPLIADO DE PERSONALIDAD",
    "",
    "Resumen Introduccion",
    `${input.demo.nombre}, esta lectura integra tu mapa de arquetipos, estructura interna, respuesta bajo estres y etapa evolutiva actual. No busca encerrarte en una etiqueta: funciona como un espejo para reconocer fuerzas dominantes, tensiones ocultas y acciones concretas para avanzar con mas conciencia.`,
    "",
    "1. Tu Mapa Visual: La Fortaleza de la Triada",
    "Apertura y Espejo",
    `${interpretation.quickSummary} La triada principal (${topThree}) sugiere que tu energia vital se organiza alrededor de ${interpretation.dominant.displayName}: ${interpretation.dominant.motivation} En terminos practicos, esta fortaleza se expresa cuando conviertes tu energia dominante en decisiones, limites y acciones observables.`,
    "Pregunta metacognitiva: Que parte de esta triada estas usando como recurso y cual podria estar ocupando demasiado espacio en tus decisiones?",
    "",
    "2. Tu Sombra Oculta",
    "Profundidad y Autosabotaje",
    `Persona marca ${input.hook.estructuras.Persona.toFixed(1)}/5, Sombra base ${input.hook.estructuras.Sombra_Base.toFixed(1)}/5 y Sombra total ${input.premium.Sombra_Total.toFixed(1)}/5. ${interpretation.shadow.summary} Bajo estres, el autosabotaje puede aparecer como exceso de control, retirada emocional, juicio interno o dificultad para pedir apoyo antes de llegar al limite.`,
    "Pregunta metacognitiva: Que emocion o necesidad estas intentando mantener fuera de escena para conservar una imagen de fortaleza?",
    "",
    "3. El Sistema Operativo: Matriz Keirsey",
    `${input.premium.Keirsey}. ${interpretation.keirsey?.summary ?? ""} Esta matriz describe como tiendes a ordenar informacion y decidir cuando aumenta la presion. ${interpretation.keirsey?.nextStep ?? ""}`,
    "Pregunta metacognitiva: Bajo estres, que criterio usas primero: eficiencia, seguridad, armonia o coherencia interna?",
    "",
    "4. El Horizonte Evolutivo: El Viaje del Heroe",
    `${input.premium.Campbell}. ${interpretation.campbell?.summary ?? ""} Esta etapa senala el tipo de umbral que estas atravesando: no solo que debes resolver, sino que version de ti necesita madurar para sostener el siguiente tramo.`,
    "Pregunta metacognitiva: Cual es la prueba real de esta etapa: actuar, soltar, pedir ayuda, sostener un limite o confiar en tu propio criterio?",
    "",
    "5. Siguientes Pasos: Plan de Accion Tactico",
    ...interpretation.actionPlan.map((item, index) => `${index + 1}. ${item}`),
    `Pregunta guia: Que accion pequena puedes ejecutar en las proximas 24 horas para que este informe deje de ser informacion y se vuelva movimiento?`
  ].join("\n");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido al consultar el webhook.";
}

function sanitizeAgentMessage(value: string): string {
  return value.replace(/\u0000/g, "").trim();
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

    const payload = await response.json() as { agentMessage?: unknown };
    const agentMessage = typeof payload.agentMessage === "string" ? sanitizeAgentMessage(payload.agentMessage) : "";

    if (!agentMessage) {
      throw new Error("Webhook no devolvio agentMessage valido.");
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
