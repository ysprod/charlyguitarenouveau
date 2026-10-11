import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from '../../shared/reveal.directive';
import { DocumentsComponent } from '../../academie/documents/documents.component';
import { OffresComponent } from '../../offres/offres.component';
import { PlayComponent } from 'src/app/game/play/play.component';

@Component({
  selector: 'app-homeconnect',
  standalone: true,
  imports: [
    RouterLink,
    RevealDirective,
    DocumentsComponent,
    OffresComponent,
    PlayComponent
  ],
  templateUrl: './homeconnect.component.html',
  styleUrl: './homeconnect.component.scss'
})
export class HomeconnectComponent {}