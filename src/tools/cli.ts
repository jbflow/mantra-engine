import readline from "node:readline";
import { parseTextToIntents } from "../nlp/intentParser.js";
import { validateAndNormalize } from "../core/validator.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "mantra> "
});

const printJson = (label: string, value: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`\n${label}:`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(value, null, 2));
};

const showHelp = () => {
  // eslint-disable-next-line no-console
  console.log("\nCommands:");
  // eslint-disable-next-line no-console
  console.log("  help            Show this help");
  // eslint-disable-next-line no-console
  console.log("  exit | quit     Leave the CLI");
  // eslint-disable-next-line no-console
  console.log("  Any other text  Parsed as natural-language intent\n");
};

const handleLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }
  if (trimmed === "help") {
    showHelp();
    rl.prompt();
    return;
  }
  if (trimmed === "exit" || trimmed === "quit") {
    rl.close();
    return;
  }

  const parsed = parseTextToIntents(trimmed);
  if (parsed.errors?.length) {
    printJson("parseErrors", parsed.errors);
  }
  if (parsed.intents.length === 0) {
    rl.prompt();
    return;
  }

  printJson("intents", parsed.intents);

  const validated = validateAndNormalize(parsed.intents, "cli");
  if (validated.issues?.length) {
    printJson("validationIssues", validated.issues);
  } else {
    printJson("envelopes", validated.envelopes);
  }

  rl.prompt();
};

// eslint-disable-next-line no-console
console.log("Mantra Engine Offline CLI. Type 'help' for commands.");
rl.prompt();
rl.on("line", handleLine);
rl.on("close", () => {
  // eslint-disable-next-line no-console
  console.log("\nBye.");
  process.exit(0);
});
