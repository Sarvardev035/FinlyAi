import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('fineco_jwt');

  if (token) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
