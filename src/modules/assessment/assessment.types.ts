export type LikertValue = 1 | 2 | 3 | 4 | 5;

export type HookQuestionId =
  | "v1"
  | "v2"
  | "v3"
  | "v4"
  | "v5"
  | "v6"
  | "v7"
  | "v8"
  | "v9"
  | "v10";

export type PremiumQuestionId =
  | "p1"
  | "p2"
  | "p3"
  | "p4"
  | "p5"
  | "p6"
  | "p7"
  | "p8"
  | "p9"
  | "p10"
  | "p11"
  | "p12"
  | "p13"
  | "p14"
  | "p15";

export type QuestionOption = {
  value: LikertValue;
  emoji: string;
  label: string;
  short: string;
  color: string;
};

export type Question<TQuestionId extends string> = {
  id: TQuestionId;
  prompt: string;
};

export type DemoInput = {
  genero: "Hombre" | "Mujer" | "Otro";
  edad_exacta: number;
};

export type DemoProfile = DemoInput & {
  rango_edad: string;
};

export type HookAnswers = Record<HookQuestionId, LikertValue>;
export type PartialHookAnswers = Partial<HookAnswers>;

export type PremiumAnswers = Record<PremiumQuestionId, LikertValue>;
export type PartialPremiumAnswers = Partial<PremiumAnswers>;

export type ArchetypeScore = {
  name: string;
  score: number;
};

export type HookOutcome = {
  scores: Record<string, number>;
  ranking: ArchetypeScore[];
  estructuras: {
    Persona: number;
    Sombra_Base: number;
  };
};

export type PremiumOutcome = {
  Sombra_Total: number;
  Keirsey: string;
  Campbell: string;
};

export type AssessmentOutcome = {
  demo: DemoProfile;
  hook: HookOutcome;
  premium: PremiumOutcome;
};
