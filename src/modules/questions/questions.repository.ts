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

  seed(input: CreateQuestionInput[]): void {
    for (const q of input) {
      const existing = this.findById(q.id);
      if (!existing) {
        this.create(q);
      }
    }
  }

  seedQuestions(): void {
    const hookQuestions = [
      { id: "v1", prompt: "Siento una urgencia por tomar el control y organizar el caos a mi alrededor.", type: "hook" as const, sort_order: 1 },
      { id: "v2", prompt: "Prefiero una verdad dolorosa e incómoda antes que vivir una mentira feliz.", type: "hook" as const, sort_order: 2 },
      { id: "v3", prompt: "Siento que mi propósito es proteger, nutrir o sanar a los demás.", type: "hook" as const, sort_order: 3 },
      { id: "v4", prompt: "Me asfixia la rutina; necesito libertad constante para explorar.", type: "hook" as const, sort_order: 4 },
      { id: "v5", prompt: "Creo que la realidad se puede transformar si cambiamos nuestra mentalidad.", type: "hook" as const, sort_order: 5 },
      { id: "v6", prompt: "He aceptado que el mundo es duro, así que prefiero ser realista.", type: "hook" as const, sort_order: 6 },
      { id: "v7", prompt: "Necesito dejar un legado tangible, algo que yo haya creado.", type: "hook" as const, sort_order: 7 },
      { id: "v8", prompt: "En la vida, la lógica y los datos son mejores guías que las emociones.", type: "hook" as const, sort_order: 8 },
      { id: "v9", prompt: "Invierto mucha energía en que mi imagen pública sea impecable.", type: "hook" as const, sort_order: 9 },
      { id: "v10", prompt: "A veces tengo impulsos que me asustan o contradicen mi moral.", type: "hook" as const, sort_order: 10 }
    ];
    const premiumQuestions = [
      { id: "p1", prompt: "Me castigo en silencio cuando cometo un error.", type: "premium" as const, sort_order: 1 },
      { id: "p2", prompt: "Siento una rabia irracional hacia quienes viven sin reglas.", type: "premium" as const, sort_order: 2 },
      { id: "p3", prompt: "Sacrifico mis deseos por temor a perder respeto.", type: "premium" as const, sort_order: 3 },
      { id: "p4", prompt: "Temo que si mostrara mi verdadera cara, la gente se alejaría.", type: "premium" as const, sort_order: 4 },
      { id: "p5", prompt: "Tengo fantasías de abandonar mis responsabilidades.", type: "premium" as const, sort_order: 5 },
      { id: "p6", prompt: "Priorizo la armonía emocional sobre la lógica fría.", type: "premium" as const, sort_order: 6 },
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