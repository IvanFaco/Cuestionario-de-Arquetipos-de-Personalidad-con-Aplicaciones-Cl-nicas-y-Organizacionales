import { getQuestionsRepository } from "./questions.repository.js";

const hookQuestions = [
  { id: "v1", prompt: "Siento una incomodidad casi f\u00edsica en el cuerpo cuando estoy en un entorno donde las reglas no est\u00e1n claras o nadie parece estar al mando de la situaci\u00f3n." },
  { id: "v2", prompt: "A menudo acumulo informaci\u00f3n, datos, art\u00edculos o libros que probablemente nunca use, solo por la tranquilidad mental de sentir que comprendo c\u00f3mo funcionan las cosas." },
  { id: "v3", prompt: "Con frecuencia me doy cuenta de que he ajustado mi propia agenda, mis opiniones o mi estado de \u00e1nimo simplemente para que alguien a mi alrededor no se sienta inc\u00f3modo o decepcionado." },
  { id: "v4", prompt: "La frase \"esto es lo que har\u00e1s por el resto de tu vida\" me genera much\u00edsimo m\u00e1s terror y ansiedad que la frase \"no tienes absolutamente nada seguro para el pr\u00f3ximo mes\"." },
  { id: "v5", prompt: "Con frecuencia experimento sincron\u00edas o corazonadas profundas que terminan resolviendo problemas complejos mucho mejor que cualquier plan l\u00f3gico que hubiera trazado." },
  { id: "v6", prompt: "Secretamente, siempre tengo un \"Plan B\" en mi cabeza para cuando las cosas salgan mal o las personas me fallen, porque s\u00e9 que el optimismo ciego suele ser peligroso." },
  { id: "v7", prompt: "Me frustra profundamente consumir el trabajo de los dem\u00e1s si siento que yo no estoy dedicando tiempo a construir o dise\u00f1ar algo propio." },
  { id: "v8", prompt: "Cuando alguien cercano me cuenta un problema grave, mi cerebro autom\u00e1ticamente empieza a dise\u00f1ar una lista de soluciones pr\u00e1cticas en lugar de solo ofrecer un hombro para llorar." },
  { id: "v9", prompt: "La versi\u00f3n de m\u00ed que conocen mis colegas de trabajo o mis conocidos se sorprender\u00eda much\u00edsimo si viera c\u00f3mo me comporto y lo que pienso cuando estoy completamente solo." },
  { id: "v10", prompt: "Hay momentos en los que observo a alguien cometer un error tonto y, aunque por fuera ofrezco mi ayuda o guardo silencio, por dentro siento una fugaz e inexplicable satisfacci\u00f3n o un juicio implacable." }
].map((q, i) => ({ ...q, type: "hook" as const, sort_order: i + 1 }));

const premiumQuestions = [
  { id: "p1", prompt: "Me castigo en silencio cuando cometo un error." },
  { id: "p2", prompt: "Siento una rabia irracional hacia quienes viven sin reglas." },
  { id: "p3", prompt: "Sacrifico mis deseos por temor a perder respeto." },
  { id: "p4", prompt: "Temo que si mostrara mi verdadera cara, la gente se alejar\u00eda." },
  { id: "p5", prompt: "Tengo fantas\u00edas de abandonar mis responsabilidades." },
  { id: "p6", prompt: "Priorizo la armon\u00eda emocional sobre la l\u00f3gica fr\u00eda." },
  { id: "p7", prompt: "Me siento seguro con un plan estructurado; odio improvisar." },
  { id: "p8", prompt: "Prefiero discutir futuros posibles que detalles concretos." },
  { id: "p9", prompt: "Cuestiono la autoridad si eso mejora la eficiencia." },
  { id: "p10", prompt: "El deber y preservar las instituciones es lo principal." },
  { id: "p11", prompt: "Siento que algo me llama a un cambio radical." },
  { id: "p12", prompt: "Siento que mi antigua identidad se desmorona." },
  { id: "p13", prompt: "He superado una crisis y quiero compartir mi aprendizaje." },
  { id: "p14", prompt: "Luchan por devolverme a mi antigua zona de confort." },
  { id: "p15", prompt: "He integrado mis partes oscuras y siento paz." }
].map((q, i) => ({ ...q, type: "premium" as const, sort_order: i + 1 }));

export function seedQuestions(): void {
  const repo = getQuestionsRepository();
  repo.seed([...hookQuestions, ...premiumQuestions]);
}
