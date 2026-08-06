import { environment, type Environment } from './environment';

export const versionOneDisplayEndpoint = import.meta.env.MODE === 'github-pages'
  ? null
  : 'https://versionone.usps.gov/v1/rest-1.v1/Data/Story';

export class EnterpriseApiUnavailableError extends Error {
  constructor() {
    super('Live enterprise data is unavailable in the GitHub Pages build.');
    this.name = 'EnterpriseApiUnavailableError';
  }
}

export function getApiBaseUrl(targetEnvironment: Environment = environment): string | null {
  return targetEnvironment === 'github-pages' ? null : '';
}

export function getApiUrl(path: `/api/${string}`, targetEnvironment: Environment = environment): string {
  const baseUrl = getApiBaseUrl(targetEnvironment);
  if (baseUrl === null) throw new EnterpriseApiUnavailableError();
  return `${baseUrl}${path}`;
}
