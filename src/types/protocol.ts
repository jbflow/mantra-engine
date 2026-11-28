export type MidiActionPayload = {
  port: string;
  message: "note_on" | "note_off" | "control_change" | "program_change";
  channel: number;
  data: number;
  value: number;
};
