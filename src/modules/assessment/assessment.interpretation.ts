import type {
  ArchetypeScore,
  DemoProfile,
  HookOutcome,
  PremiumOutcome
} from "./assessment.types.js";

type ArchetypeNarrative = {
  displayName: string;
  imageSlug: string;
  motivation: string;
  strength: string;
  stress: string;
  nextStep: string;
  short: string;
};

type ClassificationNarrative = {
  summary: string;
  nextStep: string;
};

export type ResultInterpretation = {
  dominant: ArchetypeNarrative;
  triad: string;
  objectiveLens: string;
  quickSummary: string;
  shadow: {
    label: string;
    summary: string;
    nextStep: string;
  };
  keirsey?: ClassificationNarrative;
  campbell?: ClassificationNarrative;
  actionPlan: string[];
};

const archetypeNarratives: Record<string, ArchetypeNarrative> = {
  Gobernante: {
    displayName: "Gobernante",
    imageSlug: "gobernante",
    motivation: "Te mueve ordenar lo ambiguo, tomar responsabilidad y crear condiciones donde las cosas puedan sostenerse.",
    strength: "Tu potencia aparece cuando conviertes caos en prioridades, acuerdos y decisiones claras.",
    stress: "Bajo presion puedes confundir seguridad con control y cargar con mas de lo que realmente te corresponde.",
    nextStep: "Elige una sola decision pendiente, define el criterio minimo y delega una parte visible del proceso.",
    short: "Estructura, liderazgo y necesidad de claridad operativa."
  },
  Sabio: {
    displayName: "Sabio",
    imageSlug: "sabio",
    motivation: "Te mueve comprender la verdad detras de las cosas antes de actuar.",
    strength: "Tu potencia esta en mirar con distancia, detectar patrones y separar ruido de evidencia.",
    stress: "Bajo presion puedes refugiarte en mas analisis y demorar una decision que ya tiene suficiente informacion.",
    nextStep: "Convierte tu mejor hipotesis en una prueba pequena con fecha y criterio de aprendizaje.",
    short: "Analisis, criterio y busqueda de verdad practica."
  },
  Cuidador: {
    displayName: "Cuidador",
    imageSlug: "cuidador",
    motivation: "Te mueve proteger, sostener y reducir el dolor innecesario en tu entorno.",
    strength: "Tu potencia aparece cuando creas confianza, lees necesidades y vuelves habitable una situacion dificil.",
    stress: "Bajo presion puedes abandonar tus limites para conservar armonia o evitar decepcionar.",
    nextStep: "Nombra una necesidad propia antes de ofrecer ayuda y define que si puedes sostener sin resentimiento.",
    short: "Cuidado, empatia y capacidad de sostener vinculos."
  },
  Explorador: {
    displayName: "Explorador",
    imageSlug: "explorador",
    motivation: "Te mueve mantener abiertas las posibilidades y no quedar atrapado en una version demasiado estrecha de tu vida.",
    strength: "Tu potencia esta en probar caminos, leer oportunidades y recuperar aire cuando otros se resignan.",
    stress: "Bajo presion puedes escapar de la estructura justo cuando una parte de ti necesita continuidad.",
    nextStep: "Define una aventura pequena con borde claro: que vas a explorar, cuanto dura y que evidencia esperas obtener.",
    short: "Libertad, movimiento y aprendizaje por experiencia."
  },
  Mago: {
    displayName: "Mago",
    imageSlug: "mago",
    motivation: "Te mueve transformar sistemas, percepciones o etapas que parecen fijas.",
    strength: "Tu potencia aparece cuando conectas piezas dispersas y encuentras una palanca de cambio.",
    stress: "Bajo presion puedes prometer transformaciones demasiado grandes o frustrarte si el cambio no es inmediato.",
    nextStep: "Escoge una palanca concreta de transformacion y mide un cambio observable en los proximos siete dias.",
    short: "Transformacion, intuicion estrategica y lectura de posibilidades."
  },
  Huerfano: {
    displayName: "Huerfano",
    imageSlug: "huerfano",
    motivation: "Te mueve sentir pertenencia real sin perder lucidez sobre lo que puede fallar.",
    strength: "Tu potencia esta en anticipar riesgos, aterrizar expectativas y sostener resiliencia.",
    stress: "Bajo presion puedes leer amenaza donde hay incertidumbre y cerrar el vinculo antes de pedir apoyo.",
    nextStep: "Distingue riesgo real de memoria emocional: escribe que sabes, que supones y que necesitas confirmar.",
    short: "Realismo, supervivencia emocional y busqueda de pertenencia confiable."
  },
  Creador: {
    displayName: "Creador",
    imageSlug: "creador",
    motivation: "Te mueve dar forma propia a una idea, una obra o una solucion que no existia.",
    strength: "Tu potencia aparece cuando conviertes sensibilidad, vision y tecnica en algo tangible.",
    stress: "Bajo presion puedes exigirte originalidad perfecta y bloquear el avance por miedo a producir algo incompleto.",
    nextStep: "Haz una version visible, aunque sea imperfecta, y decide que mejorar despues de verla fuera de tu cabeza.",
    short: "Expresion, legado y construccion de algo propio."
  },
  Guerrero: {
    displayName: "Guerrero",
    imageSlug: "guerrero",
    motivation: "Te mueve avanzar, proteger una causa y demostrar fortaleza cuando algo importa.",
    strength: "Tu potencia esta en sostener disciplina, cortar excusas y defender limites con energia.",
    stress: "Bajo presion puedes convertir todo en batalla y perder informacion emocional util.",
    nextStep: "Antes de empujar mas fuerte, define que vale la pena defender y que solo esta activando orgullo.",
    short: "Coraje, accion y disciplina frente a la friccion."
  },
  Buscador: {
    displayName: "Buscador",
    imageSlug: "buscador",
    motivation: "Te mueve encontrar una verdad propia, no solo heredar respuestas ajenas.",
    strength: "Tu potencia aparece cuando haces preguntas honestas y conectas experiencia con sentido.",
    stress: "Bajo presion puedes vivir buscando senales y postergar el compromiso con un camino concreto.",
    nextStep: "Elige una pregunta central y conviertela en una accion verificable, no en otra ronda de duda.",
    short: "Sentido, autenticidad y exploracion interior."
  },
  Amante: {
    displayName: "Amante",
    imageSlug: "amante",
    motivation: "Te mueve la conexion viva: belleza, cercania, intensidad y reciprocidad.",
    strength: "Tu potencia esta en humanizar espacios, leer matices y crear presencia emocional.",
    stress: "Bajo presion puedes negociar demasiado tu centro para no perder conexion.",
    nextStep: "Separa deseo de dependencia: pide algo concreto sin abandonar tu dignidad si la respuesta tarda.",
    short: "Conexion, sensibilidad y busqueda de reciprocidad."
  },
  Rebelde: {
    displayName: "Rebelde",
    imageSlug: "rebelde",
    motivation: "Te mueve romper reglas que ya no sirven y abrir espacio para algo mas honesto.",
    strength: "Tu potencia aparece cuando detectas estructuras caducas y tienes valor para cuestionarlas.",
    stress: "Bajo presion puedes reaccionar contra cualquier limite, incluso los que te protegen.",
    nextStep: "Define que quieres cambiar, que quieres conservar y cual es el costo real de tu ruptura.",
    short: "Cambio, inconformidad y energia de ruptura consciente."
  },
  Bufon: {
    displayName: "Bufon",
    imageSlug: "bufon",
    motivation: "Te mueve recuperar ligereza, decir lo que otros evitan y no dejar que la vida se vuelva demasiado rigida.",
    strength: "Tu potencia esta en bajar defensas, revelar verdades con humor y devolver perspectiva.",
    stress: "Bajo presion puedes usar ironia para no mostrar necesidad, tristeza o miedo.",
    nextStep: "Usa tu humor como puerta, no como muro: di una verdad importante sin disfrazarla por completo.",
    short: "Ligereza, irreverencia y verdad expresada sin solemnidad."
  }
};

