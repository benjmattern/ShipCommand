param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$RequestUrl
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$startedAt = [System.Diagnostics.Stopwatch]::StartNew()

function Get-ResponseKind {
    param([string]$ContentType, [string]$Content)

    $trimmed = $Content.TrimStart()
    if (-not $Content) { return "empty" }
    if ($ContentType -match "json" -or $trimmed -match "^[\{\[]") { return "json" }
    if ($ContentType -match "xml" -or $trimmed -match "^<\?xml\b") { return "xml" }
    if ($ContentType -match "html" -or $trimmed -match "^(<!doctype\s+html|<html)\b") { return "html" }
    return "unknown"
}

function Write-SanitizedResult {
    param(
        [int]$UpstreamStatus = 0,
        [string]$ContentType = "",
        [string]$Content = "",
        [bool]$RedirectDetected = $false,
        [string]$ErrorCategory = ""
    )

    $responseKind = Get-ResponseKind -ContentType $ContentType -Content $Content
    $loginPageDetected = $responseKind -eq "html" -and (
        $Content -match "(?i)(microsoftonline|office 365|sign[\s-]?in|log[\s-]?in|saml|oauth|authentication required)"
    )
    $sharePointDetected = (
        $ContentType -match "(?i)sharepoint" -or
        $Content -match "(?i)(sharepoint|_layouts|sprequestguid|microsoft\.sharepoint)"
    )

    [ordered]@{
        upstreamStatus = if ($UpstreamStatus -gt 0) { $UpstreamStatus } else { $null }
        contentType = if ($ContentType) { $ContentType } else { $null }
        responseKind = $responseKind
        redirectDetected = $RedirectDetected
        loginPageDetected = [bool]$loginPageDetected
        sharePointDetected = [bool]$sharePointDetected
        errorCategory = if ($ErrorCategory) { $ErrorCategory } else { $null }
        durationMs = [int]$startedAt.ElapsedMilliseconds
    } | ConvertTo-Json -Compress
}

try {
    $response = Invoke-WebRequest `
        -Uri $RequestUrl `
        -Method Get `
        -UseDefaultCredentials `
        -UseBasicParsing `
        -MaximumRedirection 0 `
        -TimeoutSec 25 `
        -Headers @{ Accept = "application/json, application/xml, text/xml, text/html" }

    Write-SanitizedResult `
        -UpstreamStatus ([int]$response.StatusCode) `
        -ContentType ([string]$response.Headers["Content-Type"]) `
        -Content ([string]$response.Content)
}
catch [System.Net.WebException] {
    $webResponse = $_.Exception.Response
    if ($null -ne $webResponse) {
        $content = ""
        try {
            $stream = $webResponse.GetResponseStream()
            if ($null -ne $stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                try { $content = $reader.ReadToEnd() }
                finally { $reader.Dispose() }
            }
        }
        catch { $content = "" }

        $status = [int]$webResponse.StatusCode
        Write-SanitizedResult `
            -UpstreamStatus $status `
            -ContentType ([string]$webResponse.ContentType) `
            -Content $content `
            -RedirectDetected ($status -ge 300 -and $status -lt 400)
    }
    else {
        Write-SanitizedResult -ErrorCategory "transport"
    }
}
catch {
    Write-SanitizedResult -ErrorCategory "subprocess"
}
