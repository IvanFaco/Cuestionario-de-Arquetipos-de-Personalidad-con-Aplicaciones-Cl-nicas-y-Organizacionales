import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildAssessmentOutcome,
  buildPremiumOutcome,
  buildHookOutcome,
  getAgeRangeLabel
} from "./assessment.domain.js";
import type { DemoInput, HookAnswers, PremiumAnswers } from "./assessment.types.js";

type FixtureCase = {
  id: string;
  demo: DemoInput & { rango_edad_label: string };
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

test("getAgeRangeLabel keeps the current age buckets", () => {
  assert.equal(getAgeRangeLabel("18_24"), "18 a 24 anos | Exploracion e identidad emergente");
  assert.equal(getAgeRangeLabel("25_34"), "25 a 34 anos | Construccion y afirmacion del yo");
  assert.equal(getAgeRangeLabel("35_49"), "35 a 49 anos | Transicion, revision y metanoia");
  assert.equal(getAgeRangeLabel("50_plus"), "50 anos o mas | Integracion y sabiduria");
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
    assert.equal(assessment.demo.rango_edad_label, fixtureCase.demo.rango_edad_label);
  });
}
