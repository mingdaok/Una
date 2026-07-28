$ErrorActionPreference = "Stop"

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

function Write-FixtureFile {
  param(
    [string]$Path,
    [string]$Content
  )
  $parent = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
}

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$testDirectoryName = ".publish_frontend_test_$([Guid]::NewGuid().ToString('N'))"
$testRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot $testDirectoryName))
$sourcePath = Join-Path $testRoot "source"
$targetPath = Join-Path $testRoot "target"
$publishScript = Join-Path $repoRoot "scripts\publish_frontend.ps1"

try {
  Write-FixtureFile -Path (Join-Path $sourcePath "index.html") -Content @'
<!doctype html>
<html>
  <head>
    <script type="module" src="./assets/index-CURR0001.js"></script>
    <link rel="stylesheet" href="./assets/index-CURR0001.css">
  </head>
</html>
'@
  Write-FixtureFile -Path (Join-Path $sourcePath "assets\index-CURR0001.js") -Content "current js"
  Write-FixtureFile -Path (Join-Path $sourcePath "assets\index-CURR0001.css") -Content "current css"

  $previousJs = Join-Path $targetPath "assets\index-PREV0001.js"
  $previousCss = Join-Path $targetPath "assets\index-PREV0001.css"
  $oldestJs = Join-Path $targetPath "assets\index-OLD00001.js"
  $oldestCss = Join-Path $targetPath "assets\index-OLD00001.css"
  Write-FixtureFile -Path $previousJs -Content "previous js"
  Write-FixtureFile -Path $previousCss -Content "previous css"
  Write-FixtureFile -Path $oldestJs -Content "oldest js"
  Write-FixtureFile -Path $oldestCss -Content "oldest css"
  Write-FixtureFile -Path (Join-Path $targetPath "assets\index-runtime.js") -Content "non-hash index asset"
  Write-FixtureFile -Path (Join-Path $targetPath "assets\avatar.png") -Content "image"
  Write-FixtureFile -Path (Join-Path $targetPath "assets\model-HASH0001.json") -Content "model"
  $outsideHash = Join-Path $testRoot "outside\index-OUTS0001.js"
  Write-FixtureFile -Path $outsideHash -Content "outside target"

  $referenceTime = [DateTime]::UtcNow
  (Get-Item -LiteralPath $previousJs).LastWriteTimeUtc = $referenceTime.AddHours(-1)
  (Get-Item -LiteralPath $previousCss).LastWriteTimeUtc = $referenceTime.AddHours(-1)
  (Get-Item -LiteralPath $oldestJs).LastWriteTimeUtc = $referenceTime.AddHours(-2)
  (Get-Item -LiteralPath $oldestCss).LastWriteTimeUtc = $referenceTime.AddHours(-2)

  & $publishScript `
    -Source "$testDirectoryName/source" `
    -Target "$testDirectoryName/target"

  Assert-True (Test-Path -LiteralPath (Join-Path $targetPath "assets\index-CURR0001.js")) "Current JS was not published."
  Assert-True (Test-Path -LiteralPath (Join-Path $targetPath "assets\index-CURR0001.css")) "Current CSS was not published."
  Assert-True (Test-Path -LiteralPath $previousJs) "Newest previous JS was deleted."
  Assert-True (Test-Path -LiteralPath $previousCss) "Newest previous CSS was deleted."
  Assert-True (-not (Test-Path -LiteralPath $oldestJs)) "Third JS version was not deleted."
  Assert-True (-not (Test-Path -LiteralPath $oldestCss)) "Third CSS version was not deleted."
  Assert-True (Test-Path -LiteralPath (Join-Path $targetPath "assets\index-runtime.js")) "Non-hash index asset was deleted."
  Assert-True (Test-Path -LiteralPath (Join-Path $targetPath "assets\avatar.png")) "Image asset was deleted."
  Assert-True (Test-Path -LiteralPath (Join-Path $targetPath "assets\model-HASH0001.json")) "Model asset was deleted."
  Assert-True (Test-Path -LiteralPath $outsideHash) "A hash outside the explicit target was deleted."

  $publishedHtml = Get-Content -LiteralPath (Join-Path $targetPath "index.html") -Raw
  $referencedAssets = [regex]::Matches(
    $publishedHtml,
    '(?:src|href)="(?:\./)?(?<path>assets/index-[^"]+\.(?:js|css))"'
  )
  Assert-True ($referencedAssets.Count -eq 2) "Expected one JS and one CSS reference in published HTML."
  foreach ($match in $referencedAssets) {
    $assetPath = $match.Groups["path"].Value.Replace("/", [IO.Path]::DirectorySeparatorChar)
    Assert-True (Test-Path -LiteralPath (Join-Path $targetPath $assetPath)) "Published HTML references a missing asset: $assetPath"
  }

  & $publishScript -Source $sourcePath -Target $targetPath
  Assert-True (Test-Path -LiteralPath (Join-Path $targetPath "index.html")) "Absolute source and target paths were not published."

  Write-Host "PASS: publish_frontend keeps current and newest previous hashes only."
}
finally {
  $safePrefix = $repoRoot.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
  if ($testRoot.StartsWith($safePrefix, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $testRoot)) {
    Remove-Item -LiteralPath $testRoot -Recurse -Force
  }
}
