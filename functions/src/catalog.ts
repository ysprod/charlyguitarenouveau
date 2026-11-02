export interface Product {
  readonly id: string;
  readonly title: string;
  readonly priceXof: number;
  readonly storagePath: string;
  readonly description: string;
  readonly type: string;
  readonly typeClass: string;
  readonly icon: string;
  readonly format: string;
  readonly level: string;
  readonly imageUrl?: string;
  readonly createdAt?: string;
  readonly views?: number;
  readonly downloads?: number;
}

export function isValidProductId(value: unknown): value is string {
  return typeof value === 'string' && /^[-A-Za-z0-9_]{1,128}$/.test(value);
}

export function isValidStoragePath(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > 512 ||
    !value.startsWith('documents/')
  ) {
    return false;
  }

  const fileName = value.slice('documents/'.length);
  return (
    fileName.length > 0 &&
    fileName.length <= 255 &&
    !/[\/\\\u0000-\u001f]/.test(fileName) &&
    fileName !== '.' &&
    fileName !== '..' &&
    /\.pdf$/i.test(fileName)
  );
}

export function isValidProduct(product: Product): boolean {
  return (
    isValidProductId(product.id) &&
    hasText(product.title, 120) &&
    Number.isSafeInteger(product.priceXof) &&
    product.priceXof >= 1 &&
    Number.isSafeInteger(product.priceXof * 100) &&
    isValidStoragePath(product.storagePath) &&
    hasText(product.description, 1000) &&
    hasText(product.type, 100) &&
    hasText(product.typeClass, 100) &&
    hasText(product.icon, 20) &&
    hasText(product.format, 50) &&
    hasText(product.level, 100) &&
    (product.imageUrl === undefined || isHttpsUrl(product.imageUrl)) &&
    (product.createdAt === undefined ||
      (typeof product.createdAt === 'string' &&
        Number.isFinite(Date.parse(product.createdAt)))) &&
    (product.views === undefined ||
      (Number.isSafeInteger(product.views) && product.views >= 0)) &&
    (product.downloads === undefined ||
      (Number.isSafeInteger(product.downloads) && product.downloads >= 0))
  );
}

export function parseProduct(id: unknown, value: unknown): Product | undefined {
  if (
    !isValidProductId(id) ||
    !isRecord(value) ||
    typeof value['title'] !== 'string' ||
    typeof value['price'] !== 'number' ||
    typeof value['storagePath'] !== 'string' ||
    typeof value['description'] !== 'string' ||
    typeof value['type'] !== 'string' ||
    typeof value['typeClass'] !== 'string' ||
    typeof value['icon'] !== 'string' ||
    typeof value['format'] !== 'string' ||
    typeof value['level'] !== 'string' ||
    (value['imageUrl'] !== undefined &&
      typeof value['imageUrl'] !== 'string') ||
    (value['createdAt'] !== undefined &&
      typeof value['createdAt'] !== 'string') ||
    (value['views'] !== undefined && typeof value['views'] !== 'number') ||
    (value['downloads'] !== undefined &&
      typeof value['downloads'] !== 'number')
  ) {
    return undefined;
  }

  const product: Product = {
    id,
    title: value['title'],
    priceXof: value['price'],
    storagePath: value['storagePath'],
    description: value['description'],
    type: value['type'],
    typeClass: value['typeClass'],
    icon: value['icon'],
    format: value['format'],
    level: value['level'],
    ...(value['imageUrl'] !== undefined && { imageUrl: value['imageUrl'] }),
    ...(value['createdAt'] !== undefined && {
      createdAt: value['createdAt'],
    }),
    ...(typeof value['views'] === 'number' && { views: value['views'] }),
    ...(typeof value['downloads'] === 'number' && {
      downloads: value['downloads'],
    }),
  };

  return isValidProduct(product) ? product : undefined;
}

function hasText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
