# Mantra Engine

Mantra Engine is a browser-first, host-agnostic intent parser that converts natural language into Musical Intent Protocol (MIP) JSON. The host application owns transport and execution.

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

const engine = new MantraEngine();
const result = engine.parseText("set tempo to 128 and play");
if (!result.errors?.length) {
   console.log(result.intents);
}
```

## Notes

- NLP parsing is rule-based and validates intents against MIP v0.3. Ambiguous or unsupported phrases return errors.
- The engine pins `musical-intent-protocol` to a MIP v0.3 commit on GitHub.
- Normalized envelopes use version `0.3`; consumers of envelopes must support MIP v0.3.
- A parsing error rejects the entire utterance; the host application should not send partial intents.
- MIP v0.3 has no track/device move or positional relationship action, requires a role when creating a track, and requires an amount for parameter changes. Such requests need clarification or a protocol extension rather than a guessed intent. A newly created or duplicated track cannot be referenced by pronoun until its identity is known.
