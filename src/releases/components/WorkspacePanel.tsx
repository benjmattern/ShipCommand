import { useState, type ReactNode } from 'react';

export type WorkspacePanelHealth = 'healthy' | 'pending' | 'attention' | 'not-configured';

interface WorkspacePanelProps {
  title: string;
  health?: WorkspacePanelHealth;
  summary?: ReactNode;
  actions?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
}

const healthLabels: Record<WorkspacePanelHealth, string> = {
  healthy: 'Healthy',
  pending: 'Pending',
  attention: 'Needs Attention',
  'not-configured': 'Not Configured',
};

export function WorkspacePanel({
  title,
  health,
  summary,
  actions,
  defaultExpanded = false,
  children,
}: WorkspacePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyId = `workspace-panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section className={`workspace-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      <header className="workspace-panel-header">
        <button
          className="workspace-panel-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="workspace-panel-chevron" aria-hidden="true">›</span>
          <strong>{title}</strong>
          {health && <span className={`workspace-health ${health}`}>{healthLabels[health]}</span>}
          {summary && <span className="workspace-panel-summary">{summary}</span>}
        </button>
        {actions && <div className="workspace-panel-actions">{actions}</div>}
      </header>
      {expanded && <div className="workspace-panel-body" id={bodyId}>{children}</div>}
    </section>
  );
}
