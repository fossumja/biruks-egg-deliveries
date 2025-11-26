import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private messagesSubject = new BehaviorSubject<ToastMessage | null>(null);
  messages$ = this.messagesSubject.asObservable();
  private counter = 0;

  show(message: string, type: ToastType = 'success', durationMs = 2200): void {
    const toast: ToastMessage = { id: ++this.counter, message, type };
    this.messagesSubject.next(toast);
    if (durationMs > 0) {
      setTimeout(() => {
        if (this.messagesSubject.value?.id === toast.id) {
          this.messagesSubject.next(null);
        }
      }, durationMs);
    }
  }
}
