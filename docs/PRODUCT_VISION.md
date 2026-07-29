# Product Vision

## Product statement

> ShipCommand is a Release Operations Platform that provides a connected view of software releases from early planning through development, testing, governance, deployment readiness, production change, and reporting.

The Release is the primary navigation and reporting object. Portfolio views across RAID items, future work, releases, and cross-release trends complement—but do not replace—the release-centered experience.

## Problem statement

Release information is fragmented across spreadsheets and enterprise systems. RAID items, user stories, tests, change records, documents, approvals, financial estimates, and schedules are not visible together. Teams manually reconcile identifiers, status, relationships, and timelines. Leadership lacks an end-to-end view, while existing systems remain authoritative but are optimized for their individual functions rather than integrated release management.

## Product mission

> Create a unified release digital thread without requiring enterprise source systems to be replaced.

ShipCommand connects and normalizes authoritative information, owns release-operating metadata where no appropriate system of record exists, and makes lifecycle relationships traceable.

## Primary users

- Release managers
- Program and project managers
- Product owners
- Technical leads
- Testing leads
- Governance and compliance participants
- Executives and stakeholders

These are generalized user groups. Role-specific permissions and organization-specific titles remain unresolved.

## Core user questions

- What is included in this release?
- Which RAID items and stories are associated with it?
- Which services are impacted?
- Which phases are complete, active, blocked, or not applicable?
- What is scheduled to happen and when?
- Which stories have been deployed to SIT or CAT?
- What testing exists and what were the results?
- Which change records are associated with the release?
- Is required documentation approved?
- What vendor estimates exist?
- What needs attention before the next milestone?

## Product pillars

1. **Planning** — Define future releases, schedules, scope, RAID assignments, milestones, and dependencies.
2. **Execution** — Connect stories, impacted services, delivery phases, progress, blockers, and deployment readiness.
3. **Testing** — Relate test cases, plans, environments, execution results, defects, and evidence to release scope.
4. **Governance** — Track change records, required documents, approvals, controls, and readiness decisions.
5. **Financial Management** — Relate estimates, funding, vendor costs, and forecast-versus-actual information to planned work.
6. **Integrations** — Normalize authoritative enterprise data through isolated connectors without leaking source-specific models into the domain.
7. **Reporting and Intelligence** — Derive readiness, attention areas, portfolio trends, and traceability from normalized underlying records.

## Release digital thread

```text
Future Planning
    ↓
Release Scheduling
    ↓
RAID Assignment
    ↓
User Story Delivery
    ↓
Service and Phase Execution
    ↓
Testing
    ↓
Deployment Readiness
    ↓
Change Governance
    ↓
Documentation Approval
    ↓
Production Release
    ↓
Reporting and Retrospective
```

Every implemented connection should preserve traceability to its source and lifecycle context. The conceptual thread is the long-term vision; today’s implementation covers RAID scope, releases, services, phases, and derived progress only.

## Success direction

ShipCommand succeeds when teams can answer release questions without manual cross-system reconciliation, while source systems remain authoritative and independently usable.
