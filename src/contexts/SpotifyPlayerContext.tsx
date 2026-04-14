import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useSpotifyController } from "@/hooks/useSpotifyController";

type SpotifyPlayerContextValue = ReturnType<typeof useSpotifyController>;

const SpotifyPlayerContext = createContext<SpotifyPlayerContextValue | null>(
  null,
);

/**
 * Owns the Spotify Web Playback SDK for the whole authenticated app session so
 * playback survives closing the wake-up overlay or switching top-app tabs.
 */
export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const value = useSpotifyController(true);
  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}

export function useSpotifyPlayer(): SpotifyPlayerContextValue {
  const v = useContext(SpotifyPlayerContext);
  if (v === null) {
    throw new Error("useSpotifyPlayer must be used within SpotifyPlayerProvider");
  }
  return v;
}
