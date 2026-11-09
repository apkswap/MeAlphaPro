$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$iconPath = Join-Path $PSScriptRoot "..\build\mealpha.ico"
$iconDir = Split-Path -Parent $iconPath
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

$bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.Color]::Transparent)

$rect = [System.Drawing.Rectangle]::new(8, 8, 240, 240)
$path = [System.Drawing.Drawing2D.GraphicsPath]::new()
$radius = 54
$path.AddArc(8, 8, $radius, $radius, 180, 90)
$path.AddArc((240 - $radius), 8, $radius, $radius, 270, 90)
$path.AddArc((240 - $radius), (240 - $radius), $radius, $radius, 0, 90)
$path.AddArc(8, (240 - $radius), $radius, $radius, 90, 90)
$path.CloseFigure()

$gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  $rect,
  [System.Drawing.Color]::FromArgb(255, 8, 74, 150),
  [System.Drawing.Color]::FromArgb(255, 0, 196, 210),
  45
)
$graphics.FillPath($gradient, $path)

$glow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(38, 255, 255, 255))
$graphics.FillEllipse($glow, 145, 20, 100, 100)

$font = [System.Drawing.Font]::new("Segoe UI Symbol", 150, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$format = [System.Drawing.StringFormat]::new()
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString("α", $font, $white, [System.Drawing.RectangleF]::new(0, -4, 256, 256), $format)

$pngStream = [System.IO.MemoryStream]::new()
$bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
$png = $pngStream.ToArray()

$icoStream = [System.IO.FileStream]::new($iconPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
$writer = [System.IO.BinaryWriter]::new($icoStream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$png.Length)
$writer.Write([UInt32]22)
$writer.Write($png)
$writer.Flush()
$writer.Dispose()
$icoStream.Dispose()

$pngStream.Dispose()
$format.Dispose()
$white.Dispose()
$font.Dispose()
$glow.Dispose()
$gradient.Dispose()
$path.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

if ((Get-Item $iconPath).Length -lt 1000) { throw "Generated Windows icon is unexpectedly small." }
Write-Host "Generated 256x256 PNG-backed ICO: $iconPath"
