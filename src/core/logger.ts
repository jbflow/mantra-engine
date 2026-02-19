export type LogEvent = {
  type: "inbound" | "dispatch" | "result" | "warn" | "error";
  timestamp: string;
  data: unknown;
};

export const writeLog = (event: LogEvent) => {
  // Browser-friendly log: emit to console.
  // Consumers can override by wrapping this module.
  // eslint-disable-next-line no-console
  console.info(JSON.stringify(event));
};
