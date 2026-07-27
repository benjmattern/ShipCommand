# ShipCommand Project Status

ShipCommand is a local React, TypeScript, and Vite proof-of-concept. `BacklogData.xlsx` seeds the in-memory RAID register, which supports CRUD, release filtering, and priority reordering.

The Releases view derives release summaries and feature lists from the same live RAID state, so RAID create, edit, delete, release reassignment, and service-assignment changes are reflected immediately. RAID items store service assignments containing a stable microservice ID, involvement type ID, and applicable phase IDs. Refreshing the browser restores workbook data.

The seven delivery phases and four involvement types are controlled reference data. They currently describe applicability only; phase status, percent complete, and progress records are not implemented.

Not yet implemented: persistence, ServiceNow integration, phase progress, RAID splitting, attachments, or configurable Settings lists.
