import type { Intent } from "musical-intent-protocol";

export interface AbletonCommand {
  ns: string;
  nsid?: string;
  name: string;
  args?: Record<string, any>;
}

export interface AbletonCommandEnvelope {
  uuid: string;
  commands: AbletonCommand[];
}

export class AbletonJsAdapter {
  private nextUuid = 0;

  private getNextUuid(): string {
    return String(++this.nextUuid);
  }

  /**
   * Translate an MIP intent (or array of intents) to ableton-js command envelopes.
   * Returns an array of envelopes, one per batch of related commands.
   */
  translate(intent: Intent | Intent[]): AbletonCommandEnvelope[] {
    const intents = Array.isArray(intent) ? intent : [intent];
    const envelopes: AbletonCommandEnvelope[] = [];

    for (const mipIntent of intents) {
      const commands = this.translateIntent(mipIntent);
      if (commands.length > 0) {
        envelopes.push({
          uuid: this.getNextUuid(),
          commands,
        });
      }
    }

    return envelopes;
  }

  private translateIntent(intent: Intent): AbletonCommand[] {
    switch (intent.domain) {
      case "transport":
        return this.translateTransport(intent.intent as any);
      case "structure":
        return this.translateStructure(intent.intent as any);
      case "performance":
        return this.translatePerformance(intent.intent as any);
      default:
        console.warn(`Unsupported domain: ${intent.domain}`);
        return [];
    }
  }

  private translateTransport(intent: any): AbletonCommand[] {
    switch (intent.action) {
      case "play":
        return [{ ns: "song", name: "start_playing" }];
      case "stop":
        return [{ ns: "song", name: "stop_playing" }];
      case "record":
        return [{ ns: "song", name: "record" }];
      case "set_tempo":
        return [
          {
            ns: "song",
            name: "set_prop",
            args: { prop: "tempo", value: intent.bpm },
          },
        ];
      case "metronome_on":
        return [
          {
            ns: "song",
            name: "set_prop",
            args: { prop: "metronome", value: 1 },
          },
        ];
      case "metronome_off":
        return [
          {
            ns: "song",
            name: "set_prop",
            args: { prop: "metronome", value: 0 },
          },
        ];
      case "loop_on":
        return [
          {
            ns: "song",
            name: "set_prop",
            args: { prop: "loop", value: 1 },
          },
        ];
      case "loop_off":
        return [
          {
            ns: "song",
            name: "set_prop",
            args: { prop: "loop", value: 0 },
          },
        ];
      default:
        return [];
    }
  }

  private translateStructure(intent: any): AbletonCommand[] {
    const target = intent.target || {};
    const trackIndex = this.resolveTrackIndex(target);

    switch (intent.action) {
      case "mute":
        if (trackIndex !== null) {
          return [
            {
              ns: "track",
              nsid: String(trackIndex),
              name: "set_prop",
              args: { prop: "mute", value: 1 },
            },
          ];
        }
        break;

      case "unmute":
        if (trackIndex !== null) {
          return [
            {
              ns: "track",
              nsid: String(trackIndex),
              name: "set_prop",
              args: { prop: "mute", value: 0 },
            },
          ];
        }
        break;

      case "solo":
        if (trackIndex !== null) {
          return [
            {
              ns: "track",
              nsid: String(trackIndex),
              name: "set_prop",
              args: { prop: "solo", value: 1 },
            },
          ];
        }
        break;

      case "unsolo":
        if (trackIndex !== null) {
          return [
            {
              ns: "track",
              nsid: String(trackIndex),
              name: "set_prop",
              args: { prop: "solo", value: 0 },
            },
          ];
        }
        break;

      case "select_track":
        if (trackIndex !== null) {
          return [
            {
              ns: "song",
              name: "set_prop",
              args: { prop: "selected_track", value: trackIndex },
            },
          ];
        }
        break;

      case "arm_track":
        if (trackIndex !== null) {
          return [
            {
              ns: "track",
              nsid: String(trackIndex),
              name: "set_prop",
              args: { prop: "arm", value: 1 },
            },
          ];
        }
        break;

      case "disarm_track":
        if (trackIndex !== null) {
          return [
            {
              ns: "track",
              nsid: String(trackIndex),
              name: "set_prop",
              args: { prop: "arm", value: 0 },
            },
          ];
        }
        break;

      default:
        return [];
    }
    return [];
  }

  private translatePerformance(intent: any): AbletonCommand[] {
    const target = intent.target || {};
    const clipIndex = this.resolveClipIndex(target);
    const sceneIndex = this.resolveSceneIndex(target);

    switch (intent.action) {
      case "launch_clip":
        if (clipIndex !== null) {
          return [
            {
              ns: "clip_slot",
              nsid: String(clipIndex),
              name: "fire",
            },
          ];
        }
        break;

      case "launch_scene":
        if (sceneIndex !== null) {
          return [
            {
              ns: "scene",
              nsid: String(sceneIndex),
              name: "fire",
            },
          ];
        }
        break;

      default:
        return [];
    }
    return [];
  }

  private resolveTrackIndex(target: any): number | null {
    // Simple resolution: if track_id is provided, use it
    if (target.track_id !== undefined) {
      return parseInt(target.track_id, 10);
    }
    // Could extend with role-based resolution later
    return null;
  }

  private resolveClipIndex(target: any): number | null {
    if (target.clip_id !== undefined) {
      return parseInt(target.clip_id, 10);
    }
    return null;
  }

  private resolveSceneIndex(target: any): number | null {
    if (target.scene_id !== undefined) {
      return parseInt(target.scene_id, 10);
    }
    return null;
  }
}
