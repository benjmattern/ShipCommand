# Domain Model

## Domain language

ShipCommand names business concepts independently of their source systems:

- **Release** — primary planning, navigation, and reporting aggregate.
- **RAID Item** — prioritized release-related risk, action, issue, decision, or tracked feature in the current POC.
- **Service Assignment** — a microservice’s involvement in a RAID item, including involvement type and applicable phases.
- **Phase Progress** — status, percent, and optional note for one RAID item + microservice + phase.
- **User Story** — an external delivery record retrieved read-only from a system such as VersionOne.
- **Defect** — an external delivery record retrieved read-only from a system such as VersionOne.
- **Test Case** — test definition and result synchronized from a system such as ALM.
- **Change Record (CR)** — production-change governance record synchronized from a system such as ServiceNow.
- **Governance Document / Approval** — required release evidence and its approval state.
- **Financial Estimate** — estimate, funding, or cost information related to release scope.
- **Schedule / Milestone** — planned release event, environment date, dependency, or readiness checkpoint.

The first four concepts are implemented in some form. The remaining concepts are planned or vision.

## Conceptual relationships

```text
Release
 ├─ RAID Items
 │   └─ Service Assignments
 │       └─ Phase Progress
 ├─ User Stories
 ├─ Test Cases and Results
 ├─ Change Records
 ├─ Governance Documents and Approvals
 ├─ Financial Estimates
 └─ Schedule and Milestones
```

A Release may relate these objects without owning the authoritative content of externally sourced records. Relationships, annotations, planning metadata, and derived rollups may be ShipCommand-owned.

VersionOne Stories and Defects are not currently the same entities as RAID items or ShipCommand features. Both are external read-only delivery records. R29 data is being inspected before deterministic cross-system identity, Story/Defect-to-RAID, Story-to-Feature, or Release relationship rules are defined.

## Current controlled reference data

### Delivery phases

1. Requirements Gathering and Writing
2. DEV / Unit Testing
3. SIT
4. E2E
5. Regression
6. CAT Ready
7. CAT Execution

CAT Ready and CAT Execution are distinct.

### Progress statuses

Not Started, In Progress, Blocked, Complete, and Not Applicable.

### Service involvement types

Full Delivery, Testing Support, Requirements Only, and Custom.

## Source identity

Domain objects should retain source-system identity and provenance without using the source product as their business type. For example, a User Story may have a VersionOne source reference; it is not a “VersionOne object” inside the core domain.

## Derived concepts

Release progress, phase readiness, attention summaries, service rollups, RAID progress, and dashboard metrics should be computed from normalized records. They are projections, not independently mutable business records.

## Open modeling questions

- Release identity and lifecycle states beyond workbook strings
- Cross-release reuse or movement of scope
- Story-to-RAID and test-to-story cardinality
- Ownership of schedules, estimates, documents, and approvals
- Historical snapshots and effective dating
- Split RAID identifiers such as `RAID ID 417.1`

Likely future phases are a VersionOne Release Catalog, configured-release synchronization with timestamps and errors, and RAID governance/matching through a stable cross-system identifier. Candidate governance locations include a dedicated VersionOne custom field, structured tag, or consistently formatted reference field; this increment does not choose among them.
