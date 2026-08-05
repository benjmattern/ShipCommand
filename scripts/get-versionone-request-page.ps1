param(
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 100)]
    [int]$PageSize,

    [Parameter(Mandatory = $true)]
    [ValidateRange(0, 1000000)]
    [int]$Offset
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$endpoint = "https://versionone.usps.gov/v1/rest-1.v1/Data/Request"
$query = @{
    sel = "Name,Number,AssetState,Status.Name,Priority.Name,Owner.Name"
    page = "$PageSize,$Offset"
}
$queryString = ($query.GetEnumerator() | ForEach-Object {
    "{0}={1}" -f [System.Uri]::EscapeDataString($_.Key), [System.Uri]::EscapeDataString($_.Value)
}) -join "&"
$requestUri = "$endpoint`?$queryString"

try {
    $response = Invoke-WebRequest `
        -Uri $requestUri `
        -Method Get `
        -UseDefaultCredentials `
        -UseBasicParsing `
        -TimeoutSec 25 `
        -Headers @{ Accept = "application/xml, text/xml" }

    [ordered]@{
        success = $true
        httpStatus = [int]$response.StatusCode
        httpStatusText = [string]$response.StatusDescription
        contentType = [string]$response.Headers["Content-Type"]
        xmlBase64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([string]$response.Content))
    } | ConvertTo-Json -Compress
}
catch [System.Net.WebException] {
    $webResponse = $_.Exception.Response
    [ordered]@{
        success = $false
        httpStatus = if ($null -ne $webResponse) { [int]$webResponse.StatusCode } else { $null }
        httpStatusText = if ($null -ne $webResponse) { [string]$webResponse.StatusDescription } else { $null }
        contentType = if ($null -ne $webResponse) { [string]$webResponse.ContentType } else { $null }
        errorCategory = "upstream"
        technicalDetail = $_.Exception.GetType().Name
    } | ConvertTo-Json -Compress
}
catch {
    [ordered]@{
        success = $false
        httpStatus = $null
        httpStatusText = $null
        contentType = $null
        errorCategory = "transport"
        technicalDetail = $_.Exception.GetType().Name
    } | ConvertTo-Json -Compress
}
