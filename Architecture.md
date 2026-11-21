You are helping me build **Mantra Engine**, a browser-first intent detection engine that converts **Musical Intent Protocol (MIP)** natural language into JSON intents and sends them to a local WebSocket server. This repo is ONLY the engine/runtime, not a DAW integration and not speech recognition.

MUST-HAVES
- Use TypeScript.
- Run in the browser (no Node-only APIs required for core engine).
- Import MIP types + validators from `musical-intent-protocol`:
  - `Intent`, `Envelope`, `makeEnvelope`
  - zod validators (e.g. `IntentSchema` / `EnvelopeSchema` / per-domain schemas)
- Validate parsed intents at runtime using zod BEFORE sending.
- Engine must be host-agnostic (not Ableton-specific).

CORE RESPONSIBILITIES (Sprint 1-2)
1) Parse natural language into MIP intents:
  - Support all MIP v0.2 domains and actions.
   - Produce `Intent[]` from text (multi-clause supported).
   - Return structured errors for unrecognized or invalid phrases.

2) WebSocket client:
   - Connect to ws://localhost:1978 (configurable).
   - Send message format:
     { "type": "intent", "payload": <Intent | Intent[]>, "source": <Source> }
   - Receive acks/results/errors and forward to handlers.

3) Optional normalization:
   - Provide utility to normalize to `Envelope[]` using `makeEnvelope` for consumers that need envelopes.

OUT OF SCOPE (do not implement yet)
- Wake word detection, speech recognition, Whisper
- LLM parsing
- Memory/learning updates beyond simple state scaffolding
- Custom command builder UI
- Any DAW-specific mapping inside the engine

PROJECT STRUCTURE
- src/
  - client/
    - engine.ts              // browser WS client + sendText API
  - nlp/
    - intentParser.ts        // rule-based NLP -> Intent[]
  - core/
    - validator.ts           // zod validation + normalization -> Envelope[]
  - server/
    - messageTypes.ts        // TS types for WS messages
  - index.ts                 // public exports
- src/config.ts              // default WS URL

IMPORTANT MESSAGE CONTRACTS
Client -> Server:
- {type:"intent", payload: Intent | Intent[] , source?: Source}
- {type:"ping"}

Server -> Client:
- {type:"ack", ids: string[]}
- {type:"error", code, message, issues?}
- {type:"result", id, status, details?}

IMPLEMENTATION TASKS
1) Build a browser-first engine wrapper with WebSocket connection management.
2) Implement NLP parsing across all MIP v0.2 domains/actions.
3) Validate parsed intents with zod before sending.
4) Provide a simple CLI tool (Node) for dev testing.
