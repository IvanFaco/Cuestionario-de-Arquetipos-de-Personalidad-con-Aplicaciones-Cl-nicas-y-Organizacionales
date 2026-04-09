import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildAssessmentOutcome,
  buildPremiumOutcome,
  buildHookOutcome,
  getAgeRange
} from "./assessment.domain.js";
import type { DemoInput, HookAnswers, PremiumAnswers } from "./assessment.types.js";

type FixtureCase = {
  id: string;
  demo: DemoInput & { rango_edad: string };
  hook_answers: HookAnswers;
  premium_answers: PremiumAnswers;
  expected: {
    dominant_archetype: string;
    top_three: string[];
    persona: number;
    sombra_base: number;
    sombra_total: number;
    keirsey: string;
    campbell: string;
  };
};

function loadFixtureCases(): FixtureCase[] {
  const fixturePath = path.join(process.cwd(), "docs/migration/fixtures/equivalence-cases.json");
  const raw = fs.readFileSync(fixturePath, "utf8");

  return (JSON.parse(raw) as { cases: FixtureCase[] }).cases;
}

test("getAgeRange keeps the current age buckets", () => {
  assert.equal(getAgeRange(18), "18 - 34 anos (Construccion del Ego)");
  assert.equal(getAgeRange(35), "35 - 50 anos (La Transicion / Metanoia)");
  assert.equal(getAgeRange(51), "51+ anos (Integracion y Sabiduria)");
});

for (const fixtureCase of loadFixtureCases()) {
  test(`fixture ${fixtureCase.id} preserves hook and premium outputs`, () => {
    const hook = buildHookOutcome(fixtureCase.hook_answers);
    const premium = buildPremiumOutcome(fixtureCase.premium_answers);
    const assessment = buildAssessmentOutcome(
      fixtureCase.demo,
      fixtureCase.hook_answers,
      fixtureCase.premium_answers
    );

    assert.equal(hook.ranking[0].name, fixtureCase.expected.dominant_archetype);
    assert.deepEqual(
      hook.ranking.slice(0, 3).map((item) => item.name),
      fixtureCase.expected.top_three
    );
    assert.equal(hook.estructuras.Persona, fixtureCase.expected.persona);
    assert.equal(hook.estructuras.Sombra_Base, fixtureCase.expected.sombra_base);
    assert.equal(premium.Sombra_Total, fixtureCase.expected.sombra_total);
    assert.equal(premium.Keirsey, fixtureCase.expected.keirsey);
    assert.equal(premium.Campbell, fixtureCase.expected.campbell);
    assert.equal(assessment.demo.rango_edad, fixtureCase.demo.rango_edad);
  });
}
