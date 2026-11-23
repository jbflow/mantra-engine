# Mantra Engine Architecture

## Overview

**Mantra Engine** is a pure intent parsing library that converts natural language into **Musical Intent Protocol (MIP)** JSON intents. It has no server infrastructure, no DAW integration, and no speech recognition.

```
Mantra Frontend (NextJS)
       ↓
Mantra Engine (TypeScript)
  - parseTextToIntents() → Intent[]
  - validateAndNormalize() → Envelope[]
  - MantraEngine client (optional WebSocket wrapper)
       ↓
Mantra Remote Script (Python)
  - Executes intents in Ableton Live
```

## Design Principles

- **Host-agnostic**: No DAW-specific logic (Ableton integration is in separate repo)
- **Browser-first**: Core engine runs in browsers and Node.js
- **Schema-driven**: All parsing validated against MIP v0.2 schema
- **Minimal dependencies**: Only `musical-intent-protocol` and `zod`

## Project Structure

```
src/
├── client/
│   └── engine.ts              # WebSocket client wrapper (optional)
├── nlp/
│   ├── intentParser.ts        # Main NLP parser
│   └── domains/               # Domain-specific parsers
├── core/
│   ├── validator.ts           # Zod validation & normalization
│   ├── router.ts              # Intent routing
│   ├── state.ts               # Session state scaffolding
│   └── logger.ts              # Structured logging
├── types/
│   └── protocol.ts            # WebSocket message types
└── index.ts                   # Public exports
```

## Public API

### Core Functions

```typescript
// Parse natural language → Intent[]
parseTextToIntents(text: string): ParseResult
  ├─ intents: Intent[]
  ├─ errors: ParseError[]
  └─ analysis: AnalysisResult

// Validate and normalize → Envelope[]
validateAndNormalize(intents: Intent | Intent[]): Result
  ├─ valid: Envelope[]
  └─ invalid: ValidationIssue[]

// Get list of supported domains
supportedDomains(): string[]

// Validate a single intent
validateAndNormalize(intent: Intent): Envelope | ValidationError
```

### Optional WebSocket Client

```typescript
// Connect to remote script server
const engine = new MantraEngine({
  url: "ws://localhost:1978",
  source: "frontend",
  handlers: {
    onOpen: () => {},
    onAck: (message) => {},
    onError: (message) => {},
    onResult: (message) => {}
  }
});

await engine.connect();
engine.sendText("play");  // Parse + send in one call
engine.sendIntents(intents);
engine.disconnect();
```

## Supported Domains

All MIP v0.2 domains:
- `transport` - Play, stop, record, tempo, navigation
- `structure` - Tracks, clips, devices
- `music` - Notes, quantization, transposition
- `performance` - Scene/clip triggering
- `analysis` - Queries and introspection
- Plus 10+ more specialized domains

## Example Usage

```typescript
import { MantraEngine, parseTextToIntents } from "mantra-engine";

// 1. Parse text
const result = parseTextToIntents("play at 120 bpm");
console.log(result.intents);
// [
//   { domain: "transport", intent: { action: "play" } },
//   { domain: "transport", intent: { action: "set_tempo", tempo: 120 } }
// ]

// 2. Validate intents
const { valid } = validateAndNormalize(result.intents);

// 3. Send via WebSocket (optional)
const engine = new MantraEngine({ url: "ws://localhost:1978" });
await engine.connect();
engine.sendIntents(valid);
```

## Message Protocol

The optional WebSocket client uses this protocol to communicate with the Remote Script:

**Client → Server**:
```json
{
  "type": "intent",
  "payload": {"domain": "transport", "intent": {"action": "play"}},
  "source": "frontend"
}
```

**Server → Client**:
```json
{
  "type": "result",
  "id": "...",
  "status": "ok"
}
```

## Testing

```bash
npm test                # Run all tests
npm run test:coverage   # With coverage
```

Tests focus on:
- Intent parsing correctness
- Domain coverage
- Error handling
- Validation logic

## Out of Scope

- DAW integration (see `mantra-remote-script`)
- Speech recognition
- Wake word detection
- Persistent state/learning
- UI/command builder

## See Also

- [mantra-remote-script](../mantra-remote-script/) - Ableton Live integration
- [mantra-fe](../mantra-fe/) - Frontend application
- [musical-intent-protocol](https://github.com/jbflow/musical-intent-protocol) - MIP schema
