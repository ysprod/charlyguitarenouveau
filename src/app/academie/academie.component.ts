import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocumentsComponent } from './documents/documents.component';

@Component({
  selector: 'app-academie',
  standalone: true,
  imports: [
    RouterLink,
    DocumentsComponent
  ],
  templateUrl: './academie.component.html',
  styleUrls: ['./academie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcademieComponent {}