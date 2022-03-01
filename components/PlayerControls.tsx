import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
import styled, { createGlobalStyle } from "styled-components";
import { useSpotify } from "./Player";
import { spotify } from "../lib/spotify";

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
  border-radius: 3px;
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
  width: 320px;
  box-shadow: 0px 5px 17px 5px rgba(0,0,0,0.28);

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

const ProgressBarDiv = styled.div<{ $progress: number }>`
  height: 5px;
  width: 100%;
  background-color: rgba(0,0,0,0.2);
  position: relative;
  border-radius: 5px;

  ${({ $progress }) => `
    :before {
      content: " ";
      display: block;
      background-color: black;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      position: absolute;
      height: 100%;
      width: ${Math.round($progress * 100)}%;
      border-radius: inherit;
    }
  `}

  :hover:before {
    background-color: ${SPOTIFY_GREEN};
  }

  ${({ $progress }) => `
    :after {
      content: " ";
      display: block;
      background-color: black;
      top: 50%;
      bottom: 0;
      left: ${Math.round($progress * 100)}%;
      height: 12px;
      width: 12px;
      position: absolute;
      transform: translate(-50%, -50%);
      border-radius: 50%;
    }
  `}
`

function ProgressBar() {
  const { getProgressPercentage, dispatch, duration } = useSpotify()
  const [percentage, setPercentage] = useState(getProgressPercentage())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      window.requestAnimationFrame(() => {
        setPercentage(getProgressPercentage())
      })
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [getProgressPercentage])

  useEffect(() => {
    const elm = ref.current
    if (elm) {
      function handleMouseDown(e: MouseEvent) {
        // Get the target
        const target = e.target as HTMLDivElement;

        if (target && elm) {
          // Get the bounding rectangle of target
          const rect = target.getBoundingClientRect();
      
          // Mouse position
          const x = e.clientX - rect.left;

          const progress = x / elm.offsetWidth

          dispatch('seek', progress * duration)
        }
      }

      elm.addEventListener('mousedown', handleMouseDown);

      return () => {
        elm.removeEventListener('mousedown', handleMouseDown)
      }
    }
  }, [])

  return (
    <ProgressBarDiv
      ref={ref}
      $progress={percentage}
    />
  )
}

export function PlayerControls() {
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
  }, [toggleShuffle, dispatch]);

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
          <FullScreenToggle />
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
