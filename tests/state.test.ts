import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/core/state.js";

test("creates independent empty session and focus state", () => {
  const first = createInitialState();
  const second = createInitialState();

  assert.deepEqual(first, { session: {}, focus: {} });
  assert.notStrictEqual(first.session, second.session);
  assert.notStrictEqual(first.focus, second.focus);
});