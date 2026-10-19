/**
* Vérifie si l'adresse e-mail fournie est syntaxiquement valide.
*
* @example
* isValidEmail('test@example.com') // true
* isValidEmail('test@')            // false
*/
export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}