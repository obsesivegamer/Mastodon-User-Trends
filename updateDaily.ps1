$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required to run this script and must be on PATH."
    exit 1
}

Write-Output "Updating Mastodon historical data..."
node .\updateData.js 2>&1 | Tee-Object -FilePath .\updateData.log

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Output "Update complete."
