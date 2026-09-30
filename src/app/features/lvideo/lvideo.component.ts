import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-lvideo',
     standalone: true,
  templateUrl: './lvideo.component.html',
  styleUrls: ['./lvideo.component.css']
})
export class LvideoComponent implements OnInit {

  @Input() v: string | undefined;

  constructor() { }

  ngOnInit(): void {
  }

  valider(): string { return "https://www.youtube.com/embed/" + this.v + "?autoplay=1"; }

}
