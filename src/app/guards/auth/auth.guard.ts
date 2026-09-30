import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      take(1),
      map(user => {
        if (user) {
          return true;
        }

        return this.router.createUrlTree(['/login'], {
          queryParams: {
            returnUrl: state.url
          }
        });
      })
    );
  }
} 
