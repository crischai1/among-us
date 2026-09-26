/** Simulation rate. Server and client step movement at exactly this rate. */
export const TICK_HZ = 30;
export const TICK_MS = 1000 / TICK_HZ;
export const DT = 1 / TICK_HZ;

export const PLAYER_RADIUS = 12;
/** World units per second at 1x player speed. */
export const BASE_SPEED = 150;
/** Vision radius in world units at 1x vision. */
export const VISION_BASE = 280;
/** Lights sabotage shrinks crew vision to this fraction over LIGHTS_FADE_MS. */
export const LIGHTS_VISION_FACTOR = 0.25;
export const LIGHTS_FADE_MS = 1500;

export const USE_RANGE = 60;
/** Polus doors can be opened from a little further away: they're wide. */
export const DOOR_USE_RANGE = 80;
export const BUTTON_RANGE = 105;
export const REPORT_RANGE = 90;
export const KILL_RANGES = { short: 60, medium: 90, long: 130 } as const;
export type KillDistance = keyof typeof KILL_RANGES;

/** Living viewers receive entities within vision radius times this. */
export const RELEVANCE_MULT = 1.35;
/** Remote entities render this far in the past. */
export const INTERP_DELAY_MS = 100;

export const MAX_PLAYERS = 15;
export const MIN_PLAYERS = 4;
export const ROOM_CODE_LENGTH = 6;
export const MAX_NAME_LENGTH = 12;
export const MAX_CHAT_LENGTH = 200;
export const CHAT_INTERVAL_MS = 1000;

export const DEFAULT_PORT = 8790;

export const REVEAL_MS = 5000;
export const MEETING_INTRO_MS = 3000;
export const RESULTS_MS = 5000;
export const EJECTION_MS = 7000;
export const GAMEOVER_MS = 9000;

export const INITIAL_KILL_COOLDOWN_MS = 10_000;
export const SABOTAGE_COOLDOWN_MS = 30_000;
export const SABOTAGE_AFTER_MEETING_MS = 10_000;
export const DOOR_CLOSE_MS = 10_000;
/** Maps with manual doors (Polus): shut until a crewmate opens them, so effectively forever. */
export const MANUAL_DOOR_MS = 60 * 60_000;
export const DOOR_COOLDOWN_MS = 30_000;
export const REACTOR_MS = 45_000;
export const O2_MS = 50_000;
/** Decontamination: how long both doors stay shut while the chamber is sprayed. */
export const DECON_MS = 3_000;
/** Door log: one entry per player per sensor within this window. */
export const SENSOR_COOLDOWN_MS = 5_000;
export const DOOR_LOG_MAX = 20;

export const LOBBY_GRACE_MS = 10_000;
export const GAME_GRACE_MS = 45_000;
export const EMPTY_ROOM_MS = 60_000;
