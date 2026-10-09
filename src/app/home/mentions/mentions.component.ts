import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-mentions',
  standalone: true,
  templateUrl: './mentions.component.html',
  styleUrls: ['./mentions.component.css']
})
export class MentionsComponent implements OnInit {

  siteName = 'Charly Guitare';
  siteUrl = 'https://charlyguitare.com';
  ownerName = 'Charly Guitare'; // Ou le nom de votre société / entreprise
  contactEmail = 'yayasidibeproduction@gmail.com';

  // Hébergeur
  hostName = 'Google Cloud Platform / Firebase Hosting';
  hostAddress = 'Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA';
  hostWebsite = 'https://firebase.google.com';

  constructor() { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}
