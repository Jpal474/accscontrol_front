import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SelectedStoreService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly STORE_KEY = 'active_store_id';

  private readonly _selectedStoreId = signal<string | null>(
    this.getInitialStoreId(),
  );
  readonly selectedStoreId = this._selectedStoreId.asReadonly();

  private getInitialStoreId(): string | null {
    if (!this.isBrowser) return null;
    return sessionStorage.getItem(this.STORE_KEY);
  }

  public setSelectedStore(storeId: string | null) {
    if (this.isBrowser) {
      if (storeId) {
        sessionStorage.setItem(this.STORE_KEY, storeId);
      } else {
        sessionStorage.removeItem(this.STORE_KEY);
      }
    }
    this._selectedStoreId.set(storeId);
  }
}
