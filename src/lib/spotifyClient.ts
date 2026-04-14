/**
 * Shared Spotify Web Playback SDK + REST types used by the UI layer.
 * (Token + REST calls run through Convex actions; this file is for client-side SDK shapes.)
 */

export type SpotifyPlaylistSummary = {
  id: string;
  name: string;
  uri: string;
  imageUrl?: string | null;
};

export type SpotifyPlaybackInput =
  | {
      command: "play";
      deviceId: string;
      contextUri: string;
    }
  | { command: "pause"; deviceId: string }
  | { command: "resume"; deviceId: string }
  | { command: "next"; deviceId: string }
  | { command: "previous"; deviceId: string }
  | { command: "seek"; deviceId: string; positionMs: number };

/** Minimal shape for `Spotify.Player` instance we use. */
export type SpotifyWebPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  addListener: (
    name: string,
    cb: (arg: unknown) => void,
  ) => boolean;
  removeListener: (name: string, cb?: (arg: unknown) => void) => boolean;
};

export type SpotifyPlaybackState = {
  paused: boolean;
  /** Present on Web Playback SDK state; identifies album/playlist context when applicable. */
  context?: {
    uri: string | null;
  } | null;
  track_window?: {
    current_track?: {
      name?: string;
      artists?: Array<{ name?: string }>;
      duration_ms?: number;
    };
  };
  position?: number;
  duration?: number;
};
