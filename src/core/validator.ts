import {
  EnvelopeSchema,
  IntentSchema,
  makeEnvelope,
  type Envelope,
  type Intent,
  type Source
} from "musical-intent-protocol";

export type ValidationResult = {
  envelopes: Envelope[];
  issues?: unknown[];
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
