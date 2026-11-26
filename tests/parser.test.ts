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

test("resolves device objects separately from track destinations", () => {
  for (const preposition of ["on", "in", "to", "onto", "into"]) {
    assert.deepEqual(parseTextToIntents(`add a reverb ${preposition} the bass track`).intents, [{
      domain: "structure",
      intent: { action: "load_device", target: { role: "bass" }, device: "reverb", kind: "effect" }
    }]);
  }
  assert.deepEqual(parseTextToIntents("load piano on drums").intents, [{
    domain: "structure",
    intent: { action: "load_device", target: { role: "drums" }, device: "piano", kind: "instrument" }
  }]);
  assert.deepEqual(parseTextToIntents("trigger clip bass on piano").intents, [{
    domain: "performance",
    intent: { action: "trigger_clip", target: { role: "piano" }, clip_name: "bass" }
  }]);
});

test("keeps source and destination values distinct from targets", () => {
  assert.deepEqual(parseTextToIntents("map pitch from bass to lead").intents, [{
    domain: "pitch", intent: { action: "map", source: "bass", destination: "lead" }
  }]);
  assert.deepEqual(parseTextToIntents("remove note Bb4 from piano").intents, [{
    domain: "music",
    intent: { action: "remove_notes", target: { role: "piano" }, selection: { pitches: ["Bb4"] } }
  }]);
  assert.deepEqual(parseTextToIntents("increase attack with Compressor on bass by 5 ms").intents, [{
    domain: "parameters",
    intent: {
      action: "increase",
      target: { role: "bass", device_name: "Compressor", parameter_name: "attack" },
      amount: 5,
      unit: "ms"
    }
  }]);
  assert.deepEqual(parseTextToIntents("set pitch series to 60, 62 on drums").intents, [{
    domain: "pitch", intent: { action: "set_series", series: [60, 62], target: { role: "drums" } }
  }]);
  assert.deepEqual(parseTextToIntents("set chord Cmaj7 on drums").intents, [{
    domain: "harmony", intent: { action: "set_chord", chord: "Cmaj7", target: { role: "drums" } }
  }]);
  assert.deepEqual(parseTextToIntents("swing 0.6 on bass").intents, [{
    domain: "rhythm", intent: { action: "set_swing", amount: 0.6, target: { role: "bass" } }
  }]);
});

test("preserves command order and only resolves adjacent unambiguous track references", () => {
  assert.deepEqual(parseTextToIntents("mute bass, then solo it and play").intents, [
    { domain: "structure", intent: { action: "mute", target: { role: "bass" } } },
    { domain: "structure", intent: { action: "solo", target: { role: "bass" } } },
    { domain: "transport", intent: { action: "play" } }
  ]);
  assert.deepEqual(parseTextToIntents("mute bass and solo drums").intents, [
    { domain: "structure", intent: { action: "mute", target: { role: "bass" } } },
    { domain: "structure", intent: { action: "solo", target: { role: "drums" } } }
  ]);
  assert.deepEqual(parseTextToIntents("mute bass, solo drums").intents, [
    { domain: "structure", intent: { action: "mute", target: { role: "bass" } } },
    { domain: "structure", intent: { action: "solo", target: { role: "drums" } } }
  ]);
  assert.deepEqual(parseTextToIntents("mute track \"bass and drums\"").intents, [{
    domain: "structure", intent: { action: "mute", target: { track_name: "bass and drums" } }
  }]);
  assert.equal(parseTextToIntents("make bass warmer and brighter").intents[0]?.intent.action, "adjust_many");
});

test("rejects ambiguous, unsupported, or incomplete instructions atomically", () => {
  for (const text of [
    "move the synth from track two to track four",
    "duplicate the bass track and move it below the drums",
    "create a MIDI track and load a piano onto it",
    "turn down the volume on the drums and increase the reverb on the vocals",
    "mute bass and play and solo it",
    "duplicate bass and solo it",
    "mute track two",
    "mute",
    "load reverb",
    "load unknown on bass",
    "trigger clip bass",
    "quantize bass across drums",
    "mute bass between drums and vocals",
    "play backwards",
    "play and",
    "mute bass then",
    "set tempo to 120 across drums",
    "swing 0.6 across drums",
    "set key D imaginary",
    "edit note C4 in piano set velocity to 0.8 on drums",
    "mute track \"bass"
  ]) {
    const result = parseTextToIntents(text);
    assert.ok(result.errors?.length, text);
    assert.deepEqual(result.intents, [], text);
  }
});

test("uses requested quantization strength and rejects conflicting track relationships", () => {
  assert.deepEqual(parseTextToIntents("quantize bass strength 0.5").intents, [{
    domain: "music", intent: { action: "quantize", target: { role: "bass" }, strength: 0.5 }
  }]);
  assert.ok(parseTextToIntents("add reverb to bass with drums").errors);
});