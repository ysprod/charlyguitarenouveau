import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-coursprives',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './coursprives.component.html',
  styleUrls: ['./coursprives.component.css']
})
export class CoursprivesComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
