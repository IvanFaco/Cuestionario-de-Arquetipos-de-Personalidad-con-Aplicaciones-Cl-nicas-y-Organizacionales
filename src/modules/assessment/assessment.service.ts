export type MigrationPhase = {
  id: string;
  title: string;
  status: "done" | "next";
  summary: string;
};

export type LandingViewModel = {
  title: string;
  eyebrow: string;
  headline: string;
  description: string;
  phases: MigrationPhase[];
};

export type PhaseZeroViewModel = {
  title: string;
  summary: string;
  deliverables: string[];
  exitCriteria: string[];
};

export function getLandingViewModel(): LandingViewModel {
  return {
    title: "MiRealYo | Migracion Controlada",
    eyebrow: "Migracion de Stack",
    headline: "Baseline congelado. Reemplazo controlado en marcha.",
    description:
      "Este scaffold no reemplaza todavia la app Python. Define la estructura base de Express, EJS y TypeScript para migrar por fases con equivalencia funcional.",
    phases: [
      {
        id: "fase-0",
        title: "Congelacion funcional",
        status: "done",
        summary: "Baseline, fixtures de equivalencia y estructura inicial del nuevo stack."
      },
      {
        id: "fase-1",
        title: "Extraccion de dominio",
        status: "next",
        summary: "Mover preguntas, scoring y reglas a servicios y contratos testeables."
      },
      {
        id: "fase-2",
        title: "Paridad del funnel SSR",
        status: "next",
        summary: "Recrear landing, quizzes, teaser y dashboard con sesion server-side."
      }
    ]
  };
}

export function getPhaseZeroViewModel(): PhaseZeroViewModel {
  return {
    title: "MiRealYo | Fase 0",
    summary:
      "La Fase 0 congela el comportamiento actual, versiona fixtures de equivalencia y deja listo el punto de partida del stack recomendado en AGENTS.md.",
    deliverables: [
      "Baseline funcional documentado del funnel actual",
      "Casos de equivalencia con entradas y salidas esperadas",
      "Scaffold inicial en Express, TypeScript y EJS",
      "Criterios de salida para fases posteriores"
    ],
    exitCriteria: [
      "Build de TypeScript en verde",
      "Servidor Express levantando y respondiendo healthcheck",
      "Documentacion versionada dentro del repo",
      "Sin reemplazar todavia el runtime Python de produccion"
    ]
  };
}
