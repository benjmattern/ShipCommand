import { VersionOneDiagnosticCard } from './VersionOneDiagnosticCard';
import { ServiceNowDiagnosticCard } from './ServiceNowDiagnosticCard';

export function DiagnosticsPage() {
  return (
    <section className="diagnostics-page" aria-labelledby="enterprise-connections-heading">
      <div className="diagnostics-section-heading">
        <h2 id="enterprise-connections-heading">Enterprise Connections</h2>
        <p>Read-only tests report sanitized connection metadata and do not retain response content.</p>
      </div>
      <VersionOneDiagnosticCard />
      <ServiceNowDiagnosticCard />
    </section>
  );
}
