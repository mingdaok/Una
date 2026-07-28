param(
  [string]$Source = "frontend_react/dist",
  [string]$Target = "backend/static/mobile"
)

$workspacePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$workspacePrefix = $workspacePath.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar

function Resolve-PublishPath {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Publish path cannot be empty."
  }
  if ([IO.Path]::IsPathRooted($Value)) {
    return [IO.Path]::GetFullPath($Value)
  }
  return [IO.Path]::GetFullPath((Join-Path $workspacePath $Value))
}

$sourcePath = Resolve-PublishPath $Source
$targetPath = Resolve-PublishPath $Target
if (-not (Test-Path (Join-Path $sourcePath "index.html"))) {
  throw "Build output not found: $sourcePath. Run npm.cmd run build in frontend_react first."
}
if (-not $targetPath.StartsWith($workspacePrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to publish outside workspace: $targetPath"
}
New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
Copy-Item -Path (Join-Path $sourcePath '*') -Destination $targetPath -Recurse -Force

$targetPrefix = $targetPath.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
$publishedHtml = Get-Content -LiteralPath (Join-Path $targetPath "index.html") -Raw
$currentAssets = @{}
$referencePattern = '(?i)(?:src|href)\s*=\s*["''](?:\./)?(?<path>assets/index-[A-Za-z0-9_-]{8,}\.(?:js|css))(?:[?#][^"'']*)?["'']'
foreach ($match in [regex]::Matches($publishedHtml, $referencePattern)) {
  $relativeAssetPath = $match.Groups["path"].Value.Replace('/', [IO.Path]::DirectorySeparatorChar)
  $absoluteAssetPath = [IO.Path]::GetFullPath((Join-Path $targetPath $relativeAssetPath))
  if (-not $absoluteAssetPath.StartsWith($targetPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing asset reference outside publish target: $relativeAssetPath"
  }
  if (-not (Test-Path -LiteralPath $absoluteAssetPath -PathType Leaf)) {
    throw "Published HTML references a missing asset: $relativeAssetPath"
  }
  $currentAssets[$absoluteAssetPath.ToUpperInvariant()] = $true
}

$assetsPath = Join-Path $targetPath "assets"
if (Test-Path -LiteralPath $assetsPath -PathType Container) {
  foreach ($extension in @("js", "css")) {
    $previousAssets = @(
      Get-ChildItem -LiteralPath $assetsPath -File |
        Where-Object {
          $_.Name -match "^index-[A-Za-z0-9_-]{8,}\.$extension$" -and
          -not $currentAssets.ContainsKey($_.FullName.ToUpperInvariant())
        } |
        Sort-Object -Property `
          @{ Expression = { $_.LastWriteTimeUtc }; Descending = $true }, `
          @{ Expression = { $_.Name }; Descending = $true }
    )
    foreach ($orphan in ($previousAssets | Select-Object -Skip 1)) {
      $orphanPath = [IO.Path]::GetFullPath($orphan.FullName)
      if (-not $orphanPath.StartsWith($targetPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to delete outside publish target: $orphanPath"
      }
      Remove-Item -LiteralPath $orphanPath -Force
    }
  }
}

Write-Host "Frontend published to $targetPath"
