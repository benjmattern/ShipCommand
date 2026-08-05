## Requests Planning Page

Status: 🟡 Discovered (not yet investigated)

### URL

https://versionone.usps.gov/v1/Default.aspx?menu=RequestsPlanningPage&feat-nav=--m2

### Purpose

VersionOne Requests planning view.

Potential source for ShipCommand's future Request Backlog.

### Questions

- What VersionOne asset type backs this page?
- Is it `Data/Request`?
- Are Requests paged like Stories?
- Does this page expose Requests not yet assigned to a Release?
- Does it include Request → Epic relationships?
- Which fields are displayed?
- Is priority exposed?
- Is Requested By exposed?
- Are custom USPS fields present?

### Next Test

Attempt retrieval through:

Data/Request

using the existing Local Integration API architecture.

### Notes

Candidate replacement for the current Excel intake backlog, but not a replacement for the existing RAID register in ShipCommand.