# Platform Modules

Status labels distinguish current behavior from direction.

| Module | Purpose | Examples | Status |
|---|---|---|---|
| Release Management | Primary release navigation, scope, readiness, and reporting | Release list/detail, phase summaries, attention filters | Implemented foundation |
| RAID and Planning | Prioritize and assign release scope | CRUD, priority ordering, release assignment, future planning | Implemented foundation |
| Service Execution | Track impacted services and delivery applicability | Involvement types, phases, status, percentage, notes | Implemented foundation |
| Story Delivery | Connect delivery work and environment movement | Stories, epics, SIT/CAT deployment state | Planned |
| Testing | Connect test scope, execution, results, and evidence | Test cases, plans, defects, pass/fail trends | Planned |
| Change Governance | Connect production change and readiness | CRs, approvals, implementation plans | Planned |
| Documentation and Approvals | Track required evidence and decisions | Document inventory, approvers, approval state | Planned |
| Schedule and Milestones | Coordinate dates and dependencies | Release calendar, phase dates, milestones | Planned |
| Financial Management | Relate estimates and funding to scope | Vendor estimates, ROMs, forecast/actual | Planned |
| Integrations | Normalize authoritative enterprise data | VersionOne, ServiceNow, ALM, SharePoint, Excel | Workbook implemented; others planned |
| Reporting and Intelligence | Derive portfolio and release insight | Readiness, blocked phases, trends, traceability | Implemented foundation / vision |
| Administration | Manage configuration and access | Reference lists, roles, connector settings | Deferred |

## Release-centered composition

Modules are not isolated mini-products. A Release composes their records into a digital thread. Portfolio views aggregate across releases without changing the Release’s role as the primary operational context.

## Increment strategy

Each module should begin with one read-only or local vertical slice that validates its domain relationships. Shared infrastructure should be introduced only when two or more implemented slices prove the abstraction.
