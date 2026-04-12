import type {
  AgeRangeKey,
  ArchetypeScore,
  AssessmentOutcome,
  DemoInput,
  DemoProfile,
  EnergyProfileKey,
  HookAnswers,
  HookOutcome,
  PremiumAnswers,
  PremiumOutcome,
  SpiritualOrientationKey
} from "./assessment.types.js";

export function getAgeRangeLabel(ageRange: AgeRangeKey): string {
  switch (ageRange) {
    case "18_24":
      return "18 a 24 anos | Exploracion e identidad emergente";
    case "25_34":
      return "25 a 34 anos | Construccion y afirmacion del yo";
    case "35_49":
      return "35 a 49 anos | Transicion, revision y metanoia";
    case "50_plus":
      return "50 anos o mas | Integracion y sabiduria";
    default:
      return "25 a 34 anos | Construccion y afirmacion del yo";
  }
}

export function getSpiritualOrientationLabel(
  orientation?: SpiritualOrientationKey
): string | undefined {
  switch (orientation) {
    case "secular":
      return "Secular / no creyente";
    case "agnostic":
      return "Agnostico/a";
    case "spiritual_non_religious":
      return "Espiritual pero no religioso/a";
    case "believer_non_practicing":
      return "Creyente no practicante";
    case "religious_practicing":
      return "Religioso/a practicante";
    case "naturalist":
      return "Naturalista";
    case "buddhist":
      return "Budista";
    case "exploring":
      return "En busqueda";
    case "other":
      return "Otra";
    case "prefer_not_to_say":
      return "Prefiere no decirlo";
    default:
      return undefined;
  }
}

export function getEnergyProfileLabel(energyProfile: EnergyProfileKey): string {
  switch (energyProfile) {
    case "ecto":
      return "Energia ligera, sensible y mas mental";
    case "meso":
      return "Energia activa, firme y orientada a la accion";
    case "endo":
      return "Energia estable, receptiva y de ritmo pausado";
    case "mixed":
      return "Energia mixta o cambiante segun el contexto";
    default:
      return "Energia mixta o cambiante segun el contexto";
  }
}

export function getSomaticLensLabel(energyProfile: EnergyProfileKey): string {
  switch (energyProfile) {
    case "ecto":
      return "Lectura somatica cercana al eje ectomorfico";
    case "meso":
      return "Lectura somatica cercana al eje mesomorfico";
    case "endo":
      return "Lectura somatica cercana al eje endomorfico";
    case "mixed":
      return "Lectura somatica mixta";
    default:
      return "Lectura somatica mixta";
  }
}

export function buildDemoProfile(input: DemoInput): DemoProfile {
  return {
    ...input,
    rango_edad_label: getAgeRangeLabel(input.rango_edad),
    orientacion_espiritual_label: getSpiritualOrientationLabel(input.orientacion_espiritual),
    energia_base_label: getEnergyProfileLabel(input.energia_base),
    energia_somatica_label: getSomaticLensLabel(input.energia_base)
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
