import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-rdialog',
  standalone: true,
  imports: [
  MatDialogModule,
  MatButtonModule
],
  templateUrl: './rdialog.component.html',
  styleUrls: ['./rdialog.component.css']
})
export class RdialogComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
