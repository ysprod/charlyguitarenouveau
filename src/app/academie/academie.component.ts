import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocumentsComponent } from './documents/documents.component';

@Component({
  selector: 'app-academie',
  imports: [RouterLink,DocumentsComponent],
  templateUrl: './academie.component.html',
  styleUrls: ['./academie.component.scss']
})
export class AcademieComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
