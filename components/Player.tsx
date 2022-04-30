import Script from "next/script";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { BsSpotify } from "react-icons/bs";
import { CgSpinner } from "react-icons/cg";
import styled from "styled-components";
import { spotify } from "../lib/spotify";
import { PlayerControls } from "./PlayerControls";

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.85);
`;

const ModalWrap = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100%;
  max-width: min(95vw, 400px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px) contrast(0.5) brightness(0.75);
  border-radius: 10px;
  padding: 20px;
  color: white;
  font-size: 1.3rem;
  border: 1px solid #1db954;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Colors = styled.div`
  position: fixed;
  top: 0;
  left: 0;
`;

const Color = styled.div`
  padding: 0 8px;
  height: 35px;
  line-height: 35px;
`;

function invlerp(start: number, end: number, amt: number) {
  return (amt - start) / (end - start);
}

function useRequest<T>(...[url, config]: Parameters<typeof fetch>) {
  const [data, setData] = useState<T | null>(null);
  const [refreshKey, setRefeshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefeshKey((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!url) {
      return;
    }
    setData(null);
    fetch(url, config)
      .then(async (response) => {
        const json = await response.json();
        if (response.status >= 300 && response.status < 400 && json.redirect) {
          window.location.href = json.redirect;
          return {};
        } else {
          return json;
        }
      })
      .then(setData);
  }, [url, refreshKey]);

  return {
    data,
    refresh,
  };
}

export function useAuthToken() {
  return useRequest<{
    authToken: string;
  }>("/api/one-auth");
}

function useAnalysis(id: string | null) {
  return useRequest<{
    beats: { start: number; duration: number; confidence: number }[];
    segments: {
      start: number;
      loudness_max: number;
      loudness_max_time: number;
      pitches: number[];
    }[];
    sections: { start: number; loudness: number }[];
  }>(id ? `/api/analysis?id=${id}` : "");
}

function useFeatures(id: string | null) {
  return useRequest<{}>(id ? `/api/audio-features?id=${id}` : "");
}

function useImageColors(src: string | null) {
  return useRequest<
    {
      r: number;
      g: number;
      b: number;
      h: number;
      s: number;
      l: number;
      relativeLuminance: number;
    }[]
  >(src ? `/api/image-colors?src=${src}` : "");
}

const SpotifyGreenButton = styled.button`
  color: unset;
  background-color: #1db954;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-weight: 500;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const Spin = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  animation-name: spin;
  animation-duration: 5000ms;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

function Modal() {
  const [loading, setLoading] = useState(false);
  const { dispatch, ready } = useSpotify();

  return (
    <>
      <Backdrop />
      <ModalWrap>
        {!ready ? (
          <Spin style={{ marginRight: "0.6ch" }}>
            <CgSpinner size={30} />
          </Spin>
        ) : (
          <>
            <SpotifyGreenButton
              onClick={async () => {
                if (!loading) {
                  setLoading(true);
                  await dispatch("transferPlayback");
                  dispatch("resume");
                  setLoading(false);
                }
              }}
            >
              {loading ? (
                <Spin style={{ marginRight: "0.6ch" }}>
                  <CgSpinner size={25} />
                </Spin>
              ) : (
                <BsSpotify style={{ marginRight: "0.6ch" }} />
              )}
              Start Listening
            </SpotifyGreenButton>
            <span
              style={{
                marginTop: 10,
                fontWeight: 300,
                color: "rgba(255,255,255,0.7)",
                fontSize: "1rem",
                fontStyle: "italic",
              }}
            >
              Clicking to start playback in this browser tab
            </span>
            <span
              style={{
                marginTop: 10,
                fontWeight: 300,
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.9rem",
                fontStyle: "italic",
                textAlign: "center",
                position: "absolute",
                left: 0,
                bottom: 0,
                padding: 20,
                width: "100%",
              }}
            >
              WARNING: This site may potentially trigger seizures for people
              with photosensitive epilepsy. Viewer discretion is advised.
            </span>
          </>
        )}
      </ModalWrap>
    </>
  );
}

