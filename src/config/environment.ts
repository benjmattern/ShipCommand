export type Environment = 'development' | 'enterprise' | 'github-pages';

/**
 * Central environment detection boundary.
 *
 * Vite supplies the mode at build time. Normal builds retain development
 * behavior; the dedicated Pages build selects the static environment.
 */
export function detectEnvironment(mode: string = import.meta.env?.MODE ?? 'development'): Environment {
  return mode === 'github-pages' ? 'github-pages' : 'development';
}

export const environment: Environment = detectEnvironment();
