import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RedirectLoggedInGuard  {

  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.afAuth.authState.pipe(
      take(1),
      map(user => {
        if (user) {
          // Redirige vers l'académie ou l'accueil s'il est déjà connecté
          return this.router.createUrlTree(['/academie']);
        } else {
          return true; // Accès autorisé
        }
      })
    );
  }
}
