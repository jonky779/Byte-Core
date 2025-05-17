import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Inject the error overlay disabler script
const disablerScript = document.createElement('script');
disablerScript.src = '/disable-error-overlay.js';
disablerScript.async = false;
document.head.appendChild(disablerScript);

// Add inline disabler as a fallback
const inlineDisabler = document.createElement('script');
inlineDisabler.textContent = `
  // Hide any error overlays
  (function() {
    const style = document.createElement('style');
    style.textContent = 
      ".vite-error-overlay, [data-plugin=runtime-error-modal], [plugin=runtime-error-plugin], div[style*='z-index: 9999'] {" +
      "  display: none !important;" +
      "  visibility: hidden !important;" +
      "  opacity: 0 !important;" +
      "  z-index: -9999 !important;" +
      "  pointer-events: none !important;" +
      "}";
    document.head.appendChild(style);
    
    // Prevent error overlay from showing
    window.__vite_plugin_react_preamble_installed__ = true;
    window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__ = {
      cleanupMount: () => {},
      catchReactError: () => {},
      onError: () => {}
    };
  })();
`;
document.head.appendChild(inlineDisabler);

createRoot(document.getElementById("root")!).render(<App />);
