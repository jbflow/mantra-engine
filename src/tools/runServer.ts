import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "../config.js";
import { startWsServer } from "../server/wsServer.js";

export const startConfiguredServer = (wsUrl = config.wsUrl) => {
	const url = new URL(wsUrl);
	const port = Number(url.port || 1978);
	const server = startWsServer(port);
	// eslint-disable-next-line no-console
	console.log(`Mantra Engine server listening on ${url.protocol}//${url.hostname}:${port}`);
	return server;
};

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entrypoint === import.meta.url) {
	startConfiguredServer();
}
