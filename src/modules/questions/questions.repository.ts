import { getDatabaseClient } from "../../shared/database/database.factory.js";

export interface Question {
  id: string;
  type: "hook" | "premium";
  prompt: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateQuestionInput {
  id: string;
  type: "hook" | "premium";
  prompt: string;
  sort_order: number;
}

export class QuestionsRepository {
  private db = getDatabaseClient();

  findAllByType(type: "hook" | "premium"): Question[] {
    return this.db
      .prepare("SELECT * FROM questions WHERE type = ? ORDER BY sort_order ASC")
      .all(type) as Question[];
  }

  findById(id: string): Question | undefined {
    return this.db.prepare(
      "SELECT * FROM questions WHERE id = ?"
    ).get(id) as Question | undefined;
  }

  create(input: CreateQuestionInput): Question {
    const now = new Date().toISOString();
    this.db.prepare(
      `INSERT INTO questions (id, type, prompt, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(input.id, input.type, input.prompt, input.sort_order, now, now);
    return this.findById(input.id)!;
  }

  update(input: CreateQuestionInput): Question {
    const now = new Date().toISOString();
    this.db.prepare(
      `UPDATE questions
       SET type = ?, prompt = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`
    ).run(input.type, input.prompt, input.sort_order, now, input.id);
    return this.findById(input.id)!;
  }

  seed(input: CreateQuestionInput[]): void {
    for (const q of input) {
      const existing = this.findById(q.id);
      if (!existing) {
        this.create(q);
        continue;
      }

      if (
        existing.type !== q.type ||
        existing.prompt !== q.prompt ||
        existing.sort_order !== q.sort_order
      ) {
        this.update(q);
      }
    }
  }

  seedQuestions(): void {
    const hookQuestions = [
      { id: "v1", prompt: "Siento una incomodidad casi f\u00edsica en el cuerpo cuando estoy en un entorno donde las reglas no est\u00e1n claras o nadie parece estar al mando de la situaci\u00f3n.", type: "hook" as const, sort_order: 1 },
      { id: "v2", prompt: "A menudo acumulo informaci\u00f3n, datos, art\u00edculos o libros que probablemente nunca use, solo por la tranquilidad mental de sentir que comprendo c\u00f3mo funcionan las cosas.", type: "hook" as const, sort_order: 2 },
      { id: "v3", prompt: "Con frecuencia me doy cuenta de que he ajustado mi propia agenda, mis opiniones o mi estado de \u00e1nimo simplemente para que alguien a mi alrededor no se sienta inc\u00f3modo o decepcionado.", type: "hook" as const, sort_order: 3 },
      { id: "v4", prompt: "La frase \"esto es lo que har\u00e1s por el resto de tu vida\" me genera much\u00edsimo m\u00e1s terror y ansiedad que la frase \"no tienes absolutamente nada seguro para el pr\u00f3ximo mes\".", type: "hook" as const, sort_order: 4 },
      { id: "v5", prompt: "Con frecuencia experimento sincron\u00edas o corazonadas profundas que terminan resolviendo problemas complejos mucho mejor que cualquier plan l\u00f3gico que hubiera trazado.", type: "hook" as const, sort_order: 5 },
      { id: "v6", prompt: "Secretamente, siempre tengo un \"Plan B\" en mi cabeza para cuando las cosas salgan mal o las personas me fallen, porque s\u00e9 que el optimismo ciego suele ser peligroso.", type: "hook" as const, sort_order: 6 },
      { id: "v7", prompt: "Me frustra profundamente consumir el trabajo de los dem\u00e1s si siento que yo no estoy dedicando tiempo a construir o dise\u00f1ar algo propio.", type: "hook" as const, sort_order: 7 },
      { id: "v8", prompt: "Cuando alguien cercano me cuenta un problema grave, mi cerebro autom\u00e1ticamente empieza a dise\u00f1ar una lista de soluciones pr\u00e1cticas en lugar de solo ofrecer un hombro para llorar.", type: "hook" as const, sort_order: 8 },
      { id: "v9", prompt: "La versi\u00f3n de m\u00ed que conocen mis colegas de trabajo o mis conocidos se sorprender\u00eda much\u00edsimo si viera c\u00f3mo me comporto y lo que pienso cuando estoy completamente solo.", type: "hook" as const, sort_order: 9 },
      { id: "v10", prompt: "Hay momentos en los que observo a alguien cometer un error tonto y, aunque por fuera ofrezco mi ayuda o guardo silencio, por dentro siento una fugaz e inexplicable satisfacci\u00f3n o un juicio implacable.", type: "hook" as const, sort_order: 10 }
    ];
    const premiumQuestions = [
      { id: "p1", prompt: "Me castigo en silencio cuando cometo un error.", type: "premium" as const, sort_order: 1 },
      { id: "p2", prompt: "Siento una rabia irracional hacia quienes viven sin reglas.", type: "premium" as const, sort_order: 2 },
      { id: "p3", prompt: "Sacrifico mis deseos por temor a perder respeto.", type: "premium" as const, sort_order: 3 },
      { id: "p4", prompt: "Temo que si mostrara mi verdadera cara, la gente se alejar\u00eda.", type: "premium" as const, sort_order: 4 },
      { id: "p5", prompt: "Tengo fantas\u00edas de abandonar mis responsabilidades.", type: "premium" as const, sort_order: 5 },
      { id: "p6", prompt: "Priorizo la armon\u00eda emocional sobre la l\u00f3gica fr\u00eda.", type: "premium" as const, sort_order: 6 },
      { id: "p7", prompt: "Me siento seguro con un plan estructurado; odio improvisar.", type: "premium" as const, sort_order: 7 },
      { id: "p8", prompt: "Prefiero discutir futuros posibles que detalles concretos.", type: "premium" as const, sort_order: 8 },
      { id: "p9", prompt: "Cuestiono la autoridad si eso mejora la eficiencia.", type: "premium" as const, sort_order: 9 },
      { id: "p10", prompt: "El deber y preservar las instituciones es lo principal.", type: "premium" as const, sort_order: 10 },
      { id: "p11", prompt: "Siento que algo me llama a un cambio radical.", type: "premium" as const, sort_order: 11 },
      { id: "p12", prompt: "Siento que mi antigua identidad se desmorona.", type: "premium" as const, sort_order: 12 },
      { id: "p13", prompt: "He superado una crisis y quiero compartir mi aprendizaje.", type: "premium" as const, sort_order: 13 },
      { id: "p14", prompt: "Luchan por devolverme a mi antigua zona de confort.", type: "premium" as const, sort_order: 14 },
      { id: "p15", prompt: "He integrado mis partes oscuras y siento paz.", type: "premium" as const, sort_order: 15 }
    ];
    this.seed([...hookQuestions, ...premiumQuestions]);
  }
}

let repo: QuestionsRepository | undefined;

export function getQuestionsRepository(): QuestionsRepository {
  if (!repo) {
    repo = new QuestionsRepository();
  }
  return repo;
}