const keirseyNarratives: Record<string, ClassificationNarrative> = {
  "Racional / Estratega (NT)": {
    summary: "Tu toma de decisiones tiende a buscar logica, arquitectura del problema y eficiencia del sistema.",
    nextStep: "Cuando haya presion, define primero el problema correcto y despues el criterio de exito."
  },
  "Guardian / Logistico (SJ)": {
    summary: "Tu toma de decisiones tiende a valorar continuidad, orden, responsabilidad y riesgo controlado.",
    nextStep: "Cuando haya presion, distingue entre estructura necesaria y rutina que solo da sensacion de seguridad."
  },
  "Idealista / Diplomatico (NF)": {
    summary: "Tu toma de decisiones tiende a pasar por valores, impacto humano y coherencia interna.",
    nextStep: "Cuando haya presion, aterriza el valor que quieres cuidar en una accion observable."
  }
};

const campbellNarratives: Record<string, ClassificationNarrative> = {
  "La Llamada a la Aventura": {
    summary: "Algo en ti ya percibe que la etapa actual pide movimiento, aunque todavia no este todo claro.",
    nextStep: "Escucha la senal, pero conviertela en un primer paso pequeno y reversible."
  },
  "La Prueba Suprema": {
    summary: "Estas en una zona de tension donde la identidad anterior ya no alcanza y la nueva aun exige coraje.",
    nextStep: "No intentes resolver toda la etapa; identifica la prueba central que hoy requiere presencia."
  },
  "El Retorno con el Elixir": {
    summary: "Hay aprendizaje acumulado que ya puede convertirse en servicio, criterio o nueva forma de liderar.",
    nextStep: "Comparte una leccion concreta antes de sentir que todo esta perfectamente cerrado."
  },
  "El Cruce del Umbral": {
    summary: "Una parte de ti esta saliendo de la zona conocida y otra intenta llevarte de vuelta a lo familiar.",
    nextStep: "Protege el umbral: reduce ruido externo y decide que compromiso marca el cambio de etapa."
  },
  "Maestro de Dos Mundos": {
    summary: "Tu lectura sugiere mayor integracion: puedes moverte entre exigencia externa y mundo interno con mas paz.",
    nextStep: "Usa esa integracion para simplificar, ensenar o acompanar a otros sin perder tu centro."
  }
};

