import assert from "node:assert/strict";
import test from "node:test";
import { AbletonJsAdapter } from "../src/adapters/abletonjs-adapter.js";
import type { Intent } from "musical-intent-protocol";

test("AbletonJsAdapter - Transport domain", async (t) => {
  const adapter = new AbletonJsAdapter();

  await t.test("translates play intent", () => {
    const intent: Intent = {
      domain: "transport",
      intent: { action: "play" },
    };
    const result = adapter.translate(intent);

    assert.equal(result.length, 1);
    assert.equal(result[0].commands.length, 1);
    assert.deepEqual(result[0].commands[0], {
      ns: "song",
      name: "start_playing",
    });
  });

  await t.test("translates stop intent", () => {
    const intent: Intent = {
      domain: "transport",
      intent: { action: "stop" },
    };
    const result = adapter.translate(intent);

    assert.equal(result[0].commands[0].name, "stop_playing");
  });

  await t.test("translates set_tempo intent", () => {
    const intent: Intent = {
      domain: "transport",
      intent: { action: "set_tempo", bpm: 120 },
    };
    const result = adapter.translate(intent);

    assert.deepEqual(result[0].commands[0], {
      ns: "song",
      name: "set_prop",
      args: { prop: "tempo", value: 120 },
    });
  });
});

test("AbletonJsAdapter - Structure domain", async (t) => {
  const adapter = new AbletonJsAdapter();

  await t.test("translates mute intent", () => {
    const intent: Intent = {
      domain: "structure",
      intent: { action: "mute", target: { track_id: "0" } },
    };
    const result = adapter.translate(intent);

    assert.deepEqual(result[0].commands[0], {
      ns: "track",
      nsid: "0",
      name: "set_prop",
      args: { prop: "mute", value: 1 },
    });
  });

  await t.test("translates solo intent", () => {
    const intent: Intent = {
      domain: "structure",
      intent: { action: "solo", target: { track_id: "0" } },
    };
    const result = adapter.translate(intent);

    assert.deepEqual(result[0].commands[0], {
      ns: "track",
      nsid: "0",
      name: "set_prop",
      args: { prop: "solo", value: 1 },
    });
  });

  await t.test("translates select_track intent", () => {
    const intent: Intent = {
      domain: "structure",
      intent: { action: "select_track", target: { track_id: "2" } },
    };
    const result = adapter.translate(intent);

    assert.deepEqual(result[0].commands[0], {
      ns: "song",
      name: "set_prop",
      args: { prop: "selected_track", value: 2 },
    });
  });
});

test("AbletonJsAdapter - Performance domain", async (t) => {
  const adapter = new AbletonJsAdapter();

  await t.test("translates launch_clip intent", () => {
    const intent: Intent = {
      domain: "performance",
      intent: { action: "launch_clip", target: { clip_id: "0" } },
    };
    const result = adapter.translate(intent);

    assert.deepEqual(result[0].commands[0], {
      ns: "clip_slot",
      nsid: "0",
      name: "fire",
    });
  });

  await t.test("translates launch_scene intent", () => {
    const intent: Intent = {
      domain: "performance",
      intent: { action: "launch_scene", target: { scene_id: "1" } },
    };
    const result = adapter.translate(intent);

    assert.deepEqual(result[0].commands[0], {
      ns: "scene",
      nsid: "1",
      name: "fire",
    });
  });
});

test("AbletonJsAdapter - Multiple intents", () => {
  const adapter = new AbletonJsAdapter();
  const intents: Intent[] = [
    { domain: "transport", intent: { action: "play" } },
    { domain: "transport", intent: { action: "set_tempo", bpm: 128 } },
  ];
  const result = adapter.translate(intents);

  assert.equal(result.length, 2);
  assert.equal(result[0].commands[0].name, "start_playing");
  assert.equal(result[1].commands[0].name, "set_prop");
});

test("AbletonJsAdapter - UUID generation", () => {
  const adapter = new AbletonJsAdapter();
  const intents: Intent[] = [
    { domain: "transport", intent: { action: "play" } },
    { domain: "transport", intent: { action: "stop" } },
  ];
  const result = adapter.translate(intents);

  assert.equal(result[0].uuid, "1");
  assert.equal(result[1].uuid, "2");
});
