import { Injectable, inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RedirectLoggedInGuard {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      take(1),
      map(user => {
        if (user) {
          return this.router.createUrlTree(['/academie']);
        }

        return true;
      })
    );
  }
} 
