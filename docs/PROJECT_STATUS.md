# ShipCommand Project Status

ShipCommand is a local React, TypeScript, and Vite proof-of-concept. `BacklogData.xlsx` seeds the in-memory RAID register, which supports CRUD, release filtering, and priority reordering.

The Releases view derives release summaries and feature lists from the same live RAID state, so RAID create, edit, delete, release reassignment, and impacted-microservice changes are reflected immediately. RAID items store selected microservices by stable controlled-reference IDs. Refreshing the browser restores workbook data.

Not yet implemented: persistence, ServiceNow integration, delivery phases, service involvement types, RAID splitting, attachments, or configurable Settings lists.
