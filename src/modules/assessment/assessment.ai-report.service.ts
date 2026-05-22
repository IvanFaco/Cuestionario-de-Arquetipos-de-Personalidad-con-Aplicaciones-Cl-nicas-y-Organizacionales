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
    "El informe debe ser claro, calido, directo y accionable.",
    "Debe convertir puntajes en lenguaje humano con estas secciones minimas: que te mueve, que te potencia, que te sabotea bajo estres y que hacer ahora.",
    "Debe sentirse como diagnostico interpretativo premium, no como una lista de etiquetas.",
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
    `Informe interpretativo para ${input.demo.nombre}`,
    "",
    "Lectura central",
    interpretation.quickSummary,
    "",
    "Que te mueve",
    interpretation.dominant.motivation,
    "",
    "Que te potencia",
    interpretation.dominant.strength,
    "",
    "Que te sabotea bajo estres",
    `${interpretation.dominant.stress} ${interpretation.shadow.summary}`,
    "",
    "Mapa de puntajes",
    `Tu triada principal es ${topThree}. Persona marca ${input.hook.estructuras.Persona.toFixed(1)}/5, Sombra base ${input.hook.estructuras.Sombra_Base.toFixed(1)}/5 y Sombra total ${input.premium.Sombra_Total.toFixed(1)}/5.`,
    "",
    "Temperamento y etapa",
    `Keirsey: ${input.premium.Keirsey}. ${interpretation.keirsey?.summary ?? ""}`,
    `Campbell: ${input.premium.Campbell}. ${interpretation.campbell?.summary ?? ""}`,
    "",
    "Que hacer ahora",
    ...interpretation.actionPlan.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Nota de uso",
    "Esta lectura es interpretativa y educativa. Sirve como espejo de patrones, no como diagnostico clinico ni sustituto de acompanamiento profesional."
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? env.aiReport.timeoutMs);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        userMessage: buildAiReportUserMessage(input)
      }),
      signal: controller.signal
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
    clearTimeout(timeout);
  }
}
