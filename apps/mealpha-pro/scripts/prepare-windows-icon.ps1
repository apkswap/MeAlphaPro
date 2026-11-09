$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$sourcePath = Join-Path $repoRoot "apps\mealpha-pro\public\mealpha-original.png"
$iconPath = Join-Path $repoRoot "apps\mealpha-pro\build\mealpha.ico"
$iconDir = Split-Path -Parent $iconPath

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Approved transparent MeAlpha logo was not found: $sourcePath"
}
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

$source = [System.Drawing.Image]::FromFile($sourcePath)
try {
  $canvas = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $scale = [Math]::Min(232.0 / $source.Width, 232.0 / $source.Height)
      $width = [int][Math]::Round($source.Width * $scale)
      $height = [int][Math]::Round($source.Height * $scale)
      $x = [int](($canvas.Width - $width) / 2)
      $y = [int](($canvas.Height - $height) / 2)
      $graphics.DrawImage($source, $x, $y, $width, $height)

      $pngStream = [System.IO.MemoryStream]::new()
      try {
        $canvas.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBytes = $pngStream.ToArray()
      } finally {
        $pngStream.Dispose()
      }
    } finally {
      $graphics.Dispose()
    }
  } finally {
    $canvas.Dispose()
  }
} finally {
  $source.Dispose()
}

$stream = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create)
try {
  $writer = [System.IO.BinaryWriter]::new($stream)
  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]1)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$pngBytes.Length)
    $writer.Write([UInt32]22)
    $writer.Write($pngBytes)
  } finally {
    $writer.Dispose()
  }
} finally {
  $stream.Dispose()
}

if ((Get-Item $iconPath).Length -lt 1000) {
  throw "Generated Windows icon is unexpectedly small."
}
Write-Host "Generated Windows icon from the approved transparent MeAlpha logo: $iconPath"
