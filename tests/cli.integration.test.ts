import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import WebSocket from "ws";
import { startWsServer } from "../src/server/wsServer.js";

type RunningChild = {
  process: ChildProcessWithoutNullStreams;
  output: string;
  exit: Promise<[number | null, NodeJS.Signals | null]>;
};

const startChild = (script: string, args: string[], env: NodeJS.ProcessEnv = {}): RunningChild => {
  const child = spawn(process.execPath, ["--import", "tsx", script, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "pipe"
  });
  const running: RunningChild = { process: child, output: "", exit: once(child, "exit") as RunningChild["exit"] };
  child.stdout.on("data", (chunk) => {
    running.output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    running.output += chunk.toString();
  });
  return running;
};

const waitForOutput = (running: RunningChild, text: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      running.process.stdout.off("data", check);
      running.process.stderr.off("data", check);
      running.process.off("exit", check);
    };
    const check = () => {
      if (running.output.includes(text)) {
        cleanup();
        resolve();
      } else if (running.process.exitCode !== null || running.process.signalCode !== null) {
        cleanup();
        reject(new Error(`Child exited before output ${text}: ${running.output}`));
      }
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for child output ${JSON.stringify(text)}. Output: ${running.output}`));
    }, 10000);
    timeout.unref();
    running.process.stdout.on("data", check);
    running.process.stderr.on("data", check);
    running.process.on("exit", check);
    check();
  });

const nextJsonMessage = (socket: WebSocket): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    socket.once("message", (data) => resolve(JSON.parse(data.toString())));
  });

const registerInterpreter = async (url: string): Promise<WebSocket> => {
  const interpreter = new WebSocket(`${url}/interpreter`);
  await once(interpreter, "open");
  const ack = nextJsonMessage(interpreter);
  interpreter.send(JSON.stringify({ type: "register", capabilities: ["all"] }));
  assert.equal((await ack).type, "ack");
  return interpreter;
};

test("interactive CLI handles help, parse errors, dispatch, and exit", async () => {
  const server = startWsServer(0);
  let interpreter: WebSocket | undefined;
  let running: RunningChild | undefined;

  try {
    await once(server, "listening");
    const port = (server.address() as AddressInfo).port;
    const url = `ws://127.0.0.1:${port}`;
    interpreter = await registerInterpreter(url);
    running = startChild("src/tools/cli.ts", [], { MANTRA_WS_URL: url });
    await waitForOutput(running, "Connected to");

    const help = waitForOutput(running, "Commands:");
    running.process.stdin.write("help\n");
    await help;

    const parseErrors = waitForOutput(running, "parseErrors:");
    running.process.stdin.write("unknown phrase\n");
    await parseErrors;

    const dispatch = nextJsonMessage(interpreter);
    const serverMessage = waitForOutput(running, "serverMessage:");
    running.process.stdin.write("play\n");
    assert.equal((await dispatch).type, "dispatch");
    await serverMessage;

    const goodbye = waitForOutput(running, "Bye.");
    running.process.stdin.write("quit\n");
    await goodbye;
    const [exitCode] = await running.exit;
    assert.equal(exitCode, 0);
    assert.match(running.output, /envelopes:/);
  } finally {
    if (running?.process.exitCode === null) running.process.kill();
    const interpreterClosed = interpreter ? once(interpreter, "close") : Promise.resolve();
    interpreter?.close();
    await interpreterClosed;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("one-shot sender dispatches then exits, and rejects unrecognized text", async () => {
  const server = startWsServer(0);
  let interpreter: WebSocket | undefined;
  let running: RunningChild | undefined;

  try {
    await once(server, "listening");
    const port = (server.address() as AddressInfo).port;
    const url = `ws://127.0.0.1:${port}`;
    interpreter = await registerInterpreter(url);
    running = startChild("src/tools/sendIntent.ts", [url, "play"]);

    const dispatch = await nextJsonMessage(interpreter);
    assert.equal(dispatch.type, "dispatch");
    const [successCode] = await running.exit;
    assert.equal(successCode, 0);
    assert.match(running.output, /message.*ack/);

    const invalid = startChild("src/tools/sendIntent.ts", ["unknown request"]);
    const [invalidCode] = await invalid.exit;
    assert.equal(invalidCode, 1);
    assert.match(invalid.output, /Unrecognized intent/);
  } finally {
    if (running?.process.exitCode === null) running.process.kill();
    const interpreterClosed = interpreter ? once(interpreter, "close") : Promise.resolve();
    interpreter?.close();
    await interpreterClosed;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});