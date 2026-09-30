import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Database, listVal, ref } from '@angular/fire/database';

import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface DocumentItem {
  key?: string;
  title: string;
  description: string;

  /**
   * Type du document :
   * 'Méthode', 'Livre Numérique', 'Partition', 'Support Pédagogique'
   */
  type: string;

  /**
   * Classe CSS associée au type :
   * 'type-methode', 'type-livre', 'type-partition', 'type-support'
   */
  typeClass: string;

  /**
   * Icône du document :
   * '📙', '📘', '🎼', '📐', '📑', etc.
   */
  icon: string;

  /**
   * Format du document :
   * '📄 PDF (45 pages)', '🖼️ Image HD / PDF', etc.
   */
  format: string;

  /**
   * Niveau :
   * '⚡ Débutant', '⚡ Intermédiaire', '⚡ Avancé', '⚡ Tous niveaux'
   */
  level: string;

  downloadUrl: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css']
})
export class DocumentsComponent implements OnInit {

  private readonly database = inject(Database);

  documents$: Observable<DocumentItem[]> = of([]);

  filteredDocuments$: Observable<DocumentItem[]> = of([]);

  selectedFilter = 'Tous les documents';

  readonly filters: string[] = [
    'Tous les documents',
    'Méthodes',
    'Livres numériques',
    'Partitions',
    'Supports pédagogiques'
  ];

  ngOnInit(): void {
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });

    this.loadDocuments();

    this.applyFilter(this.selectedFilter);
  }

  /**
   * Charge les documents depuis le nœud "documents"
   * de Firebase Realtime Database.
   */
  private loadDocuments(): void {
    const documentsRef = ref(this.database, 'documents');

    this.documents$ = listVal<DocumentItem>(
      documentsRef,
      {
        keyField: 'key'
      }
    ).pipe(
      map((documents: DocumentItem[]) =>
        documents.map((document: DocumentItem) => ({
          ...document,
          key: document.key
        }))
      ),
      shareReplay({
        bufferSize: 1,
        refCount: true
      })
    );
  }

  /**
   * Change le filtre actif.
   */
  filterBy(category: string): void {
    this.selectedFilter = category;
    this.applyFilter(category);
  }

  /**
   * Applique le filtre sélectionné aux documents.
   */
  private applyFilter(category: string): void {
    this.filteredDocuments$ = this.documents$.pipe(
      map((documents: DocumentItem[]) => {
        if (category === 'Tous les documents') {
          return documents;
        }

        return documents.filter(
          (document: DocumentItem) =>
            this.matchesCategory(document, category)
        );
      })
    );
  }

  /**
   * Vérifie si un document appartient à la catégorie sélectionnée.
   */
  private matchesCategory(
    document: DocumentItem,
    category: string
  ): boolean {
    const type = document.type.toLowerCase().trim();

    switch (category) {
      case 'Méthodes':
        return type.includes('méthode');

      case 'Livres numériques':
        return type.includes('livre');

      case 'Partitions':
        return type.includes('partition');

      case 'Supports pédagogiques':
        return type.includes('support');

      default:
        return true;
    }
  }

  /**
   * TrackBy pour optimiser le rendu de la liste.
   */
  trackByDocumentKey(
    index: number,
    document: DocumentItem
  ): string {
    return document.key ?? `document-${index}`;
  }
}
 