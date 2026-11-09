$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$iconPath = Join-Path $PSScriptRoot "..\build\mealpha.ico"
$iconDir = Split-Path -Parent $iconPath
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
$bmp = [System.Drawing.Bitmap]::new(256,256,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$rect = [System.Drawing.Rectangle]::new(7,7,242,242)
$tile = [System.Drawing.Drawing2D.GraphicsPath]::new()
$r=58
$tile.AddArc(7,7,$r,$r,180,90); $tile.AddArc(242-$r,7,$r,$r,270,90)
$tile.AddArc(242-$r,242-$r,$r,$r,0,90); $tile.AddArc(7,242-$r,$r,$r,90,90); $tile.CloseFigure()
$bg=[System.Drawing.Drawing2D.LinearGradientBrush]::new($rect,[System.Drawing.Color]::FromArgb(255,20,73,150),[System.Drawing.Color]::FromArgb(255,1,12,48),45)
$g.FillPath($bg,$tile)
$edge=[System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(230,103,190,255),3.5)
$g.DrawPath($edge,$tile)
$glow=[System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40,0,190,255))
$g.FillEllipse($glow,48,54,160,142)
$shadow=[System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(90,0,190,255),34)
$shadow.StartCap=[System.Drawing.Drawing2D.LineCap]::Round; $shadow.EndCap=[System.Drawing.Drawing2D.LineCap]::Round
$g.DrawBezier($shadow,34,145,80,38,115,220,222,104)
$g.DrawBezier($shadow,34,104,88,220,142,38,222,145)
$p=[System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255,15,190,255),25)
$p.StartCap=[System.Drawing.Drawing2D.LineCap]::Round; $p.EndCap=[System.Drawing.Drawing2D.LineCap]::Round
$g.DrawBezier($p,34,145,80,38,115,220,222,104)
$g.DrawBezier($p,34,104,88,220,142,38,222,145)
$hi=[System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(190,168,247,255),3)
$hi.StartCap=[System.Drawing.Drawing2D.LineCap]::Round; $hi.EndCap=[System.Drawing.Drawing2D.LineCap]::Round
$g.DrawBezier($hi,35,140,80,44,115,212,218,105)
$g.DrawBezier($hi,37,108,88,213,142,45,218,141)
$ms=[System.IO.MemoryStream]::new()
$bmp.Save($ms,[System.Drawing.Imaging.ImageFormat]::Png)
$bytes=$ms.ToArray()
$stream=[System.IO.File]::Open($iconPath,[System.IO.FileMode]::Create)
$w=[System.IO.BinaryWriter]::new($stream)
$w.Write([UInt16]0);$w.Write([UInt16]1);$w.Write([UInt16]1)
$w.Write([Byte]0);$w.Write([Byte]0);$w.Write([Byte]0);$w.Write([Byte]0)
$w.Write([UInt16]1);$w.Write([UInt16]32);$w.Write([UInt32]$bytes.Length);$w.Write([UInt32]22);$w.Write($bytes)
$w.Dispose();$stream.Dispose();$ms.Dispose()
$hi.Dispose();$p.Dispose();$shadow.Dispose();$glow.Dispose();$edge.Dispose();$bg.Dispose();$tile.Dispose();$g.Dispose();$bmp.Dispose()
if((Get-Item $iconPath).Length -lt 1000){throw "Generated icon is unexpectedly small."}
Write-Host "Generated 256x256 MeAlpha blue infinity ICO: $iconPath"
