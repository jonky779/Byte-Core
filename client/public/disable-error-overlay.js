
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
    div[style*="position: fixed"][style*="bottom: 0"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      z-index: -9999 !important;
      pointer-events: none !important;
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

  console.log('Enhanced error overlay disabler initialized');
})();
