#requires -Version 5.1
# workbench:// URL protocol handler.
# URL format:
#   workbench://open/<id>      open a whitelisted file with its registered app
# Only ids listed in files.json (same folder) are accepted.
param(
    [Parameter(Mandatory = $false, Position = 0)]
    [string]$RawUrl = ''
)

$ErrorActionPreference = 'Stop'

try {
    $dir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $configPath = Join-Path $dir 'files.json'

    if ([string]::IsNullOrWhiteSpace($RawUrl)) { exit 10 }
    if ($RawUrl -notmatch '^workbench://open/(?<id>[A-Za-z0-9._\-]+)$') { exit 11 }

    $id = [Uri]::UnescapeDataString($Matches['id'])

    if (-not (Test-Path -LiteralPath $configPath)) { exit 15 }
    $cfg = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $item = @($cfg.files | Where-Object { $_.id -eq $id } | Select-Object -First 1)
    if ($item.Count -eq 0) { exit 12 }

    $target = $item[0].path
    if (-not (Test-Path -LiteralPath $target)) { exit 13 }

    if ($item[0].app) {
        $argList = New-Object System.Collections.Generic.List[string]
        if ($item[0].appArgs) {
            foreach ($a in [string[]]$item[0].appArgs) { $argList.Add($a) }
        }
        $argList.Add('"' + $target + '"')
        Start-Process -FilePath $item[0].app -ArgumentList $argList.ToArray() | Out-Null
    } else {
        Start-Process -FilePath $target | Out-Null
    }
    exit 0
}
catch {
    exit 1
}
