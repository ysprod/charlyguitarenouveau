import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'] // ⚠️ renommé de .css en .scss
})
export class PrivacyComponent implements OnInit {

  readonly siteName = 'Charly Guitare';
  readonly siteUrl = 'https://charlyguitare.com';
  readonly contactEmail = 'yayasidibeproduction@gmail.com';
  readonly lastUpdated = '8 Août 2026'; // ⚠️ date à vérifier

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}