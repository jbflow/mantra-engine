import {
  IntentSchema,
  type Domain,
  type Intent,
  type Role,
  type TargetRef
} from "mantra-intent-protocol";

export type ParseResult = {
  intents: Intent[];
  errors?: string[];
};

const roleValues: Role[] = [
  "drums",
  "percussion",
  "kick",
  "snare",
  "clap",
  "hihat",
  "toms",
  "cymbals",
  "bass",
  "subbass",
  "lead",
  "pad",
  "arp",
  "pluck",
  "keys",
  "piano",
  "organ",
  "synth",
  "guitar",
  "acoustic_guitar",
  "electric_guitar",
  "strings",
  "brass",
  "woodwinds",
  "orchestra",
  "vocal",
  "lead_vocal",
  "backing_vocal",
  "choir",
  "fx",
  "riser",
  "impact",
  "sweep",
  "texture",
  "atmosphere",
  "ambience",
  "noise",
  "master",
  "group",
  "bus",
  "reference"
];

const roleDetailValues = ["kick", "snare", "hihat", "toms", "cymbals"] as const;

const scaleValues = [
  "major",
  "minor",
  "harmonic_minor",
  "melodic_minor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
  "pentatonic_major",
  "pentatonic_minor",
  "blues",
  "chromatic",
  "whole_tone",
  "diminished"
] as const;

type ScaleType = (typeof scaleValues)[number];

const timbreAttributes = [
  "warmth",
  "brightness",
  "punch",
  "width",
  "distance",
  "space",
  "energy",
  "tightness"
] as const;

const timbreAdjectives: Record<string, typeof timbreAttributes[number]> = {
  warm: "warmth",
  warmer: "warmth",
  warmth: "warmth",
  bright: "brightness",
  brighter: "brightness",
  brightness: "brightness",
  punchy: "punch",
  punchier: "punch",
  punch: "punch",
  wide: "width",
  wider: "width",
  width: "width",
  distant: "distance",
  farther: "distance",
  distance: "distance",
  spacey: "space",
  spacious: "space",
  space: "space",
  energetic: "energy",
  energy: "energy",
  tight: "tightness",
  tighter: "tightness",
  tightness: "tightness"
};

const grooveValues = ["straight", "swing", "shuffle", "triplet", "dotted"] as const;

const subdivisions = [
  "1/1",
  "1/2",
  "1/4",
  "1/8",
  "1/16",
  "1/32",
  "1/8T",
  "1/16T"
] as const;

type Clause = { raw: string; normalized: string };

const splitClauses = (text: string): Clause[] =>
  text
    .split(/(?:\.|\n|;|\band\b|\bthen\b)/gi)
    .map((raw) => ({ raw, normalized: raw.trim().toLowerCase() }))
    .filter((clause) => clause.normalized.length > 0);

const parseTarget = (clause: Clause): TargetRef | undefined => {
  const target: TargetRef = {};
  const trackMatch = clause.raw.match(/track\s+"?([\w\s_-]+)"?/i);
  if (trackMatch) {
    target.track_name = trackMatch[1].trim();
  }

  const role = roleValues.find((value) => clause.normalized.includes(value));
  if (role) {
    target.role = role;
  }

  const detail = roleDetailValues.find((value) => clause.normalized.includes(value));
  if (detail) {
    target.role_detail = detail;
  }

  return Object.keys(target).length > 0 ? target : undefined;
};

