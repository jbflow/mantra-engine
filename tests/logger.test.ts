import assert from "node:assert/strict";
import test from "node:test";
import { writeLog } from "../src/core/logger.js";

test("writes structured log events as JSON", () => {
  const originalInfo = console.info;
  let written = "";
  console.info = (message?: unknown) => {
    written = String(message);
  };

  try {
    const event = { type: "inbound" as const, timestamp: "2026-01-01T00:00:00Z", data: { ping: true } };
    writeLog(event);
    assert.deepEqual(JSON.parse(written), event);
  } finally {
    console.info = originalInfo;
  }
});