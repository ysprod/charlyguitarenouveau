export interface GameFilter {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
}

export interface GameItem {
  readonly id: string;
  readonly category: string;
  readonly route?: string;
  readonly action?: () => void;
  readonly title: string;
  readonly subtitle: string;
  readonly tag: string;
  readonly tagClass: string;
  readonly icon: string;
  readonly btnClass: string;
  readonly isLink: boolean;
}