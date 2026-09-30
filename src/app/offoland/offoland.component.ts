import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayComponent } from '../game/play/play.component';
import { CharlyguitaregameComponent } from '../univers/charlyguitaregame/charlyguitaregame.component';

@Component({
  selector: 'app-offoland',
  standalone: true,
  imports: [
    RouterLink,
    PlayComponent,
    CharlyguitaregameComponent
  ],
  templateUrl: './offoland.component.html',
  styleUrls: ['./offoland.component.scss']
})
export class OffolandComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
