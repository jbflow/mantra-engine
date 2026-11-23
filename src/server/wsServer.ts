import WebSocket, { WebSocketServer } from "ws";
import { validateAndNormalize } from "../core/validator.js";
import type {
	ClientAckMessage,
	ClientErrorMessage,
	ClientIntentMessage,
	ClientMessage,
	ClientResultMessage
} from "./messageTypes.js";
import type { MidiActionPayload } from "./messageTypes.js";
import type { AbletonJsBridge } from "./abletonjs-bridge.js";

type InterpreterConnection = {
	socket: WebSocket;
	capabilities?: unknown;
};

const parseJson = (data: WebSocket.RawData): unknown => {
	try {
		return JSON.parse(data.toString());
	} catch {
		return undefined;
	}
};

const sendJson = (socket: WebSocket, payload: unknown) => {
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify(payload));
	}
};

const isMidiActionPayload = (payload: unknown): payload is MidiActionPayload => {
	if (!payload || typeof payload !== "object") return false;
	const action = payload as Partial<MidiActionPayload>;
	return (
		typeof action.port === "string" &&
		["note_on", "note_off", "control_change", "program_change"].includes(action.message ?? "") &&
		numberInRange(action.channel, 1, 16) &&
		numberInRange(action.data, 0, 127) &&
		numberInRange(action.value, 0, 127)
	);
};

const numberInRange = (value: unknown, min: number, max: number): value is number =>
	typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

export interface WsServerOptions {
	abletonJsBridge?: AbletonJsBridge;
}

export const startWsServer = (port: number, options?: WsServerOptions) => {
	const wss = new WebSocketServer({ port });
	let interpreter: InterpreterConnection | null = null;
	const clients = new Set<WebSocket>();
	const abletonJsBridge = options?.abletonJsBridge;

	const broadcastToClients = (payload: ClientAckMessage | ClientErrorMessage | ClientResultMessage) => {
		for (const client of clients) {
			sendJson(client, payload);
		}
	};

	wss.on("connection", (socket, request) => {
		const path = request.url || "/";
		const isInterpreter = path.startsWith("/interpreter");

		if (isInterpreter) {
			interpreter = { socket };
			socket.on("message", (data) => {
				const message = parseJson(data);
				if (!message || typeof message !== "object") {
					return;
				}
				const type = (message as { type?: string }).type;
				if (type === "register") {
					interpreter = { socket, capabilities: message };
					sendJson(socket, { type: "ack", ids: [], status: "accepted" });
					return;
				}
				if (type === "result") {
					broadcastToClients(message as ClientResultMessage);
				}
			});

			socket.on("close", () => {
				if (interpreter?.socket === socket) {
					interpreter = null;
				}
			});
			return;
		}

		clients.add(socket);
		socket.on("message", async (data) => {
			const message = parseJson(data) as ClientMessage | undefined;
			if (!message) {
				sendJson(socket, {
					type: "error",
					code: "BAD_REQUEST",
					message: "Invalid JSON"
				} satisfies ClientErrorMessage);
				return;
			}

			if (message.type === "ping") {
				sendJson(socket, { type: "pong" });
				return;
			}

			if (message.type === "midi") {
				if (!isMidiActionPayload(message.payload)) {
					sendJson(socket, {
						type: "error",
						code: "VALIDATION_ERROR",
						message: "MIDI action validation failed"
					} satisfies ClientErrorMessage);
					return;
				}
				if (!interpreter) {
					sendJson(socket, {
						type: "error",
						code: "INTERNAL_ERROR",
						message: "No interpreter connected"
					} satisfies ClientErrorMessage);
					return;
				}

				const id = globalThis.crypto.randomUUID();
				sendJson(interpreter.socket, { type: "midi", id, payload: message.payload });
				sendJson(socket, { type: "ack", ids: [id], status: "accepted" } satisfies ClientAckMessage);
				return;
			}

			if (message.type !== "intent") {
				sendJson(socket, {
					type: "error",
					code: "BAD_REQUEST",
					message: "Unsupported message type"
				} satisfies ClientErrorMessage);
				return;
			}

			if (!interpreter) {
				sendJson(socket, {
					type: "error",
					code: "INTERNAL_ERROR",
					message: "No interpreter connected"
				} satisfies ClientErrorMessage);
				return;
			}

			const payload = message.payload;
			const { envelopes, issues } = validateAndNormalize(payload, message.source);
			if (issues?.length) {
				sendJson(socket, {
					type: "error",
					code: "VALIDATION_ERROR",
					message: "Intent validation failed",
					issues
				} satisfies ClientErrorMessage);
				return;
			}

			// Forward to ableton-js bridge if available
			if (abletonJsBridge) {
				try {
					await abletonJsBridge.processIntent(payload);
				} catch (err) {
					console.error("Error forwarding to ableton-js:", err);
				}
			}

			const ids: string[] = [];
			for (const envelope of envelopes) {
				ids.push(envelope.id);
				sendJson(interpreter.socket, { type: "dispatch", payload: envelope });
			}

			sendJson(socket, { type: "ack", ids, status: "accepted" } satisfies ClientAckMessage);
		});

		socket.on("close", () => {
			clients.delete(socket);
		});
	});

	return wss;
};
