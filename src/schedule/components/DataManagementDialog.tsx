import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Release, ShipNavBackup } from '../types/release'
import { loadGanttViewPreferences } from '../data/ganttViewStorage'
import { getLocalTodayIso } from '../utils/date'
import { releasesToCsv } from '../utils/csvExport'
import { buildShipNavBackup, parseShipNavBackup } from '../utils/shipNavBackup'
import { normalizeReleaseNumber } from '../utils/releaseNumber'

interface DataManagementDialogProps {
  releases: Release[]
  onReplace: (backup: ShipNavBackup) => string
  onMerge: (backup: ShipNavBackup) => string
  onPrint: () => void
  onCancel: () => void
}

function downloadFile(contents: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function DataManagementDialog({ releases, onReplace, onMerge, onPrint, onCancel }: DataManagementDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [backup, setBackup] = useState<ShipNavBackup | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [confirmReplace, setConfirmReplace] = useState(false)

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()
    return () => returnFocusRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !confirmReplace) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmReplace, onCancel])

  function exportBackup() {
    const portable = buildShipNavBackup(releases, loadGanttViewPreferences())
    downloadFile(JSON.stringify(portable, null, 2), 'application/json', `shipnav-backup-${getLocalTodayIso()}.json`)
    setResult('Backup exported.')
  }

  function exportCsv() {
    downloadFile(releasesToCsv(releases), 'text/csv;charset=utf-8', `shipnav-releases-${getLocalTodayIso()}.csv`)
    setResult(`Exported ${releases.length} release${releases.length === 1 ? '' : 's'} to CSV.`)
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    setBackup(null)
    setError('')
    setResult('')
    setConfirmReplace(false)
    if (!file) return
    try {
      setBackup(parseShipNavBackup(await file.text()))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The backup could not be read.')
    } finally {
      input.value = ''
    }
  }

  const currentNumbers = new Set(releases.map((release) => normalizeReleaseNumber(release.releaseNumber)))
  const conflictCount = backup?.releases.filter((release) => currentNumbers.has(normalizeReleaseNumber(release.releaseNumber))).length ?? 0
  const openCount = backup?.releases.filter((release) => release.status === 'open').length ?? 0

  function applyReplace() {
    if (!backup) return
    setResult(onReplace(backup))
    setBackup(null)
    setConfirmReplace(false)
  }

  function applyMerge() {
    if (!backup) return
    setResult(onMerge(backup))
    setBackup(null)
  }

  return (
    <div className="modal-backdrop data-modal" role="presentation">
      <div className="duplicate-dialog data-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="data-dialog-title" tabIndex={-1}>
        <div className="duplicate-heading">
          <div><p className="eyebrow">Portable data</p><h2 id="data-dialog-title">Import / Export</h2></div>
          <button type="button" className="dialog-close" aria-label="Close data management dialog" onClick={onCancel}>×</button>
        </div>
        <div className="data-actions">
          <button type="button" className="data-action" onClick={exportBackup}><strong>Export Backup</strong><span>All releases and Gantt preferences as JSON</span></button>
          <button type="button" className="data-action" onClick={exportCsv}><strong>Export CSV</strong><span>All release schedules for Excel</span></button>
          <button type="button" className="data-action" onClick={onPrint}><strong>Print Timeline</strong><span>Print or save the current Gantt view as PDF</span></button>
        </div>
        <section className="import-section">
          <h3>Import backup</h3>
          <p>Select a ShipNav or ShipCommand Schedule JSON backup. Nothing changes until you choose Replace or Merge.</p>
          <label className="file-label" htmlFor="backup-file">Choose JSON backup</label>
          <input id="backup-file" className="file-input" type="file" accept=".json,application/json" onChange={selectFile} aria-describedby={error ? 'import-error' : undefined} />
          {error && <p id="import-error" className="dialog-error" role="alert">{error}</p>}
          {result && <p className="import-result" role="status">{result}</p>}
        </section>
        {backup && (
          <section className="import-preview">
            <h3>Import preview</h3>
            <dl>
              <div><dt>Exported</dt><dd>{backup.exportedAt || 'Not provided'}</dd></div>
              <div><dt>Schema</dt><dd>Version {backup.schemaVersion}</dd></div>
              <div><dt>Releases</dt><dd>{backup.releases.length}</dd></div>
              <div><dt>Status</dt><dd>{openCount} open · {backup.releases.length - openCount} closed</dd></div>
              <div><dt>Conflicts</dt><dd>{conflictCount} existing release number{conflictCount === 1 ? '' : 's'}</dd></div>
              <div><dt>Timeline scale</dt><dd>{backup.ganttViewPreferences.scale}</dd></div>
            </dl>
            {confirmReplace ? (
              <div className="replace-confirm">
                <p>This will permanently replace all current releases and Gantt view preferences.</p>
                <button type="button" className="button secondary" onClick={() => setConfirmReplace(false)}>Keep Current Data</button>
                <button type="button" className="button danger-button" onClick={applyReplace}>Confirm Replace</button>
              </div>
            ) : (
              <div className="import-buttons">
                <button type="button" className="button secondary" onClick={() => setBackup(null)}>Cancel Import</button>
                <button type="button" className="button secondary" onClick={applyMerge}>Merge With Existing Data</button>
                <button type="button" className="button danger-button" onClick={() => setConfirmReplace(true)}>Replace Existing Data</button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
