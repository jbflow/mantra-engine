# Quick Start Guide

## Installation

```bash
npm install mantra-engine
```

## Basic Usage

### Parse Natural Language to Intents

```typescript
import { parseTextToIntents } from "mantra-engine";

const result = parseTextToIntents("play the drums track at 120 bpm");

console.log(result.intents);
// [
//   { domain: "structure", intent: { action: "select_track", target: "drums" } },
//   { domain: "transport", intent: { action: "play" } },
//   { domain: "transport", intent: { action: "set_tempo", tempo: 120 } }
// ]

if (result.errors?.length) {
  console.error("Parse errors:", result.errors);
}
```

### Validate Intents to Envelopes

```typescript
import { validateAndNormalize } from "mantra-engine";

const { valid, invalid } = validateAndNormalize(result.intents);

if (valid.length) {
  console.log("Valid envelopes:", valid);
  // Send to Ableton via mantra-remote-script
}

if (invalid.length) {
  console.error("Validation issues:", invalid);
}
```

### Use the WebSocket Client (Optional)

```typescript
import { MantraEngine } from "mantra-engine";

const engine = new MantraEngine({
  url: "ws://localhost:1978",  // Connect to mantra-remote-script
  source: "my-app",
  handlers: {
    onOpen: () => console.log("Connected"),
    onAck: (msg) => console.log("Intent acknowledged:", msg.ids),
    onError: (msg) => console.error("Error:", msg.message),
    onResult: (msg) => console.log("Result:", msg.status)
  }
});

await engine.connect();

// Parse and send in one call
const result = engine.sendText("play");

// Or send pre-parsed intents
engine.sendIntents({
  domain: "transport",
  intent: { action: "play" }
});

engine.disconnect();
```

## Integration with Ableton Live

To execute intents in Ableton Live, you need **Mantra Remote Script**:

1. **Install the Remote Script**: Follow the [installation guide](../mantra-remote-script/INSTALL.md)
2. **Start the script**: Enable it in Ableton preferences
3. **Connect**: Use the WebSocket client to send intents

See [mantra-remote-script Architecture](../mantra-remote-script/ARCHITECTURE.md) for how intents are executed.

## Supported Commands

Mantra Engine supports all Musical Intent Protocol v0.2 domains. Some examples:

**Transport Control**:
```
"play"
"stop"
"record"
"set tempo to 128"
"loop from 2 bars for 8 bars"
```

**Track Management**:
```
"create bass track"
"select drums"
"mute bass"
"solo lead"
"rename track bass to kick"
```

**Music Editing**:
```
"add note C4 to piano"
"quantize drums by 50%"
"transpose lead by 3 semitones"
"set key to D minor"
```

**Performance**:
```
"trigger chorus scene"
"launch clip 1"
```

For complete domain reference, see the [Architecture documentation](./Architecture.md).

## Error Handling

```typescript
const result = parseTextToIntents("unknown command xyz");

if (result.errors?.length) {
  result.errors.forEach(error => {
    console.error(`Parse Error: ${error.message}`);
    console.error(`  Clause: "${error.clause}"`);
    console.error(`  Suggestions: ${error.suggestions?.join(", ")}`);
  });
}
```

## Testing

```bash
npm test                # Run all tests
npm run test:coverage   # With coverage report
```

## FAQ

**Q: Does Mantra Engine work offline?**  
A: Yes! The core parsing (`parseTextToIntents`) works entirely offline. The optional WebSocket client needs a network connection to `mantra-remote-script`, but you can use the parser standalone.

**Q: Can I use it without Ableton Live?**  
A: Yes! Mantra Engine produces standardized MIP intents that any host (DAW, synthesizer, etc.) can consume. See [musical-intent-protocol](https://github.com/jbflow/musical-intent-protocol) for the full spec.

**Q: How do I add custom commands?**  
A: Mantra Engine uses a rule-based NLP parser. For now, custom domains/actions require modifying the parser source. Future versions may support plugins.

**Q: What about speech recognition?**  
A: Speech recognition is out of scope for Mantra Engine. Use external speech-to-text services and feed the text output into `parseTextToIntents()`.

## Next Steps

- [Explore the full domain list](./Architecture.md)
- [Set up Ableton Live integration](../mantra-remote-script/)
- [Browse the frontend application](../mantra-fe/)
- [Read the Musical Intent Protocol spec](https://github.com/jbflow/musical-intent-protocol)

## Support

For issues and questions:
- 📖 Check the [Architecture documentation](./Architecture.md)
- 🐛 File issues on GitHub
- 💬 See the project README for community channels
