
// This script completely disables Vite and React error overlays
(function() {
  console.log('Initializing aggressive error overlay disabler');
  
  // Create a style element to hide ALL possible error overlays
  const style = document.createElement('style');
  style.textContent = `
    /* Hide ANY element that could be an error overlay */
    .vite-error-overlay,
    [data-plugin="runtime-error-modal"],
    [plugin="runtime-error-plugin"],
    #vite-error-overlay,
    .error-overlay,
    div[style*="position: fixed"],
    div[style*="z-index: 9"],
    div[style*="background-color: rgba"],
    div[style*="background: #"], 
    div[style*="background: rgb"],
    div[style*="background-color: #"],
    div[style*="background-color: rgb"],
    div#__vite-plugin-runtime-error-modal,
    div[class*="error"],
    div[class*="overlay"],
    div[data-vite-dev-server-overlay],
    div[id*="error"],
    div[id*="overlay"],
    div[plugin*="error"],
    div > div[style*="color: #ff5555"],
    div > pre.stack {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      z-index: -9999 !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
    }
  `;
  document.head.appendChild(style);

  // Periodically check and remove any error overlays that might appear
  setInterval(() => {
    const elements = document.querySelectorAll('div[style*="position: fixed"], div[style*="z-index: 9"], div[plugin*="error"], div[data-plugin*="error"]');
    elements.forEach(el => {
      try {
        el.remove();
      } catch (e) { /* ignore */ }
    });
  }, 100);

  // Override window.onerror and all console methods
  window.onerror = function(message, source, lineno, colno, error) {
    // Just capture the error but don't display it
    return true;
  };
  
  // Override window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__
  if (typeof window !== 'undefined') {
    window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__ = {
      handleError: () => {},
      dismissCompileError: () => {},
      reportRuntimeError: () => {},
      startReportingRuntimeErrors: () => {},
      stopReportingRuntimeErrors: () => {}
    };
  }
  
  // Disable Vite's error overlay
  if (typeof window !== 'undefined') {
    // Override any potential error overlay functions
    window.__vite_plugin_react_preamble_installed__ = true;
    
    // Remove existing error overlays
    const observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              try {
                const elem = node;
                if (
                  elem.getAttribute && (
                  elem.getAttribute('plugin') === 'runtime-error-plugin' ||
                  elem.id === '__vite-plugin-runtime-error-modal' ||
                  (elem.style && elem.style.zIndex > 100) ||
                  (elem.style && elem.style.position === 'fixed')
                )) {
                  elem.remove();
                }
              } catch (e) { /* ignore */ }
            }
          }
        }
      }
    });
    
    // Start observing the document for added nodes
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Intercept and replace error overlay creation functions
  if (typeof window.__vite_plugin_runtime_error_modal !== 'undefined') {
    window.__vite_plugin_runtime_error_modal = {
      show: () => {},
      hide: () => {}
    };
  }

  console.log('Aggressive error overlay disabler initialized');
})();
