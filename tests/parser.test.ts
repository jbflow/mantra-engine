import assert from "node:assert/strict";
import test from "node:test";
import { parseTextToIntents } from "../src/nlp/intentParser.js";

test("parses multiple clauses into validated intents", () => {
  const result = parseTextToIntents("set tempo to 128 and play");

  assert.equal(result.errors, undefined);
  assert.deepEqual(result.intents, [
    { domain: "transport", intent: { action: "set_tempo", bpm: 128 } },
    { domain: "transport", intent: { action: "play" } }
  ]);
});

test("parses a role-specific track creation", () => {
  const result = parseTextToIntents("create bass track");

  assert.equal(result.errors, undefined);
  assert.deepEqual(result.intents, [
    { domain: "structure", intent: { action: "create_track", role: "bass" } }
  ]);
});

test("returns a structured error for unrecognized text", () => {
  const result = parseTextToIntents("do something surprising");

  assert.deepEqual(result.intents, []);
  assert.deepEqual(result.errors, ['Unrecognized intent: "do something surprising"']);
});

test("ignores empty clauses", () => {
  assert.deepEqual(parseTextToIntents(" ; \n and then "), { intents: [], errors: undefined });
});

test("preserves optional structure and analysis fields", () => {
  assert.deepEqual(parseTextToIntents("duplicate track bass as bass copy").intents[0], {
    domain: "structure",
    intent: { action: "duplicate_track", target: { track_name: "bass" }, name: "bass copy" }
  });
  assert.deepEqual(parseTextToIntents("summarize bass in detail").intents[0], {
    domain: "analysis",
    intent: { action: "summarize", target: { role: "bass" }, detail: "detailed" }
  });
  assert.deepEqual(parseTextToIntents("query what changed as text").intents[0], {
    domain: "analysis",
    intent: { action: "query", question: "what changed", format: "text" }
  });
});

test("preserves series values and nested note edit operations", () => {
  assert.deepEqual(parseTextToIntents("set pitch series to 60, 62, 64").intents[0], {
    domain: "pitch",
    intent: { action: "set_series", series: [60, 62, 64] }
  });

  assert.deepEqual(parseTextToIntents("transform pitch series rotate by 2").intents[0], {
    domain: "pitch",
    intent: { action: "transform_series", operation: "rotate", amount: 2 }
  });

  test("parses explicit MIP device parameters and validates numeric values", () => {
    assert.deepEqual(parseTextToIntents("increase attack on Compressor on the bass track by 5 ms"), {
      intents: [{
        domain: "parameters",
        intent: {
          action: "increase",
          target: { role: "bass", device_name: "Compressor", parameter_name: "attack" },
          amount: 5,
          unit: "ms"
        }
      }],
      errors: undefined
    });
    assert.deepEqual(parseTextToIntents("set volume on vocals to -6 dB").intents, [{
      domain: "parameters",
      intent: { action: "set", target: { role: "vocal", parameter_name: "volume" }, amount: -6, unit: "db" }
    }]);
    assert.ok(parseTextToIntents("increase attack on bass").errors);
  });
  assert.deepEqual(parseTextToIntents("edit note C4 in piano set velocity to 0.8").intents[0], {
    domain: "music",
    intent: {
      action: "edit_notes",
      target: { role: "piano" },
      selection: { pitches: ["C4"] },
      operation: { type: "set_velocity", velocity: 0.8 }
    }
  });
});