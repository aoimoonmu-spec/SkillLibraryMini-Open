param(
  [string]$PngDestination = (Join-Path (Split-Path -Parent $PSScriptRoot) 'app\assets\skill-library-icon.png'),
  [string]$Destination = (Join-Path (Split-Path -Parent $PSScriptRoot) 'app\assets\SkillLibraryMini.ico')
)

Add-Type -AssemblyName System.Drawing

function New-RoundedPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath; $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90); $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90); $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure(); return $path
}
function Draw-RoundedCard($graphics, $x, $y, $width, $height, $radius, $start, $end) {
  $path = New-RoundedPath $x $y $width $height $radius
  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.PointF]::new($x, $y), [System.Drawing.PointF]::new($x + $width, $y + $height), $start, $end)
  $graphics.FillPath($brush, $path); $brush.Dispose(); $path.Dispose()
}
function Draw-SkillLibraryIcon($pngPath) {
  $canvas = New-Object System.Drawing.Bitmap 1024, 1024; $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias; $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.Clear([System.Drawing.Color]::Transparent)
  $background = New-RoundedPath 40 40 944 944 212
  $backgroundBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Point]::new(90, 70), [System.Drawing.Point]::new(934, 954), [System.Drawing.Color]::FromArgb(89, 67, 239), [System.Drawing.Color]::FromArgb(19, 118, 241))
  $graphics.FillPath($backgroundBrush, $background); $backgroundBrush.Dispose(); $background.Dispose()
  # ponytail: fixed, simple card silhouettes preserve recognition at icon sizes down to 16px.
  Draw-RoundedCard $graphics 440 205 330 540 72 ([System.Drawing.Color]::FromArgb(183, 142, 255)) ([System.Drawing.Color]::FromArgb(98, 59, 234))
  Draw-RoundedCard $graphics 306 295 350 540 72 ([System.Drawing.Color]::FromArgb(134, 234, 255)) ([System.Drawing.Color]::FromArgb(51, 120, 242))
  Draw-RoundedCard $graphics 170 405 385 430 70 ([System.Drawing.Color]::FromArgb(255, 255, 255)) ([System.Drawing.Color]::FromArgb(221, 221, 255))
  $line1 = New-RoundedPath 254 525 218 52 26; $line2 = New-RoundedPath 254 635 168 44 22
  $lineBrush1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(92, 68, 237)); $lineBrush2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(156, 164, 249))
  $graphics.FillPath($lineBrush1, $line1); $graphics.FillPath($lineBrush2, $line2); $lineBrush1.Dispose(); $lineBrush2.Dispose(); $line1.Dispose(); $line2.Dispose(); $graphics.Dispose()
  $canvas.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png); return $canvas
}

$canvas = Draw-SkillLibraryIcon $PngDestination; $sizes = 16, 24, 32, 48, 64, 128, 256
$entries = foreach ($size in $sizes) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.DrawImage($canvas, 0, 0, $size, $size); $graphics.Dispose()
  $maskStride = [Math]::Ceiling($size / 32) * 4; [pscustomobject]@{ Size = $size; Bitmap = $bitmap; Bytes = 40 + ($size * $size * 4) + ($maskStride * $size) }
}
$canvas.Dispose(); $stream = [System.IO.File]::Open($Destination, [System.IO.FileMode]::Create); $writer = New-Object System.IO.BinaryWriter $stream
$writer.Write([UInt16]0); $writer.Write([UInt16]1); $writer.Write([UInt16]$entries.Count); $offset = 6 + (16 * $entries.Count)
foreach ($entry in $entries) { $byteSize = if ($entry.Size -eq 256) { 0 } else { $entry.Size }; $writer.Write([byte]$byteSize); $writer.Write([byte]$byteSize); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([UInt16]1); $writer.Write([UInt16]32); $writer.Write([UInt32]$entry.Bytes); $writer.Write([UInt32]$offset); $offset += $entry.Bytes }
foreach ($entry in $entries) {
  $size = $entry.Size; $bitmap = $entry.Bitmap; $maskStride = [Math]::Ceiling($size / 32) * 4
  $writer.Write([UInt32]40); $writer.Write([Int32]$size); $writer.Write([Int32]($size * 2)); $writer.Write([UInt16]1); $writer.Write([UInt16]32); $writer.Write([UInt32]0); $writer.Write([UInt32]($size * $size * 4)); $writer.Write([Int32]0); $writer.Write([Int32]0); $writer.Write([UInt32]0); $writer.Write([UInt32]0)
  for ($y = $size - 1; $y -ge 0; $y--) { for ($x = 0; $x -lt $size; $x++) { $pixel = $bitmap.GetPixel($x, $y); $writer.Write([byte]$pixel.B); $writer.Write([byte]$pixel.G); $writer.Write([byte]$pixel.R); $writer.Write([byte]$pixel.A) } }
  $writer.Write((New-Object byte[] ($maskStride * $size))); $bitmap.Dispose()
}
$writer.Dispose()
