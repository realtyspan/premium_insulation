Add-Type -AssemblyName System.Drawing

$imgDir = Join-Path (Split-Path $PSScriptRoot -Parent) "assets\img"

# Full-bleed images (hero + page banners) get a larger max width.
$fullWidth = @(
  'hero-hangar-biplane.jpg',
  'hangar-dome-1.jpg',
  'attic-corner-1.jpg',
  'wall-batt-1.jpg'
)

# Half-column images (split / zig-zag / service blocks).
$halfWidth = @(
  'crew-exterior-application.jpg',
  'fleet-trucks.jpg',
  'attic-frame-1.jpg',
  'foundation-drillfill-1.jpg',
  'hangar-dome-2.jpg'
)

function Get-MaxWidth($name) {
  if ($fullWidth -contains $name) { return 1920 }
  if ($halfWidth -contains $name) { return 1200 }
  return 1400   # unused/spare gallery images — generic safe web size
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$qualityParam = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]78)
$encoderParams.Param[0] = $qualityParam

$totalBefore = 0
$totalAfter = 0

Get-ChildItem -Path $imgDir -Filter *.jpg | ForEach-Object {
  $file = $_.FullName
  $sizeBefore = $_.Length
  $totalBefore += $sizeBefore
  $maxW = Get-MaxWidth $_.Name

  $img = [System.Drawing.Image]::FromFile($file)
  $origW = $img.Width
  $origH = $img.Height

  $targetW = if ($origW -gt $maxW) { $maxW } else { $origW }
  $targetH = [int]([math]::Round($origH * ($targetW / $origW)))

  $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
  $bmp.SetResolution(72, 72)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($img, 0, 0, $targetW, $targetH)

  $img.Dispose()

  $tempFile = "$file.tmp"
  $bmp.Save($tempFile, $jpegCodec, $encoderParams)
  $graphics.Dispose()
  $bmp.Dispose()

  Move-Item -Force $tempFile $file
  $sizeAfter = (Get-Item $file).Length
  $totalAfter += $sizeAfter

  Write-Host ("{0,-32} {1}x{2} -> {3}x{4}   {5,7:N0} KB -> {6,7:N0} KB" -f $_.Name, $origW, $origH, $targetW, $targetH, [math]::Round($sizeBefore/1KB), [math]::Round($sizeAfter/1KB))
}

Write-Host ""
Write-Host ("TOTAL: {0:N1} MB -> {1:N1} MB" -f ($totalBefore/1MB), ($totalAfter/1MB))