const parseNumber = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseTransport = (clause: Clause): Intent | null => {
  if (/\bplay\b/.test(clause.normalized)) {
    return { domain: "transport", intent: { action: "play" } };
  }
  if (/\bstop\b/.test(clause.normalized)) {
    return { domain: "transport", intent: { action: "stop" } };
  }
  if (/\btoggle record\b/.test(clause.normalized)) {
    return { domain: "transport", intent: { action: "toggle_record" } };
  }
  if (/\brecord\b/.test(clause.normalized)) {
    return { domain: "transport", intent: { action: "record" } };
  }
  if (/metronome\s+on/.test(clause.normalized)) {
    return { domain: "transport", intent: { action: "metronome_on" } };
  }
  if (/metronome\s+off/.test(clause.normalized)) {
    return { domain: "transport", intent: { action: "metronome_off" } };
  }
  if (/\bloop\s+on\b/.test(clause.normalized)) {
    return { domain: "transport", intent: { action: "loop_on" } };
  }
  if (/\bloop\s+off\b/.test(clause.normalized)) {
    return { domain: "transport", intent: { action: "loop_off" } };
  }
  const setLoop = clause.normalized.match(/loop\s+from\s+(\d+)\s+bars?\s+(?:for|length)\s+(\d+)\s+bars?/);
  if (setLoop) {
    return {
      domain: "transport",
      intent: { action: "set_loop", startBars: Number(setLoop[1]), lengthBars: Number(setLoop[2]) }
    };
  }
  const tempoMatch = clause.normalized.match(/(?:tempo|bpm)\s*(?:to|=)?\s*(\d{2,3})/);
  if (tempoMatch) {
    return { domain: "transport", intent: { action: "set_tempo", bpm: Number(tempoMatch[1]) } };
  }
  const timeSigMatch = clause.normalized.match(/time\s*signature\s*(\d+)\s*\/\s*(\d+)/);
  if (timeSigMatch) {
    return {
      domain: "transport",
      intent: {
        action: "set_time_signature",
        numerator: Number(timeSigMatch[1]),
        denominator: Number(timeSigMatch[2])
      }
    };
  }
  const locateBars = clause.normalized.match(/locate\s+(\d+)\s+bars?(?:\s+(\d+)\s+beats?)?/);
  if (locateBars) {
    return {
      domain: "transport",
      intent: {
        action: "locate",
        bars: Number(locateBars[1]),
        beats: locateBars[2] ? Number(locateBars[2]) : undefined
      }
    };
  }
  const locateTimecode = clause.normalized.match(/locate\s+(\d{1,2}:\d{2}:\d{2}(?:\.\d+)?)/);
  if (locateTimecode) {
    return { domain: "transport", intent: { action: "locate", timecode: locateTimecode[1] } };
  }
  return null;
};

const parseStructure = (clause: Clause): Intent | null => {
  const target = parseTarget(clause);
  const createTrack = clause.normalized.match(/create\s+track(?:\s+(\w+))?(?:\s+(audio|midi))?/);
  if (createTrack) {
    const role = (createTrack[1] ?? "drums") as Role;
    const type = createTrack[2] as "audio" | "midi" | undefined;
    return { domain: "structure", intent: { action: "create_track", role, type } };
  }
  if (/select\s+track/.test(clause.normalized) && target) {
    return { domain: "structure", intent: { action: "select_track", target } };
  }
  if (/arm\s+track/.test(clause.normalized) && target) {
    return { domain: "structure", intent: { action: "arm_track", target } };
  }
  if (/disarm\s+track/.test(clause.normalized) && target) {
    return { domain: "structure", intent: { action: "disarm_track", target } };
  }
  if (/\bmute\b/.test(clause.normalized) && target) {
    return { domain: "structure", intent: { action: "mute", target } };
  }
  if (/\bunmute\b/.test(clause.normalized) && target) {
    return { domain: "structure", intent: { action: "unmute", target } };
  }
  if (/\bsolo\b/.test(clause.normalized) && target) {
    return { domain: "structure", intent: { action: "solo", target } };
  }
  if (/\bunsolo\b/.test(clause.normalized) && target) {
    return { domain: "structure", intent: { action: "unsolo", target } };
  }
  const loadDevice = clause.raw.match(/load\s+device\s+"?([\w\s_-]+)"?(?:\s+(instrument|effect))?/i);
  if (loadDevice && target) {
    return {
      domain: "structure",
      intent: {
        action: "load_device",
        target,
        device: loadDevice[1].trim(),
        kind: (loadDevice[2] as "instrument" | "effect" | undefined) ?? "effect"
      }
    };
  }
  return null;
};

