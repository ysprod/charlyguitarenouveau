import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { OffresComponent } from '../offres/offres.component';

@Component({
  selector: 'app-abonnement',
  standalone: true,
  imports: [CommonModule, OffresComponent],
  templateUrl: './abonnement.component.html',
  styleUrls: ['./abonnement.component.scss']
})
export class AbonnementComponent implements OnInit {

  ngOnInit(): void {

  }

}