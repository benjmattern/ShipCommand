import { useState, type FormEvent } from 'react';
import { validateTslcProjectId } from '../Release';
import type { Release } from '../releaseTypes';

interface ServiceNowReleaseIdentityProps {
  release: Release;
  onSave: (tslcProjectId: string) => void;
}

export function ServiceNowReleaseIdentity({ release, onSave }: ServiceNowReleaseIdentityProps) {
  const [draft, setDraft] = useState(release.tslcProjectId ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [valid, setValid] = useState(false);

  function validate() {
    const error = validateTslcProjectId(draft);
    setValid(!error);
    setMessage(error ?? 'TSLC Project value is valid.');
    return !error;
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    onSave(draft.trim());
    setMessage('Saved for this local session.');
    setValid(true);
  }

  return (
    <form className="release-identity-form" onSubmit={save}>
      <label htmlFor={`tslc-project-${release.id}`}>TSLC Project</label>
      <div>
        <input
          id={`tslc-project-${release.id}`}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setMessage(null);
            setValid(false);
          }}
          aria-describedby={`tslc-project-message-${release.id}`}
          aria-invalid={message !== null && !valid}
          placeholder="Enter the local TSLC project identifier"
        />
        <button className="secondary-button" type="button" onClick={validate}>Validate</button>
        <button className="primary-button" type="submit">Save</button>
      </div>
      <small id={`tslc-project-message-${release.id}`} className={message && !valid ? 'field-error' : 'field-message'}>
        {message ?? 'Stored only in memory for this ShipCommand session.'}
      </small>
    </form>
  );
}
