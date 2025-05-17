// This script disables the Vite runtime error overlay
(function() {
  // Create a style element to hide the error overlay
  const style = document.createElement('style');
  style.textContent = `
    /* Hide all variations of the error overlay */
    .vite-error-overlay,
    [data-plugin="runtime-error-modal"],
    [plugin="runtime-error-plugin"],
    #vite-error-overlay,
    div[style*="position: fixed"][style*="z-index: 9999"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      z-index: -9999 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);

  // Attempt to intercept and disable the error overlay
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    if (element.tagName === 'DIV') {
      // Add a mutation observer to catch error overlays when they're added to the DOM
      setTimeout(() => {
        if (element.className && 
            (element.className.includes('error') || 
             element.id === 'vite-error-overlay' || 
             (element.style && element.style.zIndex === '9999'))) {
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          element.style.opacity = '0';
          element.style.zIndex = '-9999';
          element.style.pointerEvents = 'none';
        }
      }, 0);
    }
    return element;
  };

  // Override window.onerror to prevent the overlay from showing up 
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Log the error to console but don't display overlay
    console.error('Caught error:', message, error);
    // Prevent default error handlers
    return true;
  };

  console.log('Error overlay disabler initialized');
})();