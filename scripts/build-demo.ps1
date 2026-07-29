$ErrorActionPreference = "Stop"

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$packageJsonPath = Join-Path $repositoryRoot "package.json"
$distPath = Join-Path $repositoryRoot "dist"
$demoPath = Join-Path $repositoryRoot "demo"
$operationId = [System.Guid]::NewGuid().ToString("N")
$stagingPath = Join-Path $repositoryRoot ".demo-staging-$operationId"
$backupPath = Join-Path $repositoryRoot ".demo-backup-$operationId"
$demoExisted = Test-Path -LiteralPath $demoPath
$replacementStarted = $false
$replacementCompleted = $false

function Remove-DirectoryContents {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    foreach ($item in @(Get-ChildItem -LiteralPath $Path -Force)) {
        Remove-Item -LiteralPath $item.FullName -Recurse -Force
    }
}

function Copy-DirectoryContents {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    foreach ($item in @(Get-ChildItem -LiteralPath $Source -Force)) {
        Copy-Item -LiteralPath $item.FullName -Destination $Destination -Recurse -Force
    }
}

try {
    if (-not (Test-Path -LiteralPath $packageJsonPath -PathType Leaf)) {
        throw "package.json was not found at the resolved repository root: $repositoryRoot"
    }

    $npmCommand = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    if ($null -eq $npmCommand) {
        $npmCommand = Get-Command "npm" -ErrorAction SilentlyContinue
    }
    if ($null -eq $npmCommand) {
        throw "npm is required to build ShipCommand but was not found on PATH. The existing demo folder was not changed."
    }

    Write-Host "Building ShipCommand production assets..."
    Push-Location -LiteralPath $repositoryRoot
    try {
        & $npmCommand.Source run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE. The existing demo folder was not changed."
        }
    }
    finally {
        Pop-Location
    }

    $distIndexPath = Join-Path $distPath "index.html"
    if (-not (Test-Path -LiteralPath $distIndexPath -PathType Leaf)) {
        throw "The production build did not create dist/index.html. The existing demo folder was not changed."
    }

    $distItems = @(Get-ChildItem -LiteralPath $distPath -Force)
    if ($distItems.Count -eq 0) {
        throw "The production build output is empty. The existing demo folder was not changed."
    }

    New-Item -ItemType Directory -Path $stagingPath | Out-Null
    foreach ($distItem in $distItems) {
        Copy-Item -LiteralPath $distItem.FullName -Destination $stagingPath -Recurse -Force
    }

    $stagedIndexPath = Join-Path $stagingPath "index.html"
    if (-not (Test-Path -LiteralPath $stagedIndexPath -PathType Leaf)) {
        throw "The staged demo copy is missing index.html. The existing demo folder was not changed."
    }

    $stagedItems = @(Get-ChildItem -LiteralPath $stagingPath -Force)
    if ($stagedItems.Count -eq 0) {
        throw "The staged demo copy is empty. The existing demo folder was not changed."
    }

    New-Item -ItemType Directory -Path $backupPath | Out-Null
    if ($demoExisted) {
        Copy-DirectoryContents -Source $demoPath -Destination $backupPath
    }

    $replacementStarted = $true
    try {
        if (-not (Test-Path -LiteralPath $demoPath)) {
            New-Item -ItemType Directory -Path $demoPath | Out-Null
        }
        Remove-DirectoryContents -Path $demoPath
        Copy-DirectoryContents -Source $stagingPath -Destination $demoPath
    }
    catch {
        throw
    }

    $demoIndexPath = Join-Path $demoPath "index.html"
    if (-not (Test-Path -LiteralPath $demoIndexPath -PathType Leaf)) {
        throw "The refreshed demo is missing index.html."
    }

    $demoItems = @(Get-ChildItem -LiteralPath $demoPath -Force)
    if ($demoItems.Count -eq 0) {
        throw "The refreshed demo is empty."
    }

    foreach ($distItem in $distItems) {
        $matchingDemoItem = Join-Path $demoPath $distItem.Name
        if (-not (Test-Path -LiteralPath $matchingDemoItem)) {
            throw "The refreshed demo is missing the top-level build item: $($distItem.Name)"
        }
    }

    $replacementCompleted = $true

    Write-Host ""
    Write-Host "ShipCommand demo build completed."
    Write-Host ""
    Write-Host "Source:"
    Write-Host $distPath
    Write-Host ""
    Write-Host "Demo:"
    Write-Host $demoPath
    Write-Host ""
    Write-Host "To run on the work computer:"
    Write-Host "    cd demo"
    Write-Host "    python -m http.server 8000"
    Write-Host ""
    Write-Host "Then open:"
    Write-Host "    http://localhost:8000"
    Write-Host ""
    Write-Host "Commit and push the refreshed demo before pulling it on the work computer:"
    Write-Host "    git status"
    Write-Host "    git add demo scripts/build-demo.ps1 package.json docs/DEVELOPMENT.md"
    Write-Host '    git commit -m "Refresh work-computer demo build"'
    Write-Host "    git push origin main"
}
catch {
    if ($replacementStarted -and -not $replacementCompleted) {
        if (-not (Test-Path -LiteralPath $demoPath)) {
            New-Item -ItemType Directory -Path $demoPath | Out-Null
        }
        Remove-DirectoryContents -Path $demoPath
        if ($demoExisted -and (Test-Path -LiteralPath $backupPath)) {
            Copy-DirectoryContents -Source $backupPath -Destination $demoPath
        }
    }
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    if (Test-Path -LiteralPath $stagingPath) {
        Remove-Item -LiteralPath $stagingPath -Recurse -Force
    }
    if (Test-Path -LiteralPath $backupPath) {
        Remove-Item -LiteralPath $backupPath -Recurse -Force
    }
}

exit 0
