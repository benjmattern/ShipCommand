$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$endpoint = "https://versionone.usps.gov/v1/rest-1.v1/Data/Story"
$query = @{
    sel = "Name,Number,AssetState,Status.Name,Scope.Name,Team.Name,Owners.Name"
    where = "Scope.Name='27.0.0.0'"
    page = "5,0"
}
$queryString = ($query.GetEnumerator() | ForEach-Object {
    "{0}={1}" -f [System.Uri]::EscapeDataString($_.Key), [System.Uri]::EscapeDataString($_.Value)
}) -join "&"
$requestUri = "$endpoint`?$queryString"
$startedAt = [System.Diagnostics.Stopwatch]::StartNew()

function Get-SanitizedResult {
    param(
        [int]$HttpStatus = 0,
        [string]$HttpStatusText = "",
        [string]$ContentType = "",
        [string]$Content = "",
        [string]$ErrorCategory = "",
        [string]$TechnicalDetail = ""
    )

    $trimmedContent = $Content.TrimStart()
    $looksLikeXml = $trimmedContent -match "^(<\?xml\b|<(Assets|Asset)\b)"
    $looksLikeVersionOne = $looksLikeXml -and $Content -match "<(Assets|Asset)\b" -and $Content -match "\bStory\b"
    $looksLikeHtml = $trimmedContent -match "^(<!doctype\s+html|<html)\b" -or $ContentType -match "text/html"
    $responseSizeBytes = if ($null -eq $Content) { 0 } else { [System.Text.Encoding]::UTF8.GetByteCount($Content) }

    return [ordered]@{
        httpStatus = if ($HttpStatus -gt 0) { $HttpStatus } else { $null }
        httpStatusText = if ($HttpStatusText) { $HttpStatusText } else { $null }
        contentType = if ($ContentType) { $ContentType } else { $null }
        responseSizeBytes = if ($HttpStatus -gt 0 -or $Content) { $responseSizeBytes } else { $null }
        responseLooksLikeXml = if ($HttpStatus -gt 0 -or $Content) { [bool]$looksLikeXml } else { $null }
        responseLooksLikeVersionOne = if ($HttpStatus -gt 0 -or $Content) { [bool]$looksLikeVersionOne } else { $null }
        responseLooksLikeHtml = if ($HttpStatus -gt 0 -or $Content) { [bool]$looksLikeHtml } else { $null }
        errorCategory = if ($ErrorCategory) { $ErrorCategory } else { $null }
        technicalDetail = if ($TechnicalDetail) { $TechnicalDetail } else { $null }
        durationMs = [int]$startedAt.ElapsedMilliseconds
    }
}

try {
    $response = Invoke-WebRequest `
        -Uri $requestUri `
        -Method Get `
        -UseDefaultCredentials `
        -UseBasicParsing `
        -TimeoutSec 25 `
        -Headers @{ Accept = "application/xml, text/xml" }

    $statusCode = [int]$response.StatusCode
    $statusText = [string]$response.StatusDescription
    $contentType = [string]$response.Headers["Content-Type"]
    Get-SanitizedResult `
        -HttpStatus $statusCode `
        -HttpStatusText $statusText `
        -ContentType $contentType `
        -Content ([string]$response.Content) |
        ConvertTo-Json -Compress
}
catch [System.Net.WebException] {
    $webResponse = $_.Exception.Response
    if ($null -ne $webResponse) {
        $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
        try {
            $content = $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
        }

        Get-SanitizedResult `
            -HttpStatus ([int]$webResponse.StatusCode) `
            -HttpStatusText ([string]$webResponse.StatusDescription) `
            -ContentType ([string]$webResponse.ContentType) `
            -Content $content |
            ConvertTo-Json -Compress
    }
    else {
        Get-SanitizedResult `
            -ErrorCategory "transport" `
            -TechnicalDetail ("{0}: {1}" -f $_.Exception.GetType().Name, $_.Exception.Message) |
            ConvertTo-Json -Compress
    }
}
catch {
    Get-SanitizedResult `
        -ErrorCategory "subprocess" `
        -TechnicalDetail ("{0}: {1}" -f $_.Exception.GetType().Name, $_.Exception.Message) |
        ConvertTo-Json -Compress
}
