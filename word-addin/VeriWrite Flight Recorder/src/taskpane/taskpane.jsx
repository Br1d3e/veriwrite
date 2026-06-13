import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import App from "./App.jsx";
import { updateSessions } from "./modules/recorder.js";
import "./styles.css";

let root = null;
const rootEl = document.getElementById("root");

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

function renderApp(officeInfo = null) {
  if (!root) {
    root = createRoot(rootEl);
  }
  root.render(
    <FluentProvider theme={webLightTheme}>
      <App officeInfo={officeInfo} />
    </FluentProvider>
  );
}

function renderFatalError(error) {
  const message = error instanceof Error ? error.message : String(error);
  rootEl.textContent = `VeriWrite failed to load: ${message}`;
}

rootEl.textContent = "Loading VeriWrite Recorder...";

if (window.Office?.onReady) {
  window.Office.onReady((info) => {
    try {
      enableAutoShowTaskpaneWithDocument();
      renderApp(info);

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
    } catch (error) {
      renderFatalError(error);
    }
  });

  window.setTimeout(() => {
    if (!root) renderApp();
  }, 3000);
} else {
  renderApp();
}
