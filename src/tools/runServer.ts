import { config } from "../config.js";
import { startWsServer } from "../server/wsServer.js";

const url = new URL(config.wsUrl);
const port = Number(url.port || 1978);

startWsServer(port);
// eslint-disable-next-line no-console
console.log(`Mantra Engine server listening on ${url.protocol}//${url.hostname}:${port}`);
