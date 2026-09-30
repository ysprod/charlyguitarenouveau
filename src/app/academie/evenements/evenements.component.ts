import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-evenements',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './evenements.component.html',
  styleUrls: ['./evenements.component.css']
})
export class EvenementsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
