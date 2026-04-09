import type {
  HookQuestionId,
  PremiumQuestionId,
  Question,
  QuestionOption
} from "./assessment.types.js";

export const likertOptions: QuestionOption[] = [
  { value: 1, emoji: "✖", label: "Para nada", short: "1", color: "#ef5b4c" },
  { value: 2, emoji: "👎", label: "No tanto", short: "2", color: "#f39a7f" },
  { value: 3, emoji: "😐", label: "Me da igual", short: "3", color: "#c6cbd5" },
  { value: 4, emoji: "👍", label: "Puede ser", short: "4", color: "#8fd98c" },
  { value: 5, emoji: "🔥", label: "Sí, soy yo", short: "5", color: "#3db54a" }
];

export const hookQuestions: Question<HookQuestionId>[] = [
  { id: "v1", prompt: "Siento una urgencia por tomar el control y organizar el caos a mi alrededor." },
  { id: "v2", prompt: "Prefiero una verdad dolorosa e incómoda antes que vivir una mentira feliz." },
  { id: "v3", prompt: "Siento que mi propósito es proteger, nutrir o sanar a los demás." },
  { id: "v4", prompt: "Me asfixia la rutina; necesito libertad constante para explorar." },
  { id: "v5", prompt: "Creo que la realidad se puede transformar si cambiamos nuestra mentalidad." },
  { id: "v6", prompt: "He aceptado que el mundo es duro, así que prefiero ser realista." },
  { id: "v7", prompt: "Necesito dejar un legado tangible, algo que yo haya creado." },
  { id: "v8", prompt: "En la vida, la lógica y los datos son mejores guías que las emociones." },
  { id: "v9", prompt: "Invierto mucha energía en que mi imagen pública sea impecable." },
  { id: "v10", prompt: "A veces tengo impulsos que me asustan o contradicen mi moral." }
];

export const premiumQuestions: Question<PremiumQuestionId>[] = [
  { id: "p1", prompt: "Me castigo en silencio cuando cometo un error." },
  { id: "p2", prompt: "Siento una rabia irracional hacia quienes viven sin reglas." },
  { id: "p3", prompt: "Sacrifico mis deseos por temor a perder respeto." },
  { id: "p4", prompt: "Temo que si mostrara mi verdadera cara, la gente se alejaría." },
  { id: "p5", prompt: "Tengo fantasías de abandonar mis responsabilidades." },
  { id: "p6", prompt: "Priorizo la armonía emocional sobre la lógica fría." },
  { id: "p7", prompt: "Me siento seguro con un plan estructurado; odio improvisar." },
  { id: "p8", prompt: "Prefiero discutir futuros posibles que detalles concretos." },
  { id: "p9", prompt: "Cuestiono la autoridad si eso mejora la eficiencia." },
  { id: "p10", prompt: "El deber y preservar las instituciones es lo principal." },
  { id: "p11", prompt: "Siento que algo me llama a un cambio radical." },
  { id: "p12", prompt: "Siento que mi antigua identidad se desmorona." },
  { id: "p13", prompt: "He superado una crisis y quiero compartir mi aprendizaje." },
  { id: "p14", prompt: "Luchan por devolverme a mi antigua zona de confort." },
  { id: "p15", prompt: "He integrado mis partes oscuras y siento paz." }
];
