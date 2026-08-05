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


### XML Results for https://versionone.usps.gov/v1/rest-1.v1/Data/Request?sel=Name,Number,AssetState,Status.Name,Priority.Name,Owner.Name&page=5,0
<Assets pageSize="5" pageStart="0">
<Asset href="/v1/rest-1.v1/Data/Request/2493319" id="Request:2493319">
<Attribute name="Name">Pricing Validation Scans</Attribute>
<Attribute name="Number">R-07477</Attribute>
<Attribute name="AssetState">64</Attribute>
<Attribute name="Status.Name"/>
<Attribute name="Priority.Name"/>
<Attribute name="Owner.Name"/>
</Asset>
<Asset href="/v1/rest-1.v1/Data/Request/2493330" id="Request:2493330">
<Attribute name="Name">Program Registration send Extra Service on Separate line</Attribute>
<Attribute name="Number">R-07478</Attribute>
<Attribute name="AssetState">64</Attribute>
<Attribute name="Status.Name"/>
<Attribute name="Priority.Name"/>
<Attribute name="Owner.Name"/>
</Asset>
<Asset href="/v1/rest-1.v1/Data/Request/9536240" id="Request:9536240">
<Attribute name="Name">USPS Ship New Request</Attribute>
<Attribute name="Number">R-17150</Attribute>
<Attribute name="AssetState">200</Attribute>
<Attribute name="Status.Name"/>
<Attribute name="Priority.Name"/>
<Attribute name="Owner.Name"/>
</Asset>
<Asset href="/v1/rest-1.v1/Data/Request/9619428" id="Request:9619428">
<Attribute name="Name">RAID 521 - Fraud - Update Health Check logic to integrate with ESM</Attribute>
<Attribute name="Number">R-17224</Attribute>
<Attribute name="AssetState">64</Attribute>
<Attribute name="Status.Name">Under Review</Attribute>
<Attribute name="Priority.Name">Must Have</Attribute>
<Attribute name="Owner.Name">Pete Gingrich</Attribute>
</Asset>
<Asset href="/v1/rest-1.v1/Data/Request/9619460" id="Request:9619460">
<Attribute name="Name">RAID 528 - Update Intercept PIC API to check intercept list for invalid barcodes</Attribute>
<Attribute name="Number">R-17225</Attribute>
<Attribute name="AssetState">64</Attribute>
<Attribute name="Status.Name">Under Review</Attribute>
<Attribute name="Priority.Name">Must Have</Attribute>
<Attribute name="Owner.Name">Pete Gingrich</Attribute>
</Asset>
</Assets>