[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Low')]
param(
    [Parameter()]
    [string]$ImageDirectory = '/homeassistant/www/house-power-flow-card/images'
)

$ErrorActionPreference = 'Stop'
$resolvedImageDirectory = [System.IO.Path]::GetFullPath($ImageDirectory)

if (-not (Test-Path -LiteralPath $resolvedImageDirectory -PathType Container)) {
    throw "Image directory does not exist: $resolvedImageDirectory"
}

$mapping = [ordered]@{
    '-5 avond.png'                    = 'weather/freezing-night.png'
    '-5 overdag.png'                  = 'weather/freezing-day.png'
    '25plus avond.png'                = 'weather/hot-night.png'
    '25plus overdag.png'              = 'weather/hot-day.png'
    'bewolkt avond.png'               = 'weather/cloudy-night.png'
    'bewolkt overdag.png'             = 'weather/cloudy-day.png'
    'hail day.png'                    = 'weather/hail-day.png'
    'hail night.png'                  = 'weather/hail-night.png'
    'mist day.png'                    = 'weather/mist-day.png'
    'mist night.png'                  = 'weather/mist-night.png'
    'pouring day.png'                 = 'weather/pouring-day.png'
    'pouring night.png'               = 'weather/pouring-night.png'
    'regen avond.png'                 = 'weather/rainy-night.png'
    'regen overdag.png'               = 'weather/rainy-day.png'
    'sneeuw avond.png'                = 'weather/snowy-night.png'
    'sneeuw overdag.png'              = 'weather/snowy-day.png'
    'windy day.png'                   = 'weather/windy-day.png'
    'windy night.png'                 = 'weather/windy-night.png'
    'zon avond.png'                   = 'weather/sunny-night.png'
    'zon overdag.png'                 = 'weather/sunny-day.png'
    'birthday day.png'                = 'holidays/common/birthday-day.png'
    'birthday night.png'              = 'holidays/common/birthday-night.png'
    'halloween day.png'               = 'holidays/common/halloween-day.png'
    'halloween night.png'             = 'holidays/common/halloween-night.png'
    'new years day.png'               = 'holidays/common/new-years-day.png'
    'new years night.png'             = 'holidays/common/new-years-night.png'
    'pasen avond.png'                 = 'holidays/common/easter-night.png'
    'pasen overdag.png'               = 'holidays/common/easter-day.png'
    'hemelvaart avond.png'            = 'holidays/common/ascension-day-night.png'
    'hemelvaart overdag.png'          = 'holidays/common/ascension-day-day.png'
    'kerst avond.png'                 = 'holidays/common/christmas-night.png'
    'kerst overdag.png'               = 'holidays/common/christmas-day.png'
    'moederdag avond.png'             = 'holidays/common/mothers-day-night.png'
    'moederdag overdag.png'           = 'holidays/common/mothers-day-day.png'
    'pinksteren avond.png'            = 'holidays/common/pentecost-night.png'
    'pinksteren overdag.png'          = 'holidays/common/pentecost-day.png'
    'vaderdag avond.png'              = 'holidays/common/fathers-day-night.png'
    'vaderdag overdag.png'            = 'holidays/common/fathers-day-day.png'
    'valentine Day.png'               = 'holidays/common/valentines-day-day.png'
    'valentine night.png'             = 'holidays/common/valentines-day-night.png'
    'bevrijdingsdag avond.png'        = 'holidays/nl/liberation-day-night.png'
    'bevrijdingsdag overdag.png'      = 'holidays/nl/liberation-day-day.png'
    'dodenherdenking avond.png'       = 'holidays/nl/remembrance-day-night.png'
    'dodenherdenking overdag.png'     = 'holidays/nl/remembrance-day-day.png'
    'koningsdag avond.png'            = 'holidays/nl/kings-day-night.png'
    'koningsdag overdag.png'          = 'holidays/nl/kings-day-day.png'
    'sinterklaas avond.png'           = 'holidays/nl/sinterklaas-night.png'
    'sinterklaas overdag.png'         = 'holidays/nl/sinterklaas-day.png'
    'nieuwjaar avond.png'             = 'holidays/nl/legacy-new-years-night.png'
    'nieuwjaar overdag.png'           = 'holidays/nl/legacy-new-years-day.png'
}

# Validate every destination before moving a single file. Existing targets are
# never overwritten, even when the script is run more than once.
$moves = @()
foreach ($entry in $mapping.GetEnumerator()) {
    $source = Join-Path $resolvedImageDirectory $entry.Key
    $destination = Join-Path $resolvedImageDirectory $entry.Value

    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        if (Test-Path -LiteralPath $destination -PathType Leaf) {
            Write-Verbose "Already migrated: $($entry.Value)"
        } else {
            Write-Warning "Missing source (skipped): $($entry.Key)"
        }
        continue
    }

    if (Test-Path -LiteralPath $destination) {
        throw "Destination already exists; nothing was moved: $destination"
    }

    $moves += [pscustomobject]@{
        Source = $source
        Destination = $destination
        RelativeDestination = $entry.Value
    }
}

foreach ($move in $moves) {
    $destinationDirectory = Split-Path -Parent $move.Destination
    if ($PSCmdlet.ShouldProcess($move.Source, "Move to $($move.RelativeDestination)")) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        Move-Item -LiteralPath $move.Source -Destination $move.Destination
    }
}

Write-Host "Validated $($mapping.Count) mappings; moved $($moves.Count) files."
Write-Host "No existing destination was overwritten and no source file was deleted."
