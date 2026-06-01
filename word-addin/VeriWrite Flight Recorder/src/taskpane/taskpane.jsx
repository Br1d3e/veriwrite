import React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import App from "./App.jsx";
import { updateSessions } from "./modules/recorder.js";
import "./styles.css";

let root = null;
let mounted = false;

function enableAutoShowTaskpaneWithDocument() {
  const settings = window.Office?.context?.document?.settings;
  if (!settings) return;

  settings.set("Office.AutoShowTaskpaneWithDocument", true);
  settings.saveAsync((result) => {
    if (result.status !== window.Office.AsyncResultStatus.Succeeded) {
      console.warn("Failed to save auto-open taskpane setting", result.error);
    }
  });
}

function renderApp() {
  if (mounted) return;
  mounted = true;

  const rootEl = document.getElementById("root");
  root = createRoot(rootEl);
  root.render(
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  );
}

document.getElementById("root").textContent = "Loading VeriWrite Recorder...";

if (window.Office?.onReady) {
  window.Office.onReady(() => {
    enableAutoShowTaskpaneWithDocument();
    renderApp();

    if (window.Office?.addin?.onVisibilityModeChanged) {
      window.Office.addin.onVisibilityModeChanged((args) => {
        if (
          args.visibilityMode === window.Office.VisibilityMode.hidden ||
          args.visibilityMode === "Hidden"
        ) {
          updateSessions().catch((err) => {
            console.warn("Failed to update record before interrupted stop.", err);
          });
        }
      });
    }
  });

  window.setTimeout(renderApp, 3000);
} else {
  renderApp();
}
