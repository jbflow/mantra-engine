import assert from "node:assert/strict";
import test from "node:test";
import { MantraEngine, parseTextToIntents, supportedDomains, validateAndNormalize } from "../src/index.js";

test("exports the engine API and the complete MIP domain list", () => {
  assert.equal(typeof MantraEngine, "function");
  assert.equal(typeof parseTextToIntents, "function");
  assert.equal(typeof validateAndNormalize, "function");
  assert.deepEqual(supportedDomains, [
    "transport",
    "structure",
    "music",
    "harmony",
    "rhythm",
    "performance",
    "analysis",
    "pitch",
    "duration",
    "dynamics",
    "articulation",
    "instrumentation",
    "time_point",
    "timbre",
    "parameters"
  ]);
});