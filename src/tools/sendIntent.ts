import WebSocket from "ws";
import { parseTextToIntents } from "../nlp/intentParser.js";
import { config } from "../config.js";

const args = process.argv.slice(2);
const urlArgIndex = args.findIndex((arg) => arg.startsWith("ws://") || arg.startsWith("wss://"));
const url = urlArgIndex >= 0 ? args.splice(urlArgIndex, 1)[0] : config.wsUrl;
const text = args.join(" ") || "play";
const parsed = parseTextToIntents(text);

if (parsed.errors?.length) {
  // eslint-disable-next-line no-console
  console.error(parsed.errors.join("\n"));
  process.exit(1);
}

const ws = new WebSocket(url);

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "intent",
      payload: parsed.intents,
      source: "api"
    })
  );
});

ws.on("message", (data) => {
  // eslint-disable-next-line no-console
  console.log("message", data.toString());
  ws.close();
});

ws.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error(`WebSocket error. Is your server running at ${url}?`);
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

ws.on("close", () => process.exit(0));