const Context = createContext<{
  getPositionMs: () => number;
  getProgressPercentage: () => number;
  trackId: string | null;
  albumArt: string | null;
  imageColors: {
    r: number;
    g: number;
    b: number;
    h: number;
    s: number;
    l: number;
    relativeLuminance: number;
  }[];
  loggedIn: boolean;
  playerConnected: boolean;
  hasPlayed: boolean;
  authToken?: string;
  dispatch: (event: string, ...rest: any[]) => any;
  playing: boolean;
  artists: string;
  trackName: string;
  shuffle: boolean;
  repeatMode: number;
  ready: boolean;
  duration: number;
}>({
  getPositionMs: () => 0,
  getProgressPercentage: () => 0,
  trackId: null,
  albumArt: null,
  imageColors: [],
  loggedIn: false,
  playerConnected: false,
  hasPlayed: false,
  dispatch: () => {},
  playing: false,
  artists: "",
  trackName: "",
  shuffle: false,
  repeatMode: 0,
  ready: false,
  duration: 0,
});

export function useSpotify() {
  return useContext(Context);
}

export function usePulse(
  pulse: (beat: { loudness: number; duration: number }) => any,
  offset = 0
) {
  const { trackId, getPositionMs, albumArt } = useSpotify();
  const { data: analysis } = useAnalysis(trackId);
  const { data: features } = useFeatures(trackId);

  useEffect(() => {
    if (trackId && analysis) {
      const beatTimeouts: {
        start: number;
        end: number;
        duration: number;
        loudness?: number;
      }[] = [];

      const { beats, sections } = analysis;

      let prev = beats?.slice(-1)[0].start;
      let sectionsIndex = sections.length - 1;

      let loudnessMin = Infinity;
      let loudnessMax = -Infinity;

      for (let i = beats.length - 1; i >= 0; i--) {
        const { start } = beats[i];

        while (
          sections[sectionsIndex] !== undefined &&
          sections[sectionsIndex].start > start
        ) {
          sectionsIndex--;
        }
        let loudness: number | undefined = undefined;

        const section = sections[sectionsIndex];
        if (section) {
          loudness = section.loudness;
          if (loudness < loudnessMin) {
            loudnessMin = loudness;
          }
          if (loudness > loudnessMax) {
            loudnessMax = loudness;
          }
        }

        const duration = (prev - start) * 1000;
        if (duration < 50) {
          continue;
        }
        prev = start;

        const delayMs = start * 1000 - duration * offset;

        if (delayMs > getPositionMs()) {
          beatTimeouts.unshift({
            start: delayMs,
            end: delayMs + duration,
            duration,
            loudness,
          });
        }
      }

      let stop = false;

      function start() {
        if (stop) {
          return;
        }

        const beat = beatTimeouts[0];
        const pos = getPositionMs();

        if (pos >= beat?.start) {
          beatTimeouts.shift();
          if (pos < beat?.end && document.visibilityState === "visible") {
            const loudness = beat.loudness
              ? invlerp(loudnessMin, loudnessMax, beat.loudness)
              : 0.5;
            pulse({ duration: beat.duration, loudness });
          }
        }
        window.requestAnimationFrame(start);
      }
      window.requestAnimationFrame(start);

      return () => {
        stop = true;
      };
    }
  }, [trackId, analysis, getPositionMs, offset]);
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: any;
    Spotify: any;
  }
}

export function AlbumArtColors() {
  const { imageColors } = useSpotify();
  return (
    <Colors>
      {imageColors?.map(({ r, g, b, h, s, l, relativeLuminance, ...rest }) => (
        <Color
          key={relativeLuminance}
          style={{
            backgroundColor: `rgba(${r},${g},${b},1.0)`,
            color: relativeLuminance > 0.6 ? "black" : "white",
          }}
        >
          {Object.keys(rest)[0]} ({Math.round(relativeLuminance * 10) / 10})
        </Color>
      ))}
    </Colors>
  );
}

