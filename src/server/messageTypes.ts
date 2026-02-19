import type { Intent, Source } from "mantra-intent-protocol";

export type ClientIntentMessage = {
  type: "intent";
  payload: Intent | Intent[];
  source?: Source;
};

export type ClientPingMessage = { type: "ping" };

export type ClientMessage = ClientIntentMessage | ClientPingMessage;

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
