import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-apprendre',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './apprendre.component.html',
  styleUrls: ['./apprendre.component.css']
})
export class ApprendreComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
