import { getApiBaseUrl } from './api';
import { environment } from './environment';
import {
  isAlmEnabled,
  isDiagnosticsEnabled,
  isEnterpriseEnabled,
  isServiceNowEnabled,
  isVersionOneEnabled,
} from './features';

export { EnterpriseApiUnavailableError, getApiBaseUrl, getApiUrl, versionOneDisplayEndpoint } from './api';
export { detectEnvironment, environment, type Environment } from './environment';
export {
  isAlmEnabled,
  isDiagnosticsEnabled,
  isEnterpriseEnabled,
  isServiceNowEnabled,
  isVersionOneEnabled,
} from './features';

export const applicationConfig = Object.freeze({
  environment,
  apiBaseUrl: getApiBaseUrl(),
  enterpriseEnabled: isEnterpriseEnabled(),
  versionOneEnabled: isVersionOneEnabled(),
  serviceNowEnabled: isServiceNowEnabled(),
  almEnabled: isAlmEnabled(),
  diagnosticsEnabled: isDiagnosticsEnabled(),
} as const);
