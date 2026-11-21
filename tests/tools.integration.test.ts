import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import WebSocket from "ws";
import { startConfiguredServer } from "../src/tools/runServer.js";

test("configured server starts on the selected port and responds to pings", async () => {
  const server = startConfiguredServer("ws://127.0.0.1:0");
  let client: WebSocket | undefined;

  try {
    await once(server, "listening");
    const port = (server.address() as AddressInfo).port;
    client = new WebSocket(`ws://127.0.0.1:${port}`);
    await once(client, "open");
    const pong = new Promise<unknown>((resolve) => {
      client?.once("message", (data) => resolve(JSON.parse(data.toString())));
    });
    client.send(JSON.stringify({ type: "ping" }));
    assert.deepEqual(await pong, { type: "pong" });
  } finally {
    const clientClosed = client ? once(client, "close") : Promise.resolve();
    client?.close();
    await clientClosed;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});