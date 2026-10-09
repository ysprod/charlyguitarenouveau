import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-privacy',
  standalone: true,
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css']
})
export class PrivacyComponent implements OnInit {
  siteName = 'Charly Guitare';
  siteUrl = 'https://charlyguitare.com';
  contactEmail = 'yayasidibeproduction@gmail.com';
  lastUpdated = '8 Août 2026';

  constructor() { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

}
