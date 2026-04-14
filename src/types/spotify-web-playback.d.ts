/**
 * Minimal globals for Spotify Web Playback SDK (loaded at runtime).
 */
interface SpotifyWebPlayerInstance {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  getCurrentState: () => Promise<unknown>;
  addListener: (name: string, cb: (arg: unknown) => void) => boolean;
  removeListener: (name: string, cb?: (arg: unknown) => void) => boolean;
}

type SpotifyPlayerCtor = new (options: {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}) => SpotifyWebPlayerInstance;

interface Window {
  Spotify?: { Player: SpotifyPlayerCtor };
  onSpotifyWebPlaybackSDKReady?: () => void;
}
