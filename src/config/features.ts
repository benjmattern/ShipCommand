import { environment, type Environment } from './environment';

function hasLocalIntegration(targetEnvironment: Environment) {
  return targetEnvironment !== 'github-pages';
}

export function isEnterpriseEnabled(targetEnvironment: Environment = environment): boolean {
  return hasLocalIntegration(targetEnvironment);
}

export function isVersionOneEnabled(targetEnvironment: Environment = environment): boolean {
  return hasLocalIntegration(targetEnvironment);
}

export function isServiceNowEnabled(targetEnvironment: Environment = environment): boolean {
  return hasLocalIntegration(targetEnvironment);
}

export function isAlmEnabled(targetEnvironment: Environment = environment): boolean {
  return hasLocalIntegration(targetEnvironment);
}

export function isDiagnosticsEnabled(targetEnvironment: Environment = environment): boolean {
  return hasLocalIntegration(targetEnvironment);
}
