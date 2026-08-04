/**
 * Injects or returns the toast container element for inline toasts.
 */
function getOrCreateToastContainer(): HTMLElement {
  let container = document.getElementById('custom-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'custom-toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px'; // Spacing between toasts
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Creates a floating toast-like error notification in the DOM.
 * @param errorMsg The error message to display
 */
export function showInlineErrorToast(errorMsg: string) {
  const container = getOrCreateToastContainer();

  const errorEl = document.createElement('div');
  errorEl.style.maxWidth = '350px';
  errorEl.style.padding = '14px 18px';
  errorEl.style.borderRadius = '8px';
  errorEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
  errorEl.style.background = '#fff8f8';
  errorEl.style.color = '#b00020';
  errorEl.style.fontFamily = 'Segoe UI, sans-serif';
  errorEl.style.fontSize = '15px';
  errorEl.style.zIndex = '9999';
  errorEl.style.display = 'flex';
  errorEl.style.alignItems = 'center';
  errorEl.style.justifyContent = 'space-between';
  errorEl.style.gap = '12px';
  errorEl.style.transition = 'opacity 0.3s ease';
  errorEl.style.border = '1px solid #f4cccc';

  const msgSpan = document.createElement('span');
  msgSpan.style.flex = '1';
  msgSpan.textContent = errorMsg;

  const dismissBtn = document.createElement('button');
  dismissBtn.setAttribute('aria-label', 'Close');
  dismissBtn.style.fontSize = '18px';
  dismissBtn.style.fontWeight = 'bold';
  dismissBtn.style.color = '#b00020';
  dismissBtn.style.border = 'none';
  dismissBtn.style.background = 'transparent';
  dismissBtn.style.cursor = 'pointer';
  dismissBtn.style.borderRadius = '50%';
  dismissBtn.style.width = '36px';
  dismissBtn.style.height = '36px';
  dismissBtn.style.display = 'flex';
  dismissBtn.style.alignItems = 'center';
  dismissBtn.style.justifyContent = 'center';
  dismissBtn.style.transition = 'background 0.2s ease, color 0.2s ease';
  dismissBtn.style.padding = '0';

  // SVG cross icon
  dismissBtn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
      xmlns="http://www.w3.org/2000/svg" style="display:block">
      <path d="M7 7L15 15M15 7L7 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  dismissBtn.onmouseenter = () => {
    dismissBtn.style.background = '#630214';
    dismissBtn.style.color = '#fff';
  };

  dismissBtn.onmouseleave = () => {
    dismissBtn.style.background = 'transparent';
    dismissBtn.style.color = '#b00020';
  };

  // Close behavior
  dismissBtn.onclick = () => {
    errorEl.style.opacity = '0';
    setTimeout(() => {
      errorEl.remove();
      if (container.childElementCount === 0) container.remove();
    }, 200);
  };

  // Assemble toast
  errorEl.appendChild(msgSpan);
  errorEl.appendChild(dismissBtn);
  container.appendChild(errorEl);

  // Auto-dismiss after 6 seconds
  setTimeout(() => {
    errorEl.style.opacity = '0';
    setTimeout(() => {
      errorEl.remove();
      if (container.childElementCount === 0) container.remove();
    }, 200);
  }, 6000);
}
