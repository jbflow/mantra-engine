# Mantra Engine

Mantra Engine is a browser-first intent detection engine that converts natural language into Musical Intent Protocol (MIP) JSON and sends it to a WebSocket server running locally.

## Requirements

- Node.js 18+
- npm

## Setup

1) Install dependencies:

   npm install

2) Use the engine in a browser app.

## Example browser usage

```ts
import { MantraEngine } from "mantra-engine";

const engine = new MantraEngine({
   url: "ws://localhost:1978",
   source: "ui",
   handlers: {
      onAck: (ack) => console.log("ack", ack),
      onError: (err) => console.error("error", err)
   }
});

await engine.connect();
engine.sendText("set tempo to 128 and play");
```

## Example CLI usage

Send text from Node to a running WebSocket server:

- npm run send -- "set tempo to 120 and play"

## Notes

- NLP parsing is rule-based and validates intents against MIP v0.3. Ambiguous or unsupported phrases return errors.
- The engine pins `musical-intent-protocol` to a MIP v0.3 commit on GitHub.
