// src/app/offoland/offoland.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImmersiveCarouselComponent } from '../shared/immersive-carousel/immersive-carousel.component';
import { CitationWidgetComponent } from './components/citation-widget/citation-widget.component'; // ✅ Import

@Component({
  selector: 'app-offoland',
  imports: [
    RouterLink,
    ImmersiveCarouselComponent,
    CitationWidgetComponent, // ✅ Ajout dans les imports
  ],
  templateUrl: './offoland.component.html',
  styleUrls: ['./offoland.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffolandComponent {}