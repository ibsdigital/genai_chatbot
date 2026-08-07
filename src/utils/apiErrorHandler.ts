import { showInlineErrorToast } from './showError';

/**
 * Default error messages mapped by status code.
 */
const defaultMessages: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'You are not authorized. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'Resource not found. It may have been removed or never existed.',
  409: 'Conflict detected. Please refresh and try again.',
  422: 'Some information is invalid or duplicated. Please review and try again.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable. Please try again soon.',
  200: 'Action completed, but there may be an issue. Please check details.',
};

/**
 * Shows a toast with a simple, user-friendly error message based on status code.
 * @param status      The HTTP status code from the response
 * @param errorCode   (optional) The backend-defined error code (ignored)
 * @param errorMsg    (optional) The backend-defined error message (ignored)
 */
export function handleApiError(status: number, errorCode?: string, errorMsg?: string) {
  // Always use the frontend-defined message for the status code
  const message = defaultMessages[status] || 'An unexpected error occurred. Please try again.';

  showInlineErrorToast(message);
}
