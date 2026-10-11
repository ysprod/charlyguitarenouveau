import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

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
      /* ✅ Attend la première émission *réelle* de Firebase Auth
         (ignore les valeurs indéfinies éventuelles) */
      filter((user): user is NonNullable<typeof user> | null => user !== undefined),
      take(1),
      map(currentUser => {
        if (currentUser) {
          return true;
        }
        return this.router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url }
        });
      })
    );
  }
}