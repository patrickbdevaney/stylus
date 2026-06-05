import {
  seededLighthouse,
  provenanceLabel,
} from "../../lib/lighthouse";
import { test, assert } from "./assert";

test("seededLighthouse before side is seeded", () => {
  const scores = seededLighthouse("versailles", "before");
  assert.equal(scores.seeded, true, "before.seeded");
});

test("seededLighthouse after side is seeded", () => {
  const scores = seededLighthouse("versailles", "after");
  assert.equal(scores.seeded, true, "after.seeded");
});

test("seededLighthouse before and after performance differ", () => {
  const before = seededLighthouse("versailles", "before");
  const after = seededLighthouse("versailles", "after");
  assert.ok(
    before.performance !== after.performance,
    "before vs after performance",
  );
});

test("provenanceLabel marks estimated seeded scores", () => {
  const label = provenanceLabel(seededLighthouse("versailles", "before"));
  assert.ok(label.includes("Estimated"), "estimated label");
});

test("provenanceLabel marks measured real scores", () => {
  const seeded = seededLighthouse("versailles", "after");
  const label = provenanceLabel({
    ...seeded,
    seeded: false,
    sourceUrl: "https://example.com",
    degraded: false,
  });
  assert.ok(label.includes("Measured"), "measured label");
});
