import { parseTextToIntents, type ParseResult } from "../nlp/intentParser.js";

export class MantraEngine {
  parseText(text: string): ParseResult {
    return parseTextToIntents(text);
  }

  sendText(text: string): ParseResult {
    return this.parseText(text);
  }
}
