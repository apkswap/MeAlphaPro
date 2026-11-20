$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$sourcePath = Join-Path $repoRoot "apps\mealpha-pro\public\mealpha-purple-gold.jpg"
$iconPath = Join-Path $repoRoot "apps\mealpha-pro\build\mealpha.ico"
$iconDir = Split-Path -Parent $iconPath

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Approved MeAlpha app artwork was not found: $sourcePath"
}
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

$source = [System.Drawing.Image]::FromFile($sourcePath)
$images = @()
try {
  # Multi-resolution ICO: Windows selects the sharpest native size for each surface.
  foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $crop = [Math]::Min($source.Width, $source.Height)
        $sourceX = [int](($source.Width - $crop) / 2)
        $sourceY = [int](($source.Height - $crop) / 2)
        $sourceRect = [System.Drawing.Rectangle]::new($sourceX, $sourceY, $crop, $crop)
        $targetRect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
        $graphics.DrawImage($source, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)

        $pngStream = [System.IO.MemoryStream]::new()
        try {
          $bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
          $images += ,@{ Size = $size; Bytes = $pngStream.ToArray() }
        } finally {
          $pngStream.Dispose()
        }
      } finally {
        $graphics.Dispose()
      }
    } finally {
      $bitmap.Dispose()
    }
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
    $writer.Write([UInt16]$images.Count)
    $offset = 6 + (16 * $images.Count)
    foreach ($image in $images) {
      $dimension = if ($image.Size -eq 256) { [Byte]0 } else { [Byte]$image.Size }
      $writer.Write($dimension)
      $writer.Write($dimension)
      $writer.Write([Byte]0)
      $writer.Write([Byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$image.Bytes.Length)
      $writer.Write([UInt32]$offset)
      $offset += $image.Bytes.Length
    }
    foreach ($image in $images) {
      $writer.Write($image.Bytes)
    }
  } finally {
    $writer.Dispose()
  }
} finally {
  $stream.Dispose()
}

if ((Get-Item $iconPath).Length -lt 5000) {
  throw "Generated Windows icon is unexpectedly small."
}
Write-Host "Generated multi-resolution, full-bleed MeAlpha Windows icon: $iconPath"
