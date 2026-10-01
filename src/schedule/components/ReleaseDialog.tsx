import { useEffect, useRef } from 'react'
import type { Release, ReleaseDraft } from '../types/release'
import { ReleaseForm } from './ReleaseForm'

interface ReleaseDialogProps {
  mode: 'create' | 'edit'
  release: Release | null
  releases: Release[]
  onSubmit: (draft: ReleaseDraft) => void
  onCancel: () => void
}

export function ReleaseDialog({ mode, release, releases, onSubmit, onCancel }: ReleaseDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [onCancel])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <div className="duplicate-dialog release-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="release-dialog-title" tabIndex={-1}>
        <div className="duplicate-heading">
          <div><p className="eyebrow">{mode === 'create' ? 'New schedule' : 'Release maintenance'}</p><h2 id="release-dialog-title">{mode === 'create' ? 'Add Release' : `Edit ${release?.releaseNumber ?? 'Release'}`}</h2></div>
          <button type="button" className="dialog-close" aria-label="Close release dialog" onClick={onCancel}>×</button>
        </div>
        <ReleaseForm editingRelease={mode === 'edit' ? release : null} releases={releases} onSubmit={onSubmit} onCancel={onCancel} />
      </div>
    </div>
  )
}
