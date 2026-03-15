import { HttpInterceptorFn } from '@angular/common/http';

const isPublicAuthEndpoint = (url: string): boolean =>
  /\/api\/auth\/(login|register)(\?|$|\/)/i.test(url);

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const csrfToken = getCookie('XSRF-TOKEN');

  if (isPublicAuthEndpoint(req.url)) return next(req);

  if (csrfToken && !req.method.match(/^(GET|HEAD|OPTIONS)$/i)) {
    const cloned = req.clone({
      setHeaders: {
        'X-XSRF-TOKEN': csrfToken,
      },
    });
    return next(cloned);
  }

  return next(req);
};

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}
