import { WebSocket } from "ws";
import { AbletonJsAdapter } from "../adapters/abletonjs-adapter.js";
import type { Intent } from "musical-intent-protocol";
import type { ClientIntentMessage } from "./messageTypes.js";

type LogFn = (msg: string) => void;

export interface AbletonJsBridgeOptions {
  mantraEnginePort?: number;
  abletonJsHost?: string;
  abletonJsPort?: number;
  logger?: {
    log?: LogFn;
    error?: LogFn;
    warn?: LogFn;
  };
}

export class AbletonJsBridge {
  private mantraEnginePort: number;
  private abletonJsHost: string;
  private abletonJsPort: number;
  private adapter: AbletonJsAdapter;
  private abletonJsSocket?: WebSocket;
  private log: LogFn;
  private logError: LogFn;
  private logWarn: LogFn;

  constructor(options: AbletonJsBridgeOptions = {}) {
    this.mantraEnginePort = options.mantraEnginePort || 1978;
    this.abletonJsHost = options.abletonJsHost || "127.0.0.1";
    this.abletonJsPort = options.abletonJsPort || 39019;
    this.adapter = new AbletonJsAdapter();
    this.log = options.logger?.log || console.log;
    this.logError = options.logger?.error || console.error;
    this.logWarn = options.logger?.warn || console.warn;
  }

  async start(): Promise<void> {
    // Connect to ableton-js first
    await this.connectToAbletonJs();

    // Note: In production, the mantra-engine server listens on port 1978
    // This bridge would be started as part of that server or as a middleware
    // For now, we provide this as an adapter that can process intents
    this.log(
      `AbletonJS Bridge ready. Connected to ws://${this.abletonJsHost}:${this.abletonJsPort}`
    );
  }

  private connectToAbletonJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://${this.abletonJsHost}:${this.abletonJsPort}`;
      const ws = new WebSocket(url);

      ws.on("open", () => {
        this.abletonJsSocket = ws;
        this.log(`Connected to ableton-js at ${url}`);
        resolve();
      });

      ws.on("error", (error) => {
        this.logError(
          `Failed to connect to ableton-js: ${(error as Error).message}`
        );
        reject(error);
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.log(`Ableton response: ${JSON.stringify(message)}`);
        } catch {
          this.log(`Raw message from Ableton: ${data}`);
        }
      });

      ws.on("close", () => {
        this.logWarn("Disconnected from ableton-js");
        this.abletonJsSocket = undefined;
      });
    });
  }

  /**
   * Process an MIP intent and send it to ableton-js
   */
  async processIntent(intent: Intent | Intent[]): Promise<void> {
    if (!this.abletonJsSocket || this.abletonJsSocket.readyState !== WebSocket.OPEN) {
      this.logError("Not connected to ableton-js");
      return;
    }

    const envelopes = this.adapter.translate(intent);

    for (const envelope of envelopes) {
      this.log(
        `Sending to Ableton: ${JSON.stringify(envelope, null, 2)}`
      );
      this.abletonJsSocket.send(JSON.stringify(envelope));
    }
  }

  /**
   * Process a message received from mantra-engine WebSocket client
   */
  async processMessage(message: unknown): Promise<void> {
    const clientMessage = message as ClientIntentMessage;

    if (clientMessage.type === "intent") {
      this.log(
        `Received intent from client: ${JSON.stringify(clientMessage.payload)}`
      );
      await this.processIntent(clientMessage.payload);
    }
  }

  disconnect(): void {
    if (this.abletonJsSocket) {
      this.abletonJsSocket.close();
    }
  }
}
