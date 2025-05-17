
// This script completely disables Vite and React error overlays
(function() {
  // Create a style element to aggressively hide all variations of error overlays
  const style = document.createElement('style');
  style.textContent = `
    /* Hide all variations of error overlays */
    .vite-error-overlay,
    [data-plugin="runtime-error-modal"],
    [plugin="runtime-error-plugin"],
    #vite-error-overlay,
    .error-overlay,
    div[style*="position: fixed"][style*="z-index: 9999"],
    div[style*="position: fixed"][style*="bottom: 0"],
    div[style*="background-color: rgba"],
    div[style*="background: #"], 
    div[style*="background: rgb"],
    div[style*="background-color: #"],
    div[style*="background-color: rgb"],
    div#__vite-plugin-runtime-error-modal,
    div[class*="error"],
    div[class*="overlay"],
    div[data-vite-dev-server-overlay],
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

  // Override window.onerror to prevent the overlay from showing up 
  window.onerror = function(message, source, lineno, colno, error) {
    // Log the error to console but don't display overlay
    console.error('Caught error:', message, error);
    // Prevent default error handlers
    return true;
  };
  
  // Disable React error overlay
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
    
    // Handle runtime error plugin
    const observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // Element node
              const elem = node as Element;
              if (
                elem.getAttribute('plugin') === 'runtime-error-plugin' ||
                elem.id === '__vite-plugin-runtime-error-modal' ||
                (elem.tagName === 'DIV' && elem.style.zIndex === '9999')
              ) {
                elem.remove();
              }
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

  console.log('Enhanced error overlay disabler initialized');
})();
