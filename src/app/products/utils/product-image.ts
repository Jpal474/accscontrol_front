import { environment } from '../../../environments/environment.development';

export function productImageUrl(image?: string | null): string | null {
  if (!image) return null;
  try {
    const url = new URL(image, environment.apiUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