export function Player({
  children,
  keyboardControls = true,
}: {
  children: any;
  keyboardControls?: boolean;
}) {
  const { data: auth } = useAuthToken();
  const [getPositionMs, setGetPositionMs] = useState({ fn: () => 0 as number });
  const [getProgressPercentage, setGetProgressPercentage] = useState({
    fn: () => 0 as number,
  });
  const [trackId, setTrackId] = useState<string | null>(null);
  const [loadScript, setLoadScript] = useState(false);
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const { data: imageColors } = useImageColors(albumArt);
  const [playerConnected, setPlayerConnected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [dispatch, setDispatch] = useState({
    fn: (event: string, ...rest: any[]) => {},
  });
  const [trackName, setTrackName] = useState("");
  const [artists, setArtists] = useState("");
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeateMode] = useState(0);
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);

  const authToken = auth?.authToken;

  useEffect(() => {
    if (authToken) {
      let player: any = null;
      let hasPlayed = false;

      window.onSpotifyWebPlaybackSDKReady = () => {
        player = new window.Spotify.Player({
          name: "Spotify Visualizer",
          getOAuthToken: (cb: any) => {
            cb(authToken);
          },
          volume: 0.5,
        });

        let transferPlayback = async () => {};

        player.addListener("ready", ({ device_id }: any) => {
          transferPlayback = () => {
            return spotify.transferPlayback(authToken, {
              params: { deviceId: device_id },
            });
          };
          setReady(true);
        });

        player.addListener("player_state_changed", (state: any) => {
          const { paused, position, track_window, duration } = state ?? {};

          const updatedAt = window.performance.now();
          function getPosition(): number {
            if (paused) {
              return position;
            } else {
              return position + (window.performance.now() - updatedAt);
            }
          }

          function getProgressPercentage(): number {
            return getPosition() / duration;
          }

          hasPlayed = state === null ? false : hasPlayed || !state.paused;
          setDuration(state?.duration);
          setHasPlayed(hasPlayed ?? false);
          setPlaying(!state?.paused ?? false);
          setGetPositionMs({ fn: getPosition });
          setGetProgressPercentage({ fn: getProgressPercentage });
          setTrackId(track_window?.current_track?.id ?? null);
          setAlbumArt(
            track_window?.current_track?.album?.images?.[0]?.url ?? null
          );
          setTrackName(track_window?.current_track?.name);
          setArtists(
            track_window?.current_track?.artists
              .map((a: any) => a?.name)
              .join(", ")
          );
          setPlayerConnected(state !== null);
          setShuffle(state?.shuffle);
          setRepeateMode(state?.repeat_mode);
        });

        player.connect();

        setDispatch({
          fn: (event, ...payload) => {
            if (event === "transferPlayback") {
              return transferPlayback();
            }
            return player[event]?.(payload);
          },
        });
      };

      setLoadScript(true);
    }
  }, [authToken]);

  const loggedIn = Boolean(authToken);

  return (
    <>
      {loadScript && (
        <Script id="spotify" src="https://sdk.scdn.co/spotify-player.js" />
      )}
      <Context.Provider
        value={{
          getPositionMs: getPositionMs.fn,
          getProgressPercentage: getProgressPercentage.fn,
          trackId,
          albumArt,
          imageColors: imageColors ?? [],
          loggedIn,
          playerConnected,
          hasPlayed,
          authToken,
          dispatch: dispatch.fn,
          playing,
          trackName,
          artists,
          shuffle,
          repeatMode,
          ready,
          duration,
        }}
      >
        {children}
        {hasPlayed ? <PlayerControls keyboardControls={keyboardControls} /> : <Modal />}
      </Context.Provider>
    </>
  );
}
