import readline from "node:readline";
import WebSocket from "ws";
import type { Intent, Source } from "musical-intent-protocol";
import { parseTextToIntents } from "../nlp/intentParser.js";
import { validateAndNormalize } from "../core/validator.js";
import { config } from "../config.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "mantra> "
});

const printJson = (label: string, value: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`\n${label}:`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(value, null, 2));
};

const showHelp = () => {
  // eslint-disable-next-line no-console
  console.log("\nCommands:");
  // eslint-disable-next-line no-console
  console.log("  help            Show this help");
  // eslint-disable-next-line no-console
  console.log("  exit | quit     Leave the CLI");
  // eslint-disable-next-line no-console
  console.log("  Any other text  Parsed as natural-language intent\n");
};

const wsUrl = process.env.MANTRA_WS_URL ?? config.wsUrl;
const socketSource: Source = "api";
let socket: WebSocket | null = null;

const connectSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  if (socket && socket.readyState === WebSocket.CONNECTING) return;

  socket = new WebSocket(wsUrl);

  socket.on("open", () => {
    // eslint-disable-next-line no-console
    console.log(`\nConnected to ${wsUrl}`);
    rl.prompt();
  });

  socket.on("message", (data) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      // eslint-disable-next-line no-console
      console.log(`\nserverMessage: ${data.toString()}`);
      rl.prompt();
      return;
    }
    printJson("serverMessage", parsed);
    rl.prompt();
  });

  socket.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error(`\nWebSocket error. Is your server running at ${wsUrl}?`);
    // eslint-disable-next-line no-console
    console.error(err);
    rl.prompt();
  });

  socket.on("close", () => {
    // eslint-disable-next-line no-console
    console.log(`\nDisconnected from ${wsUrl}`);
    rl.prompt();
  });
};

const sendIntents = (intents: Intent[]) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    // eslint-disable-next-line no-console
    console.log(`\nSocket not connected. Run the server at ${wsUrl}.`);
    return;
  }

  socket.send(
    JSON.stringify({
      type: "intent",
      payload: intents,
      source: socketSource
    })
  );
};

const handleLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }
  if (trimmed === "help") {
    showHelp();
    rl.prompt();
    return;
  }
  if (trimmed === "exit" || trimmed === "quit") {
    rl.close();
    return;
  }

  const parsed = parseTextToIntents(trimmed);
  if (parsed.errors?.length) {
    printJson("parseErrors", parsed.errors);
  }
  if (parsed.intents.length === 0) {
    rl.prompt();
    return;
  }

  printJson("intents", parsed.intents);

  const validated = validateAndNormalize(parsed.intents, socketSource);
  if (validated.issues?.length) {
    printJson("validationIssues", validated.issues);
  } else {
    printJson("envelopes", validated.envelopes);
    sendIntents(parsed.intents);
  }

  rl.prompt();
};

// eslint-disable-next-line no-console
console.log("Mantra Engine CLI. Type 'help' for commands.");
connectSocket();
rl.prompt();
rl.on("line", handleLine);
rl.on("close", () => {
  socket?.close();
  // eslint-disable-next-line no-console
  console.log("\nBye.");
  process.exit(0);
});
