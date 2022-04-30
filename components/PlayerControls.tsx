import { useCallback, useEffect, useState } from "react";
import { BsFillSkipEndFill, BsFillSkipStartFill } from "react-icons/bs";
import {
  MdOutlinePauseCircleFilled,
  MdOutlinePlayCircleFilled,
} from "react-icons/md";
import {
  RiFullscreenFill,
  RiRepeat2Fill,
  RiRepeatOneFill,
} from "react-icons/ri";
import { TiArrowShuffle } from "react-icons/ti";
import ReactSlider from "react-slider";
import styled, { createGlobalStyle } from "styled-components";
import { spotify } from "../lib/spotify";
import { useSpotify } from "./Player";

const GlobalStyle = createGlobalStyle<{ $hideMouse: boolean }>`
  body {
    ${({ $hideMouse }) => ($hideMouse ? "cursor: none;" : "")}
  }
`;

const SPOTIFY_GREEN = "#1db954";

const AlbumArt = styled.img`
  height: 40px;
  width: 40px;
  object-fit: contain;
`;

const HiddenButton = styled.button<{ $active?: boolean }>`
  color: black;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  position: relative;

  ${({ $active }) =>
    $active
      ? `
    ::after {
    content: " ";
    display: block;
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translate(-50%, 0);
    height: 5px;
    width: 5px;
    border-radius: 50%;
    background-color: ${SPOTIFY_GREEN};
  }
  `
      : ""}
`;

const ControlWrap = styled.div`
  background-color: rgba(255, 255, 255, 1);
  position: fixed;
  bottom: 3vh;
  left: 50%;
  padding: 10px;
  transform: translate(-50%, 0);
  color: white;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  transition: opacity 0.2s;
  align-items: center;
  width: 330px;
  box-shadow: 0px 5px 17px 5px rgba(0, 0, 0, 0.28);

  &.hide:not(:hover) {
    opacity: 0;
  }

  & > *:not(:last-child) {
    margin-bottom: 15px;
  }

  & > * {
    width: 100%;
  }
`;

const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  & > *:not(:last-child) {
    margin-right: 10px;
  }
  overflow: hidden;
`;

const Text = styled.span`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const FlexCol = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

function toggleFullscreen() {
  const isFullscreen =
    window.innerWidth == screen.width && window.innerHeight == screen.height;
  if (isFullscreen) {
    window.document.exitFullscreen();
  } else {
    window.document.body.requestFullscreen();
  }
}

function FullScreenToggle() {
  useEffect(() => {
    function handleKeypress(e: KeyboardEvent) {
      if (e.key === "f") {
        toggleFullscreen();
      }
    }
    window.addEventListener("keypress", handleKeypress);
    return () => {
      window.removeEventListener("keypress", handleKeypress);
    };
  }, []);

  return (
    <HiddenButton onClick={toggleFullscreen}>
      <RiFullscreenFill size={25} />
    </HiddenButton>
  );
}

const StyledSlider = styled(ReactSlider)`
  width: 100%;
`;

const StyledThumb = styled.div`
  height: 12px;
  width: 12px;
  background-color: #000;
  color: transparent;
  border-radius: 50%;
  transform: translate(0, -25%);
`;

const Thumb = (props: any, state: any) => (
  <StyledThumb {...props}>{state.valueNow}</StyledThumb>
);

const StyledTrack = styled.div<{ index: number }>`
  height: 5px;
  border-radius: 5px;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.2);
  :hover {
    background: ${(props) =>
      props.index === 0 ? SPOTIFY_GREEN : "rgba(0, 0, 0, 0.2)"};
  }
`;

const Track = (props: any, state: any) => (
  <StyledTrack {...props} index={state.index} />
);

const Time = styled.span`
  color: rgba(0, 0, 0, 0.7);
  font-size: 0.85rem;
  margin: 0;
  line-height: 0.9em;
`;

function formatTime(ms: number) {
  let seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;

  return `${minutes}:${(seconds < 10 ? "0" : "") + seconds}`;
}

function ProgressBar() {
  const { getProgressPercentage, dispatch, duration } = useSpotify();
  const [percentage, setPercentage] = useState(getProgressPercentage());

  useEffect(() => {
    const update = () =>
      window.requestAnimationFrame(() => {
        setPercentage(getProgressPercentage());
      });
    update();
    const id = window.setInterval(update, 500);
    return () => {
      window.clearInterval(id);
    };
  }, [getProgressPercentage]);

  const currentTimeMs = percentage * duration;
  const remainingSeconds = duration - currentTimeMs;

  return (
    <>
      <StyledSlider
        min={0}
        max={100}
        value={[percentage * 100]}
        onChange={(val) => {
          if (typeof val === "number") {
            dispatch("seek", (val / 100) * duration);
          }
        }}
        renderTrack={Track}
        renderThumb={Thumb}
      />
      <FlexRow style={{ marginBottom: 10 }}>
        <Time>{formatTime(currentTimeMs)}</Time>
        <Time>-{formatTime(remainingSeconds)}</Time>
      </FlexRow>
    </>
  );
}

