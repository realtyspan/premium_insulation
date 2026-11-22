# Downsizes + re-encodes site photography in place.
# Uses .NET System.Drawing (no ImageMagick/PIL on this dev machine).
#
# IDEMPOTENT: JPEG re-encoding is lossy, so a script that reprocessed every
# file on every run would compound quality loss each time. Each image is
# therefore skipped once it is already within both its width and size budget,
# which means a re-run after adding one new photo only touches that photo.
#
# Extensions are matched explicitly rather than with Get-ChildItem -Include,
# because on Windows the wildcard '*.jpg' also matches '.jpeg' files and would
# emit a duplicate copy of every .jpeg it processed.

Add-Type -AssemblyName System.Drawing

$imgDir = Join-Path (Split-Path $PSScriptRoot -Parent) "assets\img"

# Generated at exact dimensions by make-icons.ps1 — re-encoding these would
# only degrade them, so they are never processed here.
$skip = @(
  'og-share.jpg',
  'favicon-16.png',
  'favicon-32.png',
  'apple-touch-icon.png'
)

# Full-bleed hero + page banners. These always sit behind a dark overlay, so
# they tolerate heavier compression than a photo the visitor studies directly.
$fullWidth = @(
  'hero-hangar-biplane.jpg',
  'hero1-hangar-biplane.jpg',
  'hangar-dome-1.jpg',
  'attic-corner-1.jpg',
  'wall-batt-1.jpg'
)

# Half-column images (split / zig-zag / service blocks), shown ~600px wide.
$halfWidth = @(
  'crew-exterior-application.jpg',
  'fleet-trucks.jpg',
  'attic-frame-1.jpg',
  'foundation-drillfill-1.jpg',
  'hangar-dome-2.jpg',
  'GreenFiber.jpeg'
)

# Per-bucket: max pixel width, JPEG quality, and the size budget under which a
# file is considered already optimized.
function Get-Budget($name, $isPng) {
  if ($isPng)                    { return @{ Width = 480;  Quality = 0;  MaxKB = 180 } }
  if ($fullWidth -contains $name) { return @{ Width = 1600; Quality = 72; MaxKB = 320 } }
  if ($halfWidth -contains $name) { return @{ Width = 1200; Quality = 78; MaxKB = 200 } }
  return @{ Width = 1400; Quality = 78; MaxKB = 240 }   # gallery / spare
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

$totalBefore = 0
$totalAfter  = 0
$processed   = 0

Get-ChildItem -Path $imgDir -File -Recurse |
  Where-Object { $_.Extension -imatch '^\.(jpg|jpeg|png)$' } |
  ForEach-Object {

  $name = $_.Name

  if ($skip -contains $name) {
    Write-Host ("{0,-32} skipped (generated asset)" -f $name)
    return
  }

  $file       = $_.FullName
  $isPng      = $_.Extension -ieq '.png'
  $sizeBefore = $_.Length
  $budget     = Get-Budget $name $isPng

  $img   = [System.Drawing.Image]::FromFile($file)
  $origW = $img.Width
  $origH = $img.Height

  # Already small enough in both dimensions and bytes — leave it untouched.
  if ($origW -le $budget.Width -and ($sizeBefore / 1KB) -le $budget.MaxKB) {
    $img.Dispose()
    $totalBefore += $sizeBefore
    $totalAfter  += $sizeBefore
    Write-Host ("{0,-32} ok ({1}x{2}, {3:N0} KB)" -f $name, $origW, $origH, [math]::Round($sizeBefore/1KB))
    return
  }

  $totalBefore += $sizeBefore

  $targetW = [math]::Min($origW, $budget.Width)
  $targetH = [int]([math]::Round($origH * ($targetW / $origW)))

  # 32bpp ARGB preserves the logo's transparency; JPEGs flatten it anyway.
  $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bmp.SetResolution(72, 72)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.CompositingMode   = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($img, 0, 0, $targetW, $targetH)
  $img.Dispose()

  $tempFile = "$file.tmp"
  if ($isPng) {
    $bmp.Save($tempFile, [System.Drawing.Imaging.ImageFormat]::Png)
  } else {
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$budget.Quality)
    $bmp.Save($tempFile, $jpegCodec, $encoderParams)
    $encoderParams.Dispose()
  }
  $graphics.Dispose()
  $bmp.Dispose()

  # If the re-encode gained nothing and the pixel dimensions did not change,
  # the file is already at this quality floor. Keeping the original avoids
  # spending a lossy generation for no benefit — and, because the guard above
  # would otherwise flag it as over budget forever, avoids doing so on every
  # future run.
  $candidate = (Get-Item $tempFile).Length
  if ($targetW -eq $origW -and $candidate -gt ($sizeBefore * 0.92)) {
    Remove-Item -Force $tempFile
    $totalAfter += $sizeBefore
    Write-Host ("{0,-32} at quality floor ({1}x{2}, {3:N0} KB)" -f $name, $origW, $origH, [math]::Round($sizeBefore/1KB))
    return
  }

  Move-Item -Force $tempFile $file
  $sizeAfter  = (Get-Item $file).Length
  $totalAfter += $sizeAfter
  $processed++

  Write-Host ("{0,-32} {1}x{2} -> {3}x{4}   {5,6:N0} KB -> {6,6:N0} KB" -f $name, $origW, $origH, $targetW, $targetH, [math]::Round($sizeBefore/1KB), [math]::Round($sizeAfter/1KB))
}

Write-Host ""
Write-Host ("{0} file(s) processed.  TOTAL: {1:N1} MB -> {2:N1} MB" -f $processed, ($totalBefore/1MB), ($totalAfter/1MB))
