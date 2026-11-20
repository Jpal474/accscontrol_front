import { productImageUrl } from './product-image';

describe('Product images through the public Angular origin', () => {
  it('resolves relative uploads through the API proxy', () => {
    expect(productImageUrl('/uploads/products/item.png')).toBe('/api/uploads/products/item.png');
    expect(productImageUrl('uploads/products/item.png')).toBe('/api/uploads/products/item.png');
    expect(productImageUrl('/api/uploads/products/item.png')).toBe('/api/uploads/products/item.png');
  });
  it('routes existing loopback upload URLs through the same origin', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(productImageUrl(`http://${host}:3000/uploads/products/item.png?v=2`)).toBe('/api/uploads/products/item.png?v=2');
    }
  });
  it('preserves external HTTPS image URLs and rejects unsafe protocols', () => {
    expect(productImageUrl('https://cdn.example.com/item.png')).toBe('https://cdn.example.com/item.png');
    expect(productImageUrl('javascript:alert(1)')).toBeNull();
    expect(productImageUrl('data:text/html,hello')).toBeNull();
    expect(productImageUrl(null)).toBeNull();
  });
});
