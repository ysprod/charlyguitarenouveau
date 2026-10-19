import { DocumentItem } from './document.model';

export type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'popular';
export type ToastType = 'success' | 'info' | 'error';

export interface ToastState {
  readonly show: boolean;
  readonly message: string;
  readonly type: ToastType;
}

export interface FilterOption {
  readonly label: string;
  readonly icon: string;
}

export interface PendingPurchase {
  readonly doc: DocumentItem;
  readonly reason: 'paid' | 'free';
}

export const INITIAL_TOAST_STATE: ToastState = {
  show: false,
  message: '',
  type: 'success'
};
