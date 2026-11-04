import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE, API_KEY } from '../../core/config/api.config';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!API_KEY || !req.url.startsWith(API_BASE)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-Api-Key': API_KEY } }));
};