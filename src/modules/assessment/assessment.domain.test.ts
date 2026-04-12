import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildAssessmentOutcome,
  buildPremiumOutcome,
  buildHookOutcome
} from "./assessment.domain.js";
import type { DemoInput, HookAnswers, PremiumAnswers } from "./assessment.types.js";

type FixtureCase = {
  id: string;
  demo: DemoInput;
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

test("buildDemoProfile trims onboarding inputs", () => {
  const assessment = buildAssessmentOutcome(
    {
      nombre: "  Ana  ",
      objetivo: "clarity_patterns"
    },
    {
      v1: 3,
      v2: 3,
      v3: 3,
      v4: 3,
      v5: 3,
      v6: 3,
      v7: 3,
      v8: 3,
      v9: 3,
      v10: 3
    },
    {
      p1: 3,
      p2: 3,
      p3: 3,
      p4: 3,
      p5: 3,
      p6: 3,
      p7: 3,
      p8: 3,
      p9: 3,
      p10: 3,
      p11: 3,
      p12: 3,
      p13: 3,
      p14: 3,
      p15: 3
    }
  );

  assert.equal(assessment.demo.nombre, "Ana");
  assert.equal(assessment.demo.objetivo, "clarity_patterns");
  assert.equal(
    assessment.demo.objetivo_label,
    "Entender con mas claridad mis patrones de personalidad"
  );
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
    assert.equal(assessment.demo.nombre, fixtureCase.demo.nombre);
    assert.equal(assessment.demo.objetivo, fixtureCase.demo.objetivo);
  });
}
