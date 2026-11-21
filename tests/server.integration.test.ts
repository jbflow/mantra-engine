import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import WebSocket from "ws";
import type { Intent } from "musical-intent-protocol";
import { MantraEngine } from "../src/client/engine.js";
import { startWsServer } from "../src/server/wsServer.js";

type MessageSocket = WebSocket;

const nextJsonMessage = (socket: MessageSocket): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    socket.once("message", (data) => resolve(JSON.parse(data.toString())));
  });

const nextJsonMessages = (
  socket: MessageSocket,
  count: number
): Promise<Record<string, unknown>[]> =>
  new Promise((resolve) => {
    const messages: Record<string, unknown>[] = [];
    const collect = (data: WebSocket.RawData) => {
      messages.push(JSON.parse(data.toString()));
      if (messages.length === count) {
        socket.off("message", collect);
        resolve(messages);
      }
    };
    socket.on("message", collect);
  });

test("engine sends intents through the server to a registered interpreter", async () => {
  Object.defineProperty(globalThis, "WebSocket", { configurable: true, value: WebSocket });
  const server = startWsServer(0);
  let engine: MantraEngine | undefined;
  let interpreter: WebSocket | undefined;
  let resolveError!: (message: Record<string, unknown>) => void;
  let resolveResult!: (message: Record<string, unknown>) => void;
  let resolveClose!: () => void;
  const error = new Promise<Record<string, unknown>>((resolve) => {
    resolveError = resolve;
  });
  const result = new Promise<Record<string, unknown>>((resolve) => {
    resolveResult = resolve;
  });
  const closed = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });

  try {
    await once(server, "listening");
    const port = (server.address() as AddressInfo).port;
    const url = `ws://127.0.0.1:${port}`;

    interpreter = new WebSocket(`${url}/interpreter`);
    await once(interpreter, "open");
    const registrationAck = nextJsonMessage(interpreter);
    interpreter.send(JSON.stringify({ type: "register", capabilities: ["all"] }));
    assert.equal((await registrationAck).type, "ack");

    let resolveAck!: (message: Record<string, unknown>) => void;
    const ack = new Promise<Record<string, unknown>>((resolve) => {
      resolveAck = resolve;
    });
    engine = new MantraEngine({
      url,
      source: "ui",
      handlers: {
        onAck: (message) => resolveAck(message as unknown as Record<string, unknown>),
        onError: (message) => resolveError(message as unknown as Record<string, unknown>),
        onResult: (message) => resolveResult(message as unknown as Record<string, unknown>),
        onClose: resolveClose
      }
    });
    await engine.connect();

    const dispatched = nextJsonMessages(interpreter, 2);
    const parsed = engine.sendText("play and set tempo to 124");
    assert.equal(parsed.errors, undefined);
    assert.equal(parsed.intents.length, 2);

    const [ackMessage, dispatchMessages] = await Promise.all([ack, dispatched]);
    assert.equal(ackMessage.type, "ack");
    const ids = ackMessage.ids as string[];
    assert.equal(ids.length, 2);
    assert.deepEqual(
      dispatchMessages.map((message) => (message.payload as Record<string, unknown>).id),
      ids
    );
    assert.ok(
      dispatchMessages.every((message) => {
        const envelope = message.payload as Record<string, unknown>;
        return envelope.version === "0.2" && envelope.source === "ui";
      })
    );

    engine.sendIntents([{ domain: "transport", intent: { action: "launch" } } as never]);
    const validationError = await error;
    assert.equal(validationError.code, "VALIDATION_ERROR");

    const resultMessage = { type: "result", id: ids[0], status: "ok", details: { applied: true } };
    interpreter.send(JSON.stringify(resultMessage));
    assert.deepEqual(await result, resultMessage);
  } finally {
    engine?.disconnect();
    interpreter?.close();
    await Promise.all([closed, interpreter ? once(interpreter, "close") : Promise.resolve()]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("server handles pings and rejects malformed, unsupported, or unrouteable messages", async () => {
  const server = startWsServer(0);
  let client: WebSocket | undefined;
  let interpreter: WebSocket | undefined;

  try {
    await once(server, "listening");
    const port = (server.address() as AddressInfo).port;
    const url = `ws://127.0.0.1:${port}`;
    client = new WebSocket(url);
    await once(client, "open");

    const pong = nextJsonMessage(client);
    client.send(JSON.stringify({ type: "ping" }));
    assert.equal((await pong).type, "pong");

    const badJson = nextJsonMessage(client);
    client.send("not json");
    assert.equal((await badJson).code, "BAD_REQUEST");

    const unsupported = nextJsonMessage(client);
    client.send(JSON.stringify({ type: "unsupported" }));
    assert.equal((await unsupported).code, "BAD_REQUEST");

    const noInterpreter = nextJsonMessage(client);
    client.send(JSON.stringify({ type: "intent", payload: { domain: "transport", intent: { action: "play" } } }));
    assert.equal((await noInterpreter).code, "INTERNAL_ERROR");

    interpreter = new WebSocket(`${url}/interpreter`);
    await once(interpreter, "open");
    const registrationAck = nextJsonMessage(interpreter);
    interpreter.send(JSON.stringify({ type: "register", capabilities: [] }));
    assert.equal((await registrationAck).type, "ack");

    const invalidIntent = nextJsonMessage(client);
    client.send(JSON.stringify({ type: "intent", payload: { domain: "transport", intent: { action: "launch" } } }));
    assert.equal((await invalidIntent).code, "VALIDATION_ERROR");
  } finally {
    const clientClosed = client ? once(client, "close") : Promise.resolve();
    const interpreterClosed = interpreter ? once(interpreter, "close") : Promise.resolve();
    client?.close();
    interpreter?.close();
    await Promise.all([clientClosed, interpreterClosed]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("server validates and dispatches intents from all MIP domains", async () => {
  Object.defineProperty(globalThis, "WebSocket", { configurable: true, value: WebSocket });
  const server = startWsServer(0);
  let engine: MantraEngine | undefined;
  let interpreter: WebSocket | undefined;

  try {
    await once(server, "listening");
    const port = (server.address() as AddressInfo).port;
    const url = `ws://127.0.0.1:${port}`;

    interpreter = new WebSocket(`${url}/interpreter`);
    await once(interpreter, "open");
    const registrationAck = nextJsonMessage(interpreter);
    interpreter.send(JSON.stringify({ type: "register", capabilities: ["all"] }));
    assert.equal((await registrationAck).type, "ack");

    let resolveAck!: (message: Record<string, unknown>) => void;
    const ack = new Promise<Record<string, unknown>>((resolve) => {
      resolveAck = resolve;
    });
    engine = new MantraEngine({
      url,
      source: "test",
      handlers: { onAck: (message) => resolveAck(message as unknown as Record<string, unknown>) }
    });
    await engine.connect();

    const intents: Intent[] = [
      { domain: "transport", intent: { action: "play" } },
      { domain: "structure", intent: { action: "create_track", role: "bass" } },
      { domain: "music", intent: { action: "add_notes", target: { role: "piano" }, notes: [{ pitch: "C4", start_beats: 0, duration_beats: 1 }] } },
      { domain: "harmony", intent: { action: "set_key", tonic: "D", scale: "dorian" } },
      { domain: "rhythm", intent: { action: "set_swing", amount: 0.6 } },
      { domain: "performance", intent: { action: "trigger_scene", scene_name: "Chorus" } },
      { domain: "analysis", intent: { action: "summarize", detail: "brief" } },
      { domain: "pitch", intent: { action: "set_series", series: [60, 62, 64] } },
      { domain: "duration", intent: { action: "set_value", value: 1 } },
      { domain: "dynamics", intent: { action: "set_series", series: [0.2, 0.8] } },
      { domain: "articulation", intent: { action: "set_value", value: "staccato" } },
      { domain: "instrumentation", intent: { action: "set_value", value: "piano" } },
      { domain: "time_point", intent: { action: "set_value", value: 4 } },
      { domain: "timbre", intent: { action: "adjust", attribute: "warmth", amount: 0.2 } }
    ];
    const dispatches = nextJsonMessages(interpreter, intents.length);
    engine.sendIntents(intents);

    const [ackMessage, dispatchMessages] = await Promise.all([ack, dispatches]);
    assert.equal((ackMessage.ids as string[]).length, intents.length);
    assert.deepEqual(
      dispatchMessages.map((message) => (message.payload as Record<string, unknown>).domain).sort(),
      intents.map((intent) => intent.domain).sort()
    );
  } finally {
    engine?.disconnect();
    interpreter?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});