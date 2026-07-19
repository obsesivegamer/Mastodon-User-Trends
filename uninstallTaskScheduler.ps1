$taskName = "EagerBardeenUpdateData"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Output "Uninstalled scheduled task: $taskName"
} else {
    Write-Output "Scheduled task not found: $taskName"
}
