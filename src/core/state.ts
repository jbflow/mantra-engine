import type { Domain, Role, TargetRef } from "mantra-intent-protocol";

export type SessionState = {
  lastTempo?: number;
  lastTimeSignature?: string;
  lastKey?: string;
  lastGroove?: string;
};

export type FocusState = {
  lastTarget?: TargetRef;
  lastRole?: Role;
  lastDomain?: Domain;
};

export type EngineState = {
  session: SessionState;
  focus: FocusState;
};

export const createInitialState = (): EngineState => ({
  session: {},
  focus: {}
});
