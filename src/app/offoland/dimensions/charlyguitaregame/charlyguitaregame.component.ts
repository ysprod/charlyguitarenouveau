// src/app/offoland/.../charlyguitaregame.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Dimension } from 'src/app/offoland/models/dimension.model';
import { DIMENSIONS } from '../../data/dimensions.data';

@Component({
  selector: 'app-charlyguitaregame',
  imports: [RouterLink],
  templateUrl: './charlyguitaregame.component.html',
  styleUrls: ['./charlyguitaregame.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharlyguitaregameComponent {
  readonly dimensions: readonly Dimension[] = DIMENSIONS;
}