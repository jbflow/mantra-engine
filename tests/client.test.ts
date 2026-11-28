import assert from "node:assert/strict";
import test from "node:test";
import { MantraEngine } from "../src/client/engine.js";
import { parseTextToIntents } from "../src/nlp/intentParser.js";

test("MantraEngine parses text without owning transport", () => {
  const engine = new MantraEngine();
  const parsed = engine.parseText("play");

  assert.deepEqual(parsed, parseTextToIntents("play"));
  assert.deepEqual(parsed.intents, [{ domain: "transport", intent: { action: "play" } }]);
});

test("legacy sendText remains a parsing-only alias", () => {
  const engine = new MantraEngine();
  const parsed = engine.sendText("play");

  assert.deepEqual(parsed, engine.parseText("play"));
  assert.equal(parsed.intents.length, 1);
});
