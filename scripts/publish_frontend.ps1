param(
  [string]$Source = "frontend_react/dist",
  [string]$Target = "backend/static/mobile"
)

$sourcePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\$Source"))
$targetPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\$Target"))
$workspacePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
if (-not (Test-Path (Join-Path $sourcePath "index.html"))) {
  throw "Build output not found: $sourcePath. Run npm.cmd run build in frontend_react first."
}
if (-not $targetPath.StartsWith($workspacePath, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to publish outside workspace: $targetPath"
}
New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
Copy-Item -Path (Join-Path $sourcePath '*') -Destination $targetPath -Recurse -Force
Write-Host "Frontend published to $targetPath"
