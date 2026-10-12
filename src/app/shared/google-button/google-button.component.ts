import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';

@Component({
  selector: 'app-google-button',
  standalone: true,
  templateUrl: './google-button.component.html',
  styleUrls: ['./google-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleButtonComponent {
  readonly label = input.required<string>();
  readonly disabled = input<boolean>(false);

  readonly clicked = output<void>();
}