import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';

import { GameSubscriptionService } from '../services/game-subscription.service';

export const gameSubscriptionGuard: CanActivateChildFn = async (
  childRoute,
  state,
) => {
  /* La page /game/play elle-même est toujours accessible
     (c'est là que l'utilisateur voit les formules d'abonnement) */
  if (childRoute.routeConfig?.path === 'play') {
    return true;
  }

  const router = inject(Router);
  const subscriptionService = inject(GameSubscriptionService);
  let subscriptionCheckFailed = false;

  try {
    const subscription = await subscriptionService.getMySubscription();
    if (subscription.active) {
      return true;
    }
  } catch (error) {
    subscriptionCheckFailed = true;
    console.error('Erreur de vérification de l’abonnement jeux :', error);
  }

  /* Pas d'abonnement actif → redirection vers /game/play
     avec les paramètres pour afficher le bon message */
  return router.createUrlTree(['/game/play'], {
    queryParams: {
      accessRequired: 'true',
      ...(subscriptionCheckFailed && { subscriptionCheckFailed: 'true' }),
      returnUrl: state.url,
    },
  });
};