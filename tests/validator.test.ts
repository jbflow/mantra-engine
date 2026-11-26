import assert from "node:assert/strict";
import test from "node:test";
import { makeEnvelope } from "musical-intent-protocol";
import { validateAndNormalize } from "../src/core/validator.js";

test("normalizes valid intents into MIP envelopes", () => {
  const result = validateAndNormalize(
    { domain: "transport", intent: { action: "play" } },
    "ui"
  );

  assert.equal(result.issues, undefined);
  assert.equal(result.envelopes.length, 1);
  assert.equal(result.envelopes[0].version, "0.3");
  assert.equal(result.envelopes[0].source, "ui");
  assert.equal(result.envelopes[0].domain, "transport");
  assert.deepEqual(result.envelopes[0].intent, { action: "play" });
});

test("validates and normalizes MIP 0.3 parameter intents", () => {
  const result = validateAndNormalize({
    domain: "parameters",
    intent: {
      action: "set",
      target: { role: "vocal", parameter_name: "volume" },
      amount: -6,
      unit: "db"
    }
  });
  assert.equal(result.issues, undefined);
  assert.equal(result.envelopes[0].version, "0.3");
  assert.equal(result.envelopes[0].domain, "parameters");
});

test("uses the default source for intent batches and accepts empty batches", () => {
  const result = validateAndNormalize([
    { domain: "transport", intent: { action: "play" } },
    { domain: "transport", intent: { action: "stop" } }
  ]);
  const empty = validateAndNormalize([]);

  assert.deepEqual(result.envelopes.map((envelope) => envelope.source), ["api", "api"]);
  assert.equal(result.issues, undefined);
  assert.deepEqual(empty.envelopes, []);
  assert.equal(empty.issues, undefined);
});

test("preserves valid envelopes and reports invalid intents", () => {
  const result = validateAndNormalize([
    makeEnvelope({
      id: "11111111-1111-4111-8111-111111111111",
      timestamp: 1,
      source: "api",
      domain: "transport",
      intent: { action: "stop" }
    }),
    { domain: "transport", intent: { action: "launch" } } as never
  ]);

  assert.equal(result.envelopes.length, 1);
  assert.equal(result.envelopes[0].id, "11111111-1111-4111-8111-111111111111");
  assert.equal(result.issues?.length, 1);
});