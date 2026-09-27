param(
    [string]$Python = "python",
    [ValidateRange(1024,65535)][int]$Port = 8001,
    [string]$ConfigFile = ".qq.env"
)
$ErrorActionPreference = "Stop"
$qqRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
Set-Location -LiteralPath $qqRoot
$qqConfig = if ([IO.Path]::IsPathRooted($ConfigFile)) { $ConfigFile } else { Join-Path $qqRoot $ConfigFile }
if (-not (Test-Path -LiteralPath $qqConfig)) { throw "Copy .qq.env.example to .qq.env and configure the QQ runtime first." }
foreach ($qqLine in Get-Content -LiteralPath $qqConfig -Encoding UTF8) {
    $qqLine = $qqLine.Trim()
    if (-not $qqLine -or $qqLine.StartsWith('#')) { continue }
    if ($qqLine -notmatch '^([A-Z][A-Z0-9_]*)=(.*)$') { throw "Invalid configuration line (expected KEY=value)." }
    $qqName = $Matches[1]
    $qqValue = $Matches[2].Trim().Trim('"').Trim("'")
    if ($qqName -notlike 'UNA_*') { throw "Only UNA_* settings are accepted." }
    [Environment]::SetEnvironmentVariable($qqName, $qqValue, 'Process')
}
$qqData = Join-Path $qqRoot '.qq-data'
New-Item -ItemType Directory -Path $qqData -Force | Out-Null
# Always isolate state, even if the caller inherited the original application's paths.
$env:UNA_DB_PATH = Join-Path $qqData 'una.sqlite3'
$env:UNA_CHROMA_PATH = Join-Path $qqData 'chroma'
$env:UNA_QQ_MEDIA_DIR = Join-Path $qqData 'media'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:UNA_ENV = 'development'
if (-not $env:UNA_JWT_SECRET -or $env:UNA_JWT_SECRET.Length -lt 32) { throw 'Configure a separate UNA_JWT_SECRET of at least 32 characters.' }
$qqDependencyCheck = @"
import importlib.util, sys
modules = {'fastapi':'fastapi', 'uvicorn':'uvicorn', 'jwt':'PyJWT', 'pwdlib':'pwdlib[argon2]', 'aiohttp':'aiohttp', 'PIL':'Pillow', 'multipart':'python-multipart', 'funasr':'funasr', 'modelscope':'modelscope', 'chromadb':'chromadb', 'sentence_transformers':'sentence-transformers', 'tzdata':'tzdata', 'openai':'openai', 'torch':'torch', 'torchaudio':'torchaudio', 'edge_tts':'edge-tts', 'apscheduler':'apscheduler', 'yaml':'PyYAML', 'matplotlib':'matplotlib', 'dotenv':'python-dotenv', 'websockets':'websockets'}
missing = [package for module, package in modules.items() if importlib.util.find_spec(module) is None]
print('Python:', sys.executable)
if missing:
    print('Missing packages:', ', '.join(missing))
    sys.exit(1)
import fastapi, uvicorn, jwt, pwdlib, aiohttp, PIL
print('QQ runtime dependencies available')
"@
& $Python -c $qqDependencyCheck
if ($LASTEXITCODE -ne 0) { throw 'Missing Python dependencies. Install backend/requirements.txt into your selected environment.' }
Write-Host "UNA QQ workspace: http://127.0.0.1:$Port"
Write-Host "Reverse WebSocket: ws://127.0.0.1:$Port/integrations/qq/onebot/ws"
& $Python -m uvicorn main_server:app --app-dir backend --host 127.0.0.1 --port $Port --workers 1 --ws-max-size 262144
exit $LASTEXITCODE