export function formatArchetypeName(name: string): string {
  return getArchetypeNarrative(name).displayName;
}

export function getArchetypeNarrative(name: string): ArchetypeNarrative {
  return archetypeNarratives[name] ?? {
    displayName: name,
    imageSlug: name.toLowerCase(),
    motivation: "Te mueve actuar desde una energia dominante que hoy organiza buena parte de tus decisiones.",
    strength: "Tu potencia aparece cuando usas esa energia con conciencia y flexibilidad.",
    stress: "Bajo presion esa misma energia puede rigidizarse y volverse menos util.",
    nextStep: "Observa cuando esta energia te abre opciones y cuando empieza a reducirlas.",
    short: "Energia dominante en proceso de lectura."
  };
}

export function getShadowNarrative(shadowTotal: number) {
  if (shadowTotal >= 4.1) {
    return {
      label: "Sombra muy activa",
      summary: "La lectura sugiere alta carga interna: autocritica, rabia retenida o deseos que han quedado demasiado comprimidos.",
      nextStep: "Antes de exigirte mas rendimiento, baja la represion: nombra lo que te cuesta admitir y busca una forma segura de tramitarlo."
    };
  }

  if (shadowTotal >= 3.5) {
    return {
      label: "Sombra activa",
      summary: "Hay impulsos o tensiones que probablemente aparecen bajo estres y pueden sabotear decisiones importantes si se niegan.",
      nextStep: "Integra vulnerabilidad antes de llegar al agotamiento: identifica que emocion estas intentando controlar."
    };
  }

  if (shadowTotal >= 2.5) {
    return {
      label: "Sombra en rango medio",
      summary: "Tu relacion con impulsos incomodos parece manejable, aunque todavia hay patrones que conviene observar en situaciones de presion.",
      nextStep: "Cuando reacciones con juicio o retirada, preguntate que necesidad legitima esta intentando hablar."
    };
  }

  return {
    label: "Sombra contenida",
    summary: "La lectura sugiere una relacion relativamente disponible con tus impulsos y una buena base para trabajar autenticidad.",
    nextStep: "No uses este resultado para negar conflicto: manten curiosidad por lo que evitas mostrar cuando quieres agradar."
  };
}

export function getKeirseyNarrative(label: string): ClassificationNarrative {
  return keirseyNarratives[label] ?? {
    summary: "Tu estilo de decision muestra una mezcla de criterio, sensibilidad y estructura.",
    nextStep: "Cuando haya presion, separa datos, emociones y compromisos antes de elegir."
  };
}

export function getCampbellNarrative(label: string): ClassificationNarrative {
  return campbellNarratives[label] ?? {
    summary: "Tu etapa vital actual sugiere movimiento y necesidad de lectura consciente del momento.",
    nextStep: "Define el siguiente paso pequeno que confirme direccion sin forzar certezas absolutas."
  };
}

export function buildResultInterpretation(input: {
  demo: DemoProfile;
  hook: HookOutcome;
  premium?: PremiumOutcome;
}): ResultInterpretation {
  const ranking = input.hook.ranking;
  const dominant = getArchetypeNarrative(ranking[0].name);
  const triad = ranking.slice(0, 3).map((item) => formatArchetypeName(item.name)).join(", ");
  const persona = input.hook.estructuras.Persona;
  const shadowBase = input.hook.estructuras.Sombra_Base;
  const shadowTotal = input.premium?.Sombra_Total ?? shadowBase;
  const shadow = getShadowNarrative(shadowTotal);
  const objectiveLens = `Tu objetivo declarado fue: ${input.demo.objetivo_label}. Usa esta lectura como filtro para decidir que ajustar primero.`;
  const quickSummary =
    `${input.demo.nombre}, tu resultado se organiza desde ${dominant.displayName}: ${dominant.short} ` +
    `La triada visible (${triad}) muestra que tu energia principal no aparece sola; se combina con recursos que matizan como decides, te vinculas y respondes bajo presion.`;
  const actionPlan = [
    dominant.nextStep,
    persona >= 4
      ? "Revisa donde tu imagen publica esta exigiendo demasiado esfuerzo privado."
      : "Usa la flexibilidad de tu imagen publica para pedir ayuda o mostrar mas contexto.",
    shadow.nextStep,
    input.premium
      ? getCampbellNarrative(input.premium.Campbell).nextStep
      : "Completa la calibracion profunda para distinguir mejor entre impulso visible, sombra y direccion vital."
  ];

  return {
    dominant,
    triad,
    objectiveLens,
    quickSummary,
    shadow,
    keirsey: input.premium ? getKeirseyNarrative(input.premium.Keirsey) : undefined,
    campbell: input.premium ? getCampbellNarrative(input.premium.Campbell) : undefined,
    actionPlan
  };
}

export function mapScoresForDisplay(scores: ArchetypeScore[]) {
  return scores.map((item) => ({
    ...item,
    displayName: formatArchetypeName(item.name),
    imageSlug: getArchetypeNarrative(item.name).imageSlug
  }));
}
