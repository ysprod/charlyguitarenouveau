import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-mentions',
  standalone: true,
  imports: [],
  templateUrl: './mentions.component.html',
  styleUrls: ['./mentions.component.scss'] // ⚠️ renommé de .css en .scss
})
export class MentionsComponent implements OnInit {

  readonly siteName = 'Charly Guitare';
  readonly siteUrl = 'https://charlyguitare.com';
  readonly ownerName = 'Charly Guitare'; // Ou le nom de votre société / entreprise
  readonly contactEmail = 'yayasidibeproduction@gmail.com';

  // Hébergeur
  readonly hostName = 'Google Cloud Platform / Firebase Hosting';
  readonly hostAddress = 'Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA';
  readonly hostWebsite = 'https://firebase.google.com';

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}