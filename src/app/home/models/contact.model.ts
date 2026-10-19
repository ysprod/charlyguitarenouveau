import { FormControl } from '@angular/forms';

/* ═══════════════════════════════════════════════════════
   FORMULAIRE
   ═══════════════════════════════════════════════════════ */

export interface ContactForm {
  subject: FormControl<string>;
  message: FormControl<string>;
}