export function PlayerControls({
  keyboardControls,
}: {
  keyboardControls: boolean;
}) {
  const {
    dispatch,
    playing,
    albumArt,
    trackName,
    artists,
    shuffle,
    repeatMode,
    authToken,
  } = useSpotify();

  const [hideControls, setHideControls] = useState(false);

  useEffect(() => {
    if (hideControls) {
      const handleMouseMove = () => setHideControls(false);
      window.addEventListener("mousemove", handleMouseMove);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
      };
    } else {
      const id = window.setTimeout(() => {
        setHideControls(true);
      }, 2500);
      return () => {
        window.clearInterval(id);
      };
    }
  }, [hideControls]);

  useEffect(() => setHideControls(false), [playing]);

  const toggleShuffle = useCallback(() => {
    authToken &&
      spotify.toggleShuffle(authToken, { params: { shuffle: !shuffle } });
  }, [shuffle, authToken]);

  const toggleRepeat = useCallback(() => {
    authToken &&
      spotify.toggleRepeat(authToken, {
        params: { repeat: (repeatMode + 1) % 3 },
      });
  }, [repeatMode, authToken]);

  useEffect(() => {
    if (keyboardControls) {
      function handleKeypress(e: KeyboardEvent) {
        if (e.metaKey) {
          switch (e.key) {
            case "s":
              toggleShuffle();
              e.preventDefault();
              break;
            // case "r":
            //   toggleRepeat();
            //   e.preventDefault();
            //   break;
            case "ArrowRight":
              dispatch("nextTrack");
              e.preventDefault();
              break;
            case "ArrowLeft":
              dispatch("previousTrack");
              e.preventDefault();
              break;
          }
        } else {
          switch (e.key) {
            case " ":
              dispatch("togglePlay");
              e.preventDefault();
              break;
          }
        }
      }
      window.addEventListener("keydown", handleKeypress);
      return () => {
        window.removeEventListener("keydown", handleKeypress);
      };
    }
  }, [toggleShuffle, dispatch, keyboardControls]);

  const mediaIconProps = {
    size: 40,
  };

  return (
    <>
      <GlobalStyle $hideMouse={hideControls && playing} />
      <ControlWrap className={hideControls && playing ? "hide" : ""}>
        <FlexRow>
          <FlexRow>
            {albumArt && <AlbumArt src={albumArt}></AlbumArt>}
            <FlexCol>
              <Text
                style={{ fontSize: "1rem", color: "black", fontWeight: "500" }}
              >
                {trackName}
              </Text>
              <Text style={{ fontSize: "0.85rem", color: "rgba(0,0,0,0.7)" }}>
                {artists}
              </Text>
            </FlexCol>
          </FlexRow>
          {keyboardControls && <FullScreenToggle />}
        </FlexRow>
        <ProgressBar />
        <FlexRow>
          <HiddenButton onClick={toggleShuffle} $active={shuffle}>
            <TiArrowShuffle
              size={30}
              color={shuffle ? SPOTIFY_GREEN : undefined}
            />
          </HiddenButton>

          <FlexRow>
            <HiddenButton onClick={() => dispatch("previousTrack")}>
              <BsFillSkipStartFill {...mediaIconProps} />
            </HiddenButton>
            <HiddenButton onClick={() => dispatch("togglePlay")}>
              {playing ? (
                <MdOutlinePauseCircleFilled {...mediaIconProps} />
              ) : (
                <MdOutlinePlayCircleFilled {...mediaIconProps} />
              )}
            </HiddenButton>
            <HiddenButton onClick={() => dispatch("nextTrack")}>
              <BsFillSkipEndFill {...mediaIconProps} />
            </HiddenButton>
          </FlexRow>

          <HiddenButton $active={repeatMode > 0} onClick={toggleRepeat}>
            {repeatMode === 2 ? (
              <RiRepeatOneFill size={26} color={SPOTIFY_GREEN} />
            ) : (
              <RiRepeat2Fill
                size={26}
                color={repeatMode === 1 ? SPOTIFY_GREEN : undefined}
              />
            )}
          </HiddenButton>
        </FlexRow>
      </ControlWrap>
    </>
  );
}
