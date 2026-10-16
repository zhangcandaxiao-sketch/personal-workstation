#requires -Version 5.1
# Register the workbench:// URL protocol for the current user (no admin needed).
# Re-run this script whenever this folder is moved.
$ErrorActionPreference = 'Stop'

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$openScript = Join-Path $dir 'open.ps1'
$psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

$command = '"' + $psExe + '" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $openScript + '" "%1"'

$base = 'HKCU:\SOFTWARE\Classes\workbench'
New-Item -Path $base -Force | Out-Null
Set-ItemProperty -Path $base -Name '(default)' -Value 'URL:Workbench Local Launcher'
Set-ItemProperty -Path $base -Name 'URL Protocol' -Value '' -Type String

$cmdKey = Join-Path $base 'shell\open\command'
New-Item -Path $cmdKey -Force | Out-Null
Set-ItemProperty -Path $cmdKey -Name '(default)' -Value $command

Write-Host '[OK] workbench:// protocol registered.'
Write-Host '     Handler:' $command
Write-Host ''
Write-Host 'Test:  Start-Process "workbench://open/project-declaration-template"'
