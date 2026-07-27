# ShipCommand Project Status

ShipCommand is a local React, TypeScript, and Vite proof-of-concept. `BacklogData.xlsx` seeds the in-memory RAID register, which supports CRUD, release filtering, and priority reordering.

The Releases view is the first release-tracker slice. It derives release summaries and feature lists from the same live RAID state, so RAID create, edit, delete, and release reassignment are reflected immediately. Refreshing the browser restores workbook data.

Not yet implemented: persistence, ServiceNow integration, microservice tracking, delivery phases, RAID splitting, attachments, or configurable Settings lists.
