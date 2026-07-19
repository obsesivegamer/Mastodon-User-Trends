$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$taskName = "EagerBardeenUpdateData"
$taskPath = Join-Path $scriptDir "updateDaily.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"$taskPath\""
$trigger = New-ScheduledTaskTrigger -Daily -At 3am

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description "Run Mastodon data updater daily" -Force

Write-Output "Installed scheduled task: $taskName"
Write-Output "Runs daily at 03:00 local time."
Write-Output "If the command fails due to permissions, rerun PowerShell as Administrator."
