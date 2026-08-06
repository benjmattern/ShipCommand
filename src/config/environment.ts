export type Environment = 'development' | 'enterprise' | 'github-pages';

/**
 * Central environment detection boundary.
 *
 * Deployment-specific signals are intentionally deferred. Until a deployment
 * increment supplies an approved signal, every build retains today's behavior.
 */
export function detectEnvironment(): Environment {
  return 'development';
}

export const environment: Environment = detectEnvironment();
