import type {
  ArchetypeScore,
  AssessmentOutcome,
  DemoInput,
  DemoProfile,
  HookAnswers,
  HookOutcome,
  PremiumAnswers,
  PremiumOutcome
} from "./assessment.types.js";

export function getAgeRange(age: number): string {
  if (age <= 34) {
    return "18 - 34 anos (Construccion del Ego)";
  }

  if (age <= 50) {
    return "35 - 50 anos (La Transicion / Metanoia)";
  }

  return "51+ anos (Integracion y Sabiduria)";
}

export function buildDemoProfile(input: DemoInput): DemoProfile {
  return {
    ...input,
    rango_edad: getAgeRange(input.edad_exacta)
  };
}

export function calculateHookScores(answers: HookAnswers): Record<string, number> {
  return {
    Gobernante: answers.v1 * 1.5,
    Sabio: answers.v2 * 1.5,
    Cuidador: answers.v3 * 1.5,
    Explorador: answers.v4 * 1.5,
    Mago: answers.v5 * 1.5,
    Huerfano: answers.v6 * 1.5,
    Creador: answers.v7 * 1.5,
    Guerrero: answers.v1 * 1.2,
    Buscador: answers.v2 * 1.2,
    Amante: answers.v3 * 1.2,
    Rebelde: answers.v4 * 1.2,
    Bufon: answers.v6 * 1.2
  };
}

export function getRanking(scores: Record<string, number>): ArchetypeScore[] {
  return Object.entries(scores)
    .sort((left, right) => right[1] - left[1])
    .map(([name, score]) => ({ name, score }));
}

export function buildHookOutcome(answers: HookAnswers): HookOutcome {
  const scores = calculateHookScores(answers);

  return {
    scores,
    ranking: getRanking(scores),
    estructuras: {
      Persona: answers.v9,
      Sombra_Base: answers.v10
    }
  };
}

export function buildPremiumOutcome(answers: PremiumAnswers): PremiumOutcome {
  const shadowScore = (answers.p1 + answers.p2 + answers.p3 + answers.p4 + answers.p5) / 5;
  const campbellStages = {
    "La Llamada a la Aventura": answers.p11,
    "La Prueba Suprema": answers.p12,
    "El Retorno con el Elixir": answers.p13,
    "El Cruce del Umbral": answers.p14,
    "Maestro de Dos Mundos": answers.p15
  };

  return {
    Sombra_Total: shadowScore,
    Keirsey:
      answers.p8 + answers.p9 > 7
        ? "Racional / Estratega (NT)"
        : answers.p7 + answers.p10 > 7
          ? "Guardian / Logistico (SJ)"
          : "Idealista / Diplomatico (NF)",
    Campbell: Object.entries(campbellStages).sort((left, right) => right[1] - left[1])[0][0]
  };
}

export function buildAssessmentOutcome(
  demoInput: DemoInput,
  hookAnswers: HookAnswers,
  premiumAnswers: PremiumAnswers
): AssessmentOutcome {
  return {
    demo: buildDemoProfile(demoInput),
    hook: buildHookOutcome(hookAnswers),
    premium: buildPremiumOutcome(premiumAnswers)
  };
}
