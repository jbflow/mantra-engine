import {
  IntentSchema,
  type Domain,
  type Intent,
  type PitchClass,
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

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16
};

const splitClauses = (text: string): Clause[] =>
  text
    .split(/(?:\.|\n|;|\band\b|\bthen\b)/gi)
    .map((raw) => ({ raw, normalized: raw.trim().toLowerCase() }))
    .filter((clause) => clause.normalized.length > 0);

const parseTarget = (clause: Clause): TargetRef | undefined => {
  const target: TargetRef = {};
  const trackMatch = clause.raw.match(
    /track\s+"?([\w\s_-]+?)"?(?:\s+(?:to|named|for|with|in|on)\b|$)/i
  );
  if (trackMatch) {
    const rawTrack = trackMatch[1].trim();
    const numeric = Number(rawTrack);
    if (Number.isFinite(numeric)) {
      target.track_name = String(numeric);
    } else if (numberWords[rawTrack.toLowerCase()]) {
      target.track_name = String(numberWords[rawTrack.toLowerCase()]);
    } else {
      target.track_name = rawTrack;
    }
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

const normalizePitchClass = (value?: string): PitchClass | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const letter = trimmed[0].toUpperCase();
  const accidental = trimmed.slice(1, 2);
  if (accidental === "#") return `${letter}#` as PitchClass;
  if (accidental === "b" || accidental === "B") return `${letter}b` as PitchClass;
  return letter as PitchClass;
};

const parseTrackIndex = (value?: string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return String(numeric);
  if (numberWords[normalized]) return String(numberWords[normalized]);
  return undefined;
};

const inferTargetFromIndex = (clause: Clause): TargetRef | undefined => {
  const indexMatch = clause.normalized.match(
    /(?:track\s*)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)/
  );
  const index = parseTrackIndex(indexMatch?.[1]);
  return index ? { track_name: index } : undefined;
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
  const target = parseTarget(clause) ?? inferTargetFromIndex(clause);
  const createTrackTrailingRole = clause.normalized.match(
    /(?:create|add|new)\s+(?:(?:a|an)\s+)?(?:(audio|midi)\s+)?track(?:\s+(?:for|named)?\s*"?([\w\s_-]+)"?)?/
  );
  const createTrackLeadingRole = clause.normalized.match(
    /(?:create|add|new)\s+(?:(?:a|an)\s+)?(?:(audio|midi)\s+)?([\w_-]+)\s+track/
  );
  const createTrackMatch = createTrackTrailingRole ?? createTrackLeadingRole;
  if (createTrackMatch) {
    const inferredRole = roleValues.find((value) => clause.normalized.includes(value)) ?? "drums";
    const rawRole = (createTrackMatch[2] ?? "").trim().toLowerCase();
    const role = (roleValues.includes(rawRole as Role) ? rawRole : inferredRole) as Role;
    const type = createTrackMatch[1] as "audio" | "midi" | undefined;
    return { domain: "structure", intent: { action: "create_track", role, type } };
  }

  const resolvedTarget = target ?? {};
  if (/select\s+track|select\s+\w+/.test(clause.normalized)) {
    return { domain: "structure", intent: { action: "select_track", target: resolvedTarget } };
  }
  if (/arm\s+track|arm\s+\w+/.test(clause.normalized)) {
    return { domain: "structure", intent: { action: "arm_track", target: resolvedTarget } };
  }
  if (/disarm\s+track|disarm\s+\w+/.test(clause.normalized)) {
    return { domain: "structure", intent: { action: "disarm_track", target: resolvedTarget } };
  }
  if (/\bmute\b/.test(clause.normalized)) {
    return { domain: "structure", intent: { action: "mute", target: resolvedTarget } };
  }
  if (/\b(unmute|un-mute|unumute)\b/.test(clause.normalized)) {
    return { domain: "structure", intent: { action: "unmute", target: resolvedTarget } };
  }
  if (/\bsolo\b/.test(clause.normalized)) {
    return { domain: "structure", intent: { action: "solo", target: resolvedTarget } };
  }
  if (/\b(unsolo|un-solo)\b/.test(clause.normalized)) {
    return { domain: "structure", intent: { action: "unsolo", target: resolvedTarget } };
  }

  const renameMatch = clause.raw.match(
    /(?:rename|name)\s+track\s+"?([\w\s_-]+?)"?\s+to\s+"?([\w\s_-]+?)"?$/i
  );
  if (renameMatch) {
    const trackRef = parseTrackIndex(renameMatch[1]) ?? renameMatch[1].trim();
    const renameTarget = trackRef ? { track_name: String(trackRef) } : resolvedTarget;
    return {
      domain: "structure",
      intent: { action: "rename_track", target: renameTarget, name: renameMatch[2].trim() }
    };
  }

  const deleteMatch = clause.raw.match(/(?:delete|remove)\s+track\s+"?([\w\s_-]+)"?$/i);
  if (deleteMatch) {
    const trackRef = parseTrackIndex(deleteMatch[1]) ?? deleteMatch[1].trim();
    const deleteTarget = trackRef ? { track_name: String(trackRef) } : resolvedTarget;
    return { domain: "structure", intent: { action: "remove_track", target: deleteTarget } };
  }

  const duplicateMatch = clause.raw.match(/duplicate\s+track\s+"?([\w\s_-]+)"?$/i);
  if (duplicateMatch) {
    const trackRef = parseTrackIndex(duplicateMatch[1]) ?? duplicateMatch[1].trim();
    const duplicateTarget = trackRef ? { track_name: String(trackRef) } : resolvedTarget;
    return { domain: "structure", intent: { action: "duplicate_track", target: duplicateTarget } };
  }

  const loadDevice = clause.raw.match(
    /(?:load|add|insert)\s+(?:device\s+)?"?([\w\s_-]+?)"?(?:\s+on\s+track\s+[\w\s_-]+)?(?:\s+(instrument|effect))?/i
  );
  if (loadDevice) {
    const rawDevice = loadDevice[1].trim();
    const explicitKind = loadDevice[2] as "instrument" | "effect" | undefined;
    const inferredKind = /\b(instrument|synth|piano|keys|organ|drum|drums|kit|bass|guitar)\b/i.test(rawDevice)
      ? "instrument"
      : "effect";
    return {
      domain: "structure",
      intent: {
        action: "load_device",
        target: resolvedTarget,
        device: rawDevice,
        kind: explicitKind ?? inferredKind
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
    const tonic = normalizePitchClass(setKey[1]);
    if (!tonic) return null;
    return {
      domain: "harmony",
      intent: { action: "set_key", tonic, scale: scaleValue }
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
  "analysis",
  "pitch",
  "duration",
  "dynamics",
  "articulation",
  "instrumentation",
  "time_point",
  "timbre"
];