const parseMusic = (clause: Clause): Intent | null => {
  const target = parseTarget(clause);
  const quantize = clause.normalized.match(/quantize(?:\s+.*)?(?:\s+(?:strength|amount)?\s*(0(?:\.\d+)?|1(?:\.0+)?))?/);
  if (quantize && target) {
    const strength = parseNumber(quantize[1]) ?? 0.8;
    return { domain: "music", intent: { action: "quantize", target, strength } };
  }
  const transpose = clause.normalized.match(/transpose(?:\s+.*)?\s+(?:by\s+)?(-?\d+)/);
  if (transpose && target) {
    return { domain: "music", intent: { action: "transpose", target, semitones: Number(transpose[1]) } };
  }
  const keySig = clause.normalized.match(/key\s+signature\s+([a-g](?:#|b)?)(?:\s+(major|minor))?/);
  if (keySig) {
    return {
      domain: "music",
      intent: {
        action: "set_key_signature",
        key: keySig[1].toUpperCase(),
        scale: (keySig[2] as "major" | "minor") ?? "major"
      }
    };
  }
  return null;
};

const parseHarmony = (clause: Clause): Intent | null => {
  const target = parseTarget(clause);
  const setKey = clause.normalized.match(/set\s+key\s+([a-g](?:#|b)?)(?:\s+([a-z_]+))?/);
  if (setKey) {
    const scale = (setKey[2] as ScaleType | undefined) ?? "major";
    const scaleValue = scaleValues.includes(scale) ? scale : "major";
    return {
      domain: "harmony",
      intent: { action: "set_key", tonic: setKey[1].toUpperCase(), scale: scaleValue }
    };
  }
  const setChord = clause.raw.match(/set\s+chord\s+"?([\w#b\/\s]+)"?/i);
  if (setChord) {
    return {
      domain: "harmony",
      intent: { action: "set_chord", chord: setChord[1].trim(), target }
    };
  }
  const progression = clause.raw.match(/chord\s+progression\s+"?([\w\s,]+)"?/i);
  if (progression) {
    const progressionList = progression[1]
      .split(/[,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    return {
      domain: "harmony",
      intent: {
        action: "set_chord_progression",
        progression: progressionList,
        notation: "symbols",
        target
      }
    };
  }
  const pitchRange = clause.normalized.match(/pitch\s+range\s+([a-g][#b]?[0-9])\s+to\s+([a-g][#b]?[0-9])/);
  if (pitchRange) {
    return {
      domain: "harmony",
      intent: {
        action: "set_pitch_range",
        low: pitchRange[1].toUpperCase(),
        high: pitchRange[2].toUpperCase(),
        target
      }
    };
  }
  return null;
};

const parseRhythm = (clause: Clause): Intent | null => {
  const target = parseTarget(clause);
  const groove = clause.normalized.match(/groove\s+(straight|swing|shuffle|triplet|dotted)/);
  if (groove) {
    return { domain: "rhythm", intent: { action: "set_groove", groove: groove[1] as any, target } };
  }
  const swing = clause.normalized.match(/swing\s*(?:to|=)?\s*(0(?:\.\d+)?|1(?:\.0+)?)/);
  if (swing) {
    return { domain: "rhythm", intent: { action: "set_swing", amount: Number(swing[1]), target } };
  }
  const subdivision = clause.normalized.match(/subdivision\s*(1\/\d+|1\/8t|1\/16t)/);
  if (subdivision) {
    const value = subdivision[1].toUpperCase();
    const normalized = value === "1/8T" || value === "1/16T" ? value : value;
    if (subdivisions.includes(normalized as any)) {
      return { domain: "rhythm", intent: { action: "set_subdivision", subdivision: normalized as any, target } };
    }
  }
  const pattern = clause.raw.match(/rhythm\s+pattern\s+"?([\w\s_-]+)"?/i);
  if (pattern) {
    return { domain: "rhythm", intent: { action: "set_rhythm_pattern", pattern: pattern[1].trim(), target } };
  }
  const density = clause.normalized.match(/density\s*(0(?:\.\d+)?|1(?:\.0+)?)/);
  if (density) {
    return { domain: "rhythm", intent: { action: "set_density", density: Number(density[1]), target } };
  }
  const humanize = clause.normalized.match(/humanize\s+timing\s*(0(?:\.\d+)?|1(?:\.0+)?)/);
  if (humanize) {
    return { domain: "rhythm", intent: { action: "humanize_timing", amount: Number(humanize[1]), target } };
  }
  return null;
};

const parsePerformance = (clause: Clause): Intent | null => {
  const target = parseTarget(clause);
  const scene = clause.raw.match(/trigger\s+scene\s+"?([\w\s_-]+)"?/i);
  if (scene) {
    return { domain: "performance", intent: { action: "trigger_scene", scene_name: scene[1].trim() } };
  }
  const clip = clause.raw.match(/trigger\s+clip\s+"?([\w\s_-]+)"?/i);
  if (clip && target) {
    return {
      domain: "performance",
      intent: { action: "trigger_clip", clip_name: clip[1].trim(), target }
    };
  }
  return null;
};

const parseTimbre = (clause: Clause): Intent | null => {
  const target = parseTarget(clause);
  const adjectiveMatches = Object.keys(timbreAdjectives).filter((key) =>
    clause.normalized.includes(key)
  );
  const attributeMatches = timbreAttributes.filter((attr) => clause.normalized.includes(attr));
  const mappedAttributes = adjectiveMatches.map((key) => timbreAdjectives[key]);
  const allAttributes = [...new Set([...attributeMatches, ...mappedAttributes])];

  if (allAttributes.length === 0) return null;

  const amountMatch = clause.normalized.match(/(-?\d+(?:\.\d+)?)/);
  const amountValue = parseNumber(amountMatch?.[1]) ?? 0.2;
  const direction =
    /\b(less|decrease|reduce|lower|quieter)\b/.test(clause.normalized) ? -1 : 1;
  const moreLessBoost = /\bmore\b/.test(clause.normalized) ? 0.35 : 0.2;
  const inferredAmount = amountMatch ? amountValue : moreLessBoost;

  if (allAttributes.length === 1) {
    return {
      domain: "timbre",
      intent: {
        action: "adjust",
        target,
        attribute: allAttributes[0],
        amount: inferredAmount * direction
      }
    };
  }

  return {
    domain: "timbre",
    intent: {
      action: "adjust_many",
      target,
      changes: allAttributes.map((attribute) => ({ attribute, amount: inferredAmount * direction }))
    }
  };
};

const parseClause = (clause: Clause): Intent | null =>
  parseTransport(clause) ||
  parseStructure(clause) ||
  parseMusic(clause) ||
  parseHarmony(clause) ||
  parseRhythm(clause) ||
  parsePerformance(clause) ||
  parseTimbre(clause);

export const parseTextToIntents = (text: string): ParseResult => {
  const intents: Intent[] = [];
  const errors: string[] = [];

  for (const clause of splitClauses(text)) {
    const parsed = parseClause(clause);
    if (!parsed) {
      errors.push(`Unrecognized intent: "${clause.raw.trim()}"`);
      continue;
    }

    const validation = IntentSchema.safeParse(parsed);
    if (!validation.success) {
      errors.push(`Invalid intent from clause: "${clause.raw.trim()}"`);
      continue;
    }

    intents.push(validation.data);
  }

  return {
    intents,
    errors: errors.length ? errors : undefined
  };
};

export const supportedDomains: Domain[] = [
  "transport",
  "structure",
  "music",
  "harmony",
  "rhythm",
  "performance",
  "timbre"
];
