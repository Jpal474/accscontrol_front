import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly secretKey = 'AZSE34P@ÑL12+';
  private async getCryptoKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const hash = await window.crypto.subtle.digest(
      'SHA-256',
      encoder.encode(this.secretKey),
    );

    return window.crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async setItem(key: string, value: any): Promise<void> {
    if (!this.isBrowser) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(value));

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const cryptoKey = await this.getCryptoKey();

      const encryptedContent = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data,
      );

      const combined = new Uint8Array(
        iv.byteLength + encryptedContent.byteLength,
      );
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedContent), iv.byteLength);

      const base64String = btoa(String.fromCharCode(...combined));
      sessionStorage.setItem(key, base64String);
    } catch (error) {
      console.error('Error al cifrar y guardar:', error);
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (!this.isBrowser) return null;

    try {
      const base64String = sessionStorage.getItem(key);
      if (!base64String) return null;

      const combined = Uint8Array.from(atob(base64String), (c) =>
        c.charCodeAt(0),
      );
      const iv = combined.slice(0, 12);
      const encryptedContent = combined.slice(12);

      const cryptoKey = await this.getCryptoKey();
      const decryptedContent = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encryptedContent,
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedContent)) as T;
    } catch (error) {
      console.error('Error al descifrar el storage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    if (!this.isBrowser) return;
    sessionStorage.removeItem(key);
  }

  clear(): void {
    if (!this.isBrowser) return;
    sessionStorage.clear();
  }
}
