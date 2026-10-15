import {
  ChangeDetectionStrategy,
  Component,
  input
} from '@angular/core';

export type AuthAlertType = 'error' | 'success';

@Component({
  selector: 'app-auth-alert',
  standalone: true,
  templateUrl: './auth-alert.component.html',
  styleUrls: ['./auth-alert.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthAlertComponent {
  readonly type = input.required<AuthAlertType>();
  readonly message = input.required<string>();
}