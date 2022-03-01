import dynamic from "next/dynamic";
import { useEffect } from "react";
import styled from 'styled-components'

const Modal = styled.div`
  position: fixed;
  height: min(80vh, 80vw);
  width: min(80vh, 80vw);
  z-index: 100;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  border-radius: 10px;

  :hover {
    opacity: 1;
  }
`

const AceEditor = dynamic(
  async () => {
    const aceBuilds = await import("ace-builds");

    const CDN = "https://unpkg.com/ace-builds@1.4.14/src-noconflict";

    aceBuilds.config.set("basePath", CDN);
    aceBuilds.config.set("modePath", CDN);
    aceBuilds.config.set("themePath", CDN);
    aceBuilds.config.set("workerPath", CDN);

    const ace = await import("react-ace");
    require("ace-builds/src-noconflict/mode-glsl");
    require("ace-builds/src-noconflict/theme-dracula");
    return ace;
  },
  {
    ssr: false,
  }
);

export function Editor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => any;
}) {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
      return () => {
        history.scrollRestoration = "auto";
      };
    }
  }, []);

  return (
    <Modal>
    <AceEditor
      mode="glsl"
      theme="dracula"
      defaultValue={value}
      onChange={onChange}
      style={{
        height: '100%',
        width: '100%',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(15px) contrast(0.5) brightness(0.5)'
      }}
      editorProps={{ $blockScrolling: true }}
      setOptions={{
        tabSize: 2,
        useSoftTabs: true
      }}
    />
    </Modal>
  );
}

export default Editor;