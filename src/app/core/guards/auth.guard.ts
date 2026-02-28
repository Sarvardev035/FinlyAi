import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('fineco_jwt');

  if (token) {
    return true;
  }

  // For now allow all routes since there's no backend auth
  // When a backend is added, redirect to login:
  // return router.createUrlTree(['/login']);
  return true;
};
