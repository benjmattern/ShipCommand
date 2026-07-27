# ShipCommand Project Status

ShipCommand is a local React, TypeScript, and Vite proof-of-concept. `BacklogData.xlsx` seeds the in-memory RAID register, which supports CRUD, release filtering, and priority reordering.

The Releases view derives release summaries and feature lists from the same live RAID state, so RAID create, edit, delete, release reassignment, and service-assignment changes are reflected immediately. RAID items store service assignments containing a stable microservice ID, involvement type ID, and applicable phase IDs. Refreshing the browser restores workbook data.

The seven delivery phases, four involvement types, and five progress statuses are controlled reference data. Each applicable RAID + microservice + phase stores a progress status, percent complete, and optional note inside its service assignment.

Service, RAID, and release progress are derived in memory. Not Applicable phases are excluded from rollups.

Release detail includes a seven-phase summary derived from RAID service-phase progress. Selecting a phase filters the release feature list and displays per-RAID phase rollups. The attention summary currently identifies blocked phases only.

The release overview uses a compact metric list in descending semantic release order. `Rx.x.x` is always listed before numeric releases; release detail and derived progress behavior are unchanged.

Not yet implemented: persistence, ServiceNow integration, a full release phase matrix, phase due dates or dependencies, progress history, RAID splitting, attachments, or configurable Settings lists.
