import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-academie',
  imports: [RouterLink],
  templateUrl: './academie.component.html',
  styleUrls: ['./academie.component.scss']
})
export class AcademieComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
