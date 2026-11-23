import { AbletonJsAdapter } from "../adapters/abletonjs-adapter.js";
import { AbletonJsBridge } from "../server/abletonjs-bridge.js";
import type { Intent } from "musical-intent-protocol";

/**
 * Example: Translating MIP intents to ableton-js commands
 *
 * This demonstrates the adapter in action without needing a full server setup.
 */

async function exampleAdapter() {
  console.log("=== AbletonJS Adapter Example ===\n");

  const adapter = new AbletonJsAdapter();

  // Example 1: Play command
  const playIntent: Intent = {
    domain: "transport",
    intent: { action: "play" },
  };

  const playEnvelopes = adapter.translate(playIntent);
  console.log("1. Play Intent:");
  console.log("   Input:", JSON.stringify(playIntent));
  console.log("   Output:", JSON.stringify(playEnvelopes, null, 2));

  // Example 2: Stop command
  const stopIntent: Intent = {
    domain: "transport",
    intent: { action: "stop" },
  };

  const stopEnvelopes = adapter.translate(stopIntent);
  console.log("\n2. Stop Intent:");
  console.log("   Input:", JSON.stringify(stopIntent));
  console.log("   Output:", JSON.stringify(stopEnvelopes, null, 2));

  // Example 3: Set Tempo
  const tempoIntent: Intent = {
    domain: "transport",
    intent: { action: "set_tempo", bpm: 120 },
  };

  const tempoEnvelopes = adapter.translate(tempoIntent);
  console.log("\n3. Set Tempo Intent:");
  console.log("   Input:", JSON.stringify(tempoIntent));
  console.log("   Output:", JSON.stringify(tempoEnvelopes, null, 2));

  // Example 4: Mute Track
  const muteIntent: Intent = {
    domain: "structure",
    intent: {
      action: "mute",
      target: { track_id: "0" },
    },
  };

  const muteEnvelopes = adapter.translate(muteIntent);
  console.log("\n4. Mute Track Intent:");
  console.log("   Input:", JSON.stringify(muteIntent));
  console.log("   Output:", JSON.stringify(muteEnvelopes, null, 2));

  // Example 5: Multiple intents
  const multipleIntents: Intent[] = [
    { domain: "transport", intent: { action: "play" } },
    { domain: "transport", intent: { action: "set_tempo", bpm: 128 } },
  ];

  const multiEnvelopes = adapter.translate(multipleIntents);
  console.log("\n5. Multiple Intents:");
  console.log("   Input:", JSON.stringify(multipleIntents));
  console.log("   Output:", JSON.stringify(multiEnvelopes, null, 2));
}

/**
 * Example: Full bridge integration
 *
 * This shows how the bridge connects mantra-engine to ableton-js.
 * Note: Requires ableton-js server running on port 39019
 */

async function exampleBridge() {
  console.log("\n=== AbletonJS Bridge Example ===\n");

  const bridge = new AbletonJsBridge({
    abletonJsHost: "127.0.0.1",
    abletonJsPort: 39019,
    logger: {
      log: (msg) => console.log(`[Bridge] ${msg}`),
      error: (msg) => console.error(`[Bridge Error] ${msg}`),
      warn: (msg) => console.warn(`[Bridge Warn] ${msg}`),
    },
  });

  try {
    console.log("Starting bridge...");
    await bridge.start();

    // Send a play intent
    const playIntent: Intent = {
      domain: "transport",
      intent: { action: "play" },
    };

    console.log("Sending play intent...");
    await bridge.processIntent(playIntent);

    // Keep connection open for a moment to see responses
    await new Promise((resolve) => setTimeout(resolve, 1000));

    bridge.disconnect();
    console.log("Bridge disconnected");
  } catch (error) {
    console.error("Bridge error:", error);
  }
}

// Run examples
(async () => {
  await exampleAdapter();
  // Uncomment to test with actual ableton-js server:
  // await exampleBridge();
})().catch(console.error);
