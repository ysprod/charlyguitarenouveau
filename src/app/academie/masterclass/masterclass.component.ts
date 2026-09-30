import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-masterclass',
     standalone: true,
     imports: [RouterLink],
  templateUrl: './masterclass.component.html',
  styleUrls: ['./masterclass.component.css']
})
export class MasterclassComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
