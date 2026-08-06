export function getApiBaseUrl(): string {
  return '';
}

export function getApiUrl(path: `/api/${string}`): string {
  return `${getApiBaseUrl()}${path}`;
}
