import { HttpInterceptorFn, HttpRequest, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment';

/**
 * Set this token on a request's HttpContext to suppress the global error toast.
 * Useful for auth flows where the component shows its own inline error message.
 */
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Enforces HTTPS for all outgoing API requests in production.
 * Catches backend errors globally and surfaces human-readable toasts.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);

  // ── HTTPS enforcement ───────────────────────────────────────────────────
  if (environment.enforceHttps && req.url.startsWith('http://')) {
    // Upgrade the URL silently; log a warning in case of a misconfiguration.
    console.warn(`[Security] Blocked plain-HTTP request to ${req.url}. Upgrading to HTTPS.`);
    req = req.clone({ url: req.url.replace(/^http:\/\//i, 'https://') });
  }

  return next(req).pipe(
    catchError((err: unknown) => {
      const suppress = req.context.get(SUPPRESS_ERROR_TOAST);
      if (!suppress) {
        if (err instanceof HttpErrorResponse) {
          handleHttpError(err, toast, router);
        } else {
          toast.error('An unexpected error occurred. Please try again.');
        }
      }
      return throwError(() => err);
    }),
  );
};

function handleHttpError(
  err: HttpErrorResponse,
  toast: ToastService,
  router: Router,
): void {
  // Network / CORS / offline
  if (err.status === 0) {
    toast.error(
      'Could not reach the server. Check your connection or try again later.',
      8000,
    );
    return;
  }

  const body = err.error as Record<string, unknown> | null;
  const serverMsg = extractMessage(body);

  switch (err.status) {
    case 400:
      toast.error(serverMsg ?? 'The request contained invalid data. Please review and try again.');
      break;

    case 401:
      // Clear stale credentials and redirect to login – only once
      if (!router.url.startsWith('/auth')) {
        localStorage.removeItem('fineco_jwt');
        localStorage.removeItem('fineco_refresh');
        localStorage.removeItem('fineco_user');
        router.navigate(['/auth/login'], { queryParams: { reason: 'session_expired' } });
        toast.warning('Your session has expired. Please log in again.');
      }
      break;

    case 403:
      toast.error('You do not have permission to perform this action.');
      break;

    case 404:
      toast.error(serverMsg ?? 'The requested resource was not found.');
      break;

    case 409:
      toast.error(serverMsg ?? 'This action conflicts with existing data (e.g. duplicate entry).');
      break;

    case 422:
      toast.error(serverMsg ?? 'Validation failed. Please check the form fields.');
      break;

    case 429:
      toast.warning('Too many requests. Please slow down and try again in a moment.');
      break;

    case 500:
    case 502:
    case 503:
      toast.error(
        'The server encountered an error. Our team has been notified. Please try again shortly.',
        8000,
      );
      break;

    default:
      toast.error(serverMsg ?? `Unexpected error (HTTP ${err.status}).`);
  }
}

/** Pulls the most useful human-readable string from any backend error shape. */
function extractMessage(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  // Spring Boot default: { message: "...", error: "..." }
  // Our ApiResponse envelope: { success: false, data: null, message: "..." }
  for (const key of ['message', 'error', 'detail', 'title']) {
    const val = body[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  // Spring validation errors: { errors: [...] }
  const errors = body['errors'];
  if (Array.isArray(errors) && errors.length) {
    const first = errors[0] as Record<string, unknown>;
    const msg = first['defaultMessage'] ?? first['message'] ?? first['field'];
    if (typeof msg === 'string') return msg;
  }
  return null;
}
