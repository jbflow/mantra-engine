import type { Intent, Source } from "musical-intent-protocol";
import { parseTextToIntents, type ParseResult } from "../nlp/intentParser.js";
import type {
  ClientAckMessage,
  ClientErrorMessage,
  ClientResultMessage,
  ClientIntentMessage,
  MidiActionPayload
} from "../server/messageTypes.js";

export type EngineHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onAck?: (message: ClientAckMessage) => void;
  onError?: (message: ClientErrorMessage) => void;
  onResult?: (message: ClientResultMessage) => void;
  onRawMessage?: (data: unknown) => void;
};

export type EngineOptions = {
  url: string;
  source?: Source;
  handlers?: EngineHandlers;
};

export class MantraEngine {
  private socket?: WebSocket;
  private url: string;
  private source?: Source;
  private handlers?: EngineHandlers;

  constructor(options: EngineOptions) {
    this.url = options.url;
    this.source = options.source;
    this.handlers = options.handlers;
  }

  connect(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.socket = ws;

      ws.addEventListener("open", () => {
        this.handlers?.onOpen?.();
        resolve();
      });

      ws.addEventListener("close", () => {
        this.handlers?.onClose?.();
      });

      ws.addEventListener("error", () => {
        reject(new Error("WebSocket connection error"));
      });

      ws.addEventListener("message", (event) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(event.data));
        } catch {
          this.handlers?.onRawMessage?.(event.data);
          return;
        }

        const message = parsed as ClientAckMessage | ClientErrorMessage | ClientResultMessage;
        this.handlers?.onRawMessage?.(message);

        if (message.type === "ack") {
          this.handlers?.onAck?.(message);
        } else if (message.type === "error") {
          this.handlers?.onError?.(message);
        } else if (message.type === "result") {
          this.handlers?.onResult?.(message);
        }
      });
    });
  }

  disconnect() {
    this.socket?.close();
  }

  sendIntents(intents: Intent | Intent[]) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message: ClientIntentMessage = {
      type: "intent",
      payload: intents,
      source: this.source
    };

    this.socket.send(JSON.stringify(message));
  }

  sendMidiAction(payload: MidiActionPayload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.socket.send(JSON.stringify({ type: "midi", payload }));
  }

  sendText(text: string): ParseResult {
    const parsed = parseTextToIntents(text);
    if (parsed.errors?.length) {
      return parsed;
    }

    if (parsed.intents.length) {
      this.sendIntents(parsed.intents);
    }

    return parsed;
  }
}
