import { environment } from '../../../environments/environment.development';

export function productImageUrl(image?: string | null): string | null {
  if (!image) return null;
  try {
    // A placeholder origin keeps relative URLs usable in the browser and SSR.
    const relativeOrigin = 'http://relative.invalid';
    const api = new URL(environment.apiUrl, relativeOrigin);
    const source = image.startsWith('/uploads/') ? image.slice(1) : image;
    const url = new URL(source, api);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const localUpload = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.pathname.startsWith('/uploads/');
    if (api.origin === relativeOrigin && localUpload) {
      return `${api.pathname.replace(/\/$/, '')}${url.pathname}${url.search}${url.hash}`;
    }
    return url.origin === relativeOrigin ? `${url.pathname}${url.search}${url.hash}` : url.href;
  } catch { return null; }
}
