import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import WebSocket, { WebSocketServer } from "ws";
import { MantraEngine } from "../src/client/engine.js";

test("returns parse errors and rejects sends while disconnected", () => {
  const engine = new MantraEngine({ url: "ws://localhost:1978", source: "test" });

  assert.deepEqual(engine.sendText("not an intent").intents, []);
  assert.deepEqual(engine.sendText("").intents, []);
  assert.throws(
    () => engine.sendIntents({ domain: "transport", intent: { action: "play" } }),
    /WebSocket is not connected/
  );
});

test("handles raw and typed messages, reuses open connections, and sends intents", async () => {
  Object.defineProperty(globalThis, "WebSocket", { configurable: true, value: WebSocket });
  const server = new WebSocketServer({ port: 0 });
  let connectionCount = 0;
  let receivedMessage: Record<string, unknown> | undefined;
  let engine: MantraEngine | undefined;
  let resolveReceived!: (message: Record<string, unknown>) => void;
  let resolveMidiReceived!: (message: Record<string, unknown>) => void;
  let resolveOpen!: () => void;
  let resolveClose!: () => void;
  let resolveRaw!: () => void;
  let resolveAck!: () => void;
  let resolveError!: () => void;
  let resolveResult!: () => void;
  const received = new Promise<Record<string, unknown>>((resolve) => {
    resolveReceived = resolve;
  });
  const midiReceived = new Promise<Record<string, unknown>>((resolve) => {
    resolveMidiReceived = resolve;
  });
  const opened = new Promise<void>((resolve) => {
    resolveOpen = resolve;
  });
  const closed = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });
  const rawReceived = new Promise<void>((resolve) => {
    resolveRaw = resolve;
  });
  const ackReceived = new Promise<void>((resolve) => {
    resolveAck = resolve;
  });
  const errorReceived = new Promise<void>((resolve) => {
    resolveError = resolve;
  });
  const resultReceived = new Promise<void>((resolve) => {
    resolveResult = resolve;
  });

  server.on("connection", (socket) => {
    connectionCount += 1;
    socket.on("message", (data) => {
      receivedMessage = JSON.parse(data.toString());
      if (receivedMessage.type === "intent") resolveReceived(receivedMessage);
      if (receivedMessage.type === "midi") resolveMidiReceived(receivedMessage);
    });
    socket.send("not-json");
    socket.send(JSON.stringify({ type: "ack", ids: ["id"] }));
    socket.send(JSON.stringify({ type: "error", code: "BAD_REQUEST", message: "bad" }));
    socket.send(JSON.stringify({ type: "result", id: "id", status: "ok" }));
  });

  const rawValues: unknown[] = [];

  try {
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    engine = new MantraEngine({
      url: `ws://127.0.0.1:${address.port}`,
      source: "test",
      handlers: {
        onOpen: resolveOpen,
        onClose: resolveClose,
        onRawMessage: (value) => {
          rawValues.push(value);
          if (value === "not-json") resolveRaw();
        },
        onAck: resolveAck,
        onError: resolveError,
        onResult: resolveResult
      }
    });

    await engine.connect();
    await engine.connect();
    await Promise.all([opened, rawReceived, ackReceived, errorReceived, resultReceived]);
    assert.equal(connectionCount, 1);
    assert.ok(rawValues.includes("not-json"));

    engine.sendIntents({ domain: "transport", intent: { action: "play" } });
    assert.deepEqual(await received, {
      type: "intent",
      payload: { domain: "transport", intent: { action: "play" } },
      source: "test"
    });

    const midiAction = {
      port: "Ableton",
      message: "note_on" as const,
      channel: 1,
      data: 60,
      value: 100
    };
    engine.sendMidiAction(midiAction);
    assert.deepEqual(await midiReceived, { type: "midi", payload: midiAction });

    engine.disconnect();
    await closed;
  } finally {
    engine?.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("rejects a failed WebSocket connection", async () => {
  Object.defineProperty(globalThis, "WebSocket", { configurable: true, value: WebSocket });
  const server = new WebSocketServer({ port: 0 });
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve) => server.close(() => resolve()));

  const engine = new MantraEngine({ url: `ws://127.0.0.1:${address.port}` });
  await assert.rejects(engine.connect(), /WebSocket connection error/);
});