# Decisions

- Release tracker data is derived from RAID item state for the POC; no duplicate release-feature persistence is introduced.
- Release values currently come from `BacklogData.xlsx`. A separate ServiceNow release export will be added later.
- Microservices are controlled reference data with stable IDs.
- `serviceAssignments` are the RAID item source of truth and may change at any point.
- Release views derive service information from RAID state; no release-specific assignment store exists.
- Workbook service strings are normalized during import. Explicit names and aliases map to controlled IDs; unknown labels are preserved and shown as unmapped.
- Current preserved source labels outside the controlled list include IV-MTR/IVMTR, ServiceNow, EPS, EMAS, COP, App Support, Tech Arch, CDAO, and other low-frequency team or system labels. They are not fuzzy-matched.
- Involvement types and delivery phases are controlled reference data with stable IDs.
- Applicable phase IDs are stored per service assignment; duplicate and stale IDs are normalized.
- Full Delivery is the default imported assignment. Explicit test-only aliases use Testing Support.
- CAT Ready and CAT Execution remain distinct, independently selectable phases.
- Settings-based reference-data management is deferred.
- Phase status, percent complete, and progress records are deferred.
- Release reassignment moves the item to the selected release for the MVP.
- True file attachments are deferred; links will be supported first.
- RAID item splitting is deferred.
- Configurable Settings lists are deferred.
