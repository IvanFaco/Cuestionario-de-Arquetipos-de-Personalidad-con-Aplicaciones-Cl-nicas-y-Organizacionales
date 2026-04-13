import { getQuestionsRepository } from "../questions/questions.repository.js";
import { likertOptions } from "./assessment.data.js";
import type { QuestionOption } from "./assessment.types.js";

export interface QuestionData {
  id: string;
  prompt: string;
}

export function getHookQuestions(): QuestionData[] {
  return getQuestionsRepository().findAllByType("hook").map(q => ({ id: q.id, prompt: q.prompt }));
}

export function getPremiumQuestions(): QuestionData[] {
  return getQuestionsRepository().findAllByType("premium").map(q => ({ id: q.id, prompt: q.prompt }));
}

export { likertOptions, type QuestionOption };