import type { Intent, Source } from "musical-intent-protocol";

export type ClientIntentMessage = {
  type: "intent";
  payload: Intent | Intent[];
  source?: Source;
};

export type ClientPingMessage = { type: "ping" };

export type MidiActionPayload = {
  port: string;
  message: "note_on" | "note_off" | "control_change" | "program_change";
  channel: number;
  data: number;
  value: number;
};

export type ClientMidiActionMessage = {
  type: "midi";
  payload: MidiActionPayload;
};

export type ClientMessage = ClientIntentMessage | ClientMidiActionMessage | ClientPingMessage;

export type ClientAckMessage = {
  type: "ack";
  ids: string[];
  status?: "accepted";
};

export type ClientErrorMessage = {
  type: "error";
  code: "VALIDATION_ERROR" | "BAD_REQUEST" | "INTERNAL_ERROR";
  message: string;
  issues?: unknown[];
};

export type ClientResultMessage = {
  type: "result";
  id: string;
  status: "ok" | "error";
  details?: unknown;
};

export type EnginePongMessage = { type: "pong" };
