$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$generator = Join-Path $PSScriptRoot "generate-brand-assets.mjs"
Push-Location $repoRoot
try {
  node $generator --windows
  if ($LASTEXITCODE -ne 0) {
    throw "Vector Windows icon generation failed."
  }
} finally {
  Pop-Location
}
