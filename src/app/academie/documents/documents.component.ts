import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface DocumentItem {
  key?: string;
  title: string;
  description: string;
  type: string; // 'Méthode', 'Livre Numérique', 'Partition', 'Support Pédagogique'
  typeClass: string; // 'type-methode', 'type-livre', 'type-partition', 'type-support'
  icon: string; // '📙', '📘', '🎼', '📐', '📑', etc.
  format: string; // '📄 PDF (45 pages)', '🖼️ Image HD / PDF', etc.
  level: string; // '⚡ Débutant', '⚡ Intermédiaire', '⚡ Avancé', '⚡ Tous niveaux'
  downloadUrl: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css']
})
export class DocumentsComponent implements OnInit {
  documents$!: Observable<DocumentItem[]>;
  filteredDocuments$!: Observable<DocumentItem[]>;
  selectedFilter: string = 'Tous les documents';

  filters: string[] = [
    'Tous les documents',
    'Méthodes',
    'Livres numériques',
    'Partitions',
    'Supports pédagogiques'
  ];

  constructor(private db: AngularFireDatabase) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);

    // Récupération des documents depuis le nœud 'documents' dans Realtime Database
    this.documents$ = this.db.list<DocumentItem>('documents').snapshotChanges().pipe(
      map(changes =>
        changes.map(c => ({
          key: c.payload.key || undefined,
          ...c.payload.val()!
        }))
      )
    );

    this.applyFilter('Tous les documents');
  }

  filterBy(category: string): void {
    this.selectedFilter = category;
    this.applyFilter(category);
  }

  private applyFilter(category: string): void {
    this.filteredDocuments$ = this.documents$.pipe(
      map(docs => {
        if (category === 'Tous les documents') {
          return docs;
        }

        return docs.filter(doc => {
          const typeLower = doc.type.toLowerCase();
          if (category === 'Méthodes') return typeLower.includes('méthode');
          if (category === 'Livres numériques') return typeLower.includes('livre');
          if (category === 'Partitions') return typeLower.includes('partition');
          if (category === 'Supports pédagogiques') return typeLower.includes('support');
          return true;
        });
      })
    );
  }
}
