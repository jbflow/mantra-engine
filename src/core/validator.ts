import {
  EnvelopeSchema,
  IntentSchema,
  makeEnvelope,
  type Envelope,
  type Intent,
  type Source
} from "mantra-intent-protocol";

export type ValidationResult = {
  envelopes: Envelope[];
  issues?: unknown[];
};

const customStructureActions = new Set(["rename_track", "delete_track", "duplicate_track"]);

const isCustomStructureIntent = (item: unknown): item is { domain: string; intent: { action: string } } => {
  if (!item || typeof item !== "object") return false;
  const candidate = item as { domain?: string; intent?: { action?: string } };
  if (candidate.domain !== "structure") return false;
  const action = candidate.intent?.action;
  return typeof action === "string" && customStructureActions.has(action);
};

const normalizeInput = (
  payload: Intent | Intent[] | Envelope | Envelope[]
): Array<Intent | Envelope> => (Array.isArray(payload) ? payload : [payload]);

export const validateAndNormalize = (
  payload: Intent | Intent[] | Envelope | Envelope[],
  source?: Source
): ValidationResult => {
  const items = normalizeInput(payload);
  const envelopes: Envelope[] = [];
  const issues: unknown[] = [];

  for (const item of items) {
    if (isCustomStructureIntent(item)) {
      const intent = item as Intent;
      envelopes.push(
        makeEnvelope({
          source: source ?? "api",
          domain: intent.domain,
          intent: intent.intent
        })
      );
      continue;
    }

    const envelopeParse = EnvelopeSchema.safeParse(item);
    if (envelopeParse.success) {
      envelopes.push(envelopeParse.data);
      continue;
    }

    const intentParse = IntentSchema.safeParse(item);
    if (intentParse.success) {
      const intent = intentParse.data;
      const domain = intent.domain;
      envelopes.push(
        makeEnvelope({
          source: source ?? "api",
          domain,
          intent: intent.intent
        })
      );
      continue;
    }

    issues.push({
      envelope: envelopeParse.error.issues,
      intent: intentParse.error.issues
    });
  }

  return { envelopes, issues: issues.length > 0 ? issues : undefined };
};
