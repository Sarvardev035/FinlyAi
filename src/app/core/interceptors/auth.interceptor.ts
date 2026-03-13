import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Only attach the JWT to requests directed at our own backend to prevent token leakage. */
const isOwnApi = (url: string): boolean =>
  url.startsWith(environment.apiUrl) || url.startsWith('/api');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isOwnApi(req.url)) return next(req);

  const token = localStorage.getItem('fineco_jwt');

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned);
  }

  return next(req);
};
