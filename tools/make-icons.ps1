# Generates the favicon set + Open Graph share image.
# Uses .NET System.Drawing (no ImageMagick/PIL on this dev machine — same
# constraint as optimize-images.ps1). Re-run only if the brand mark changes.

Add-Type -AssemblyName System.Drawing

$root      = Split-Path $PSScriptRoot -Parent
$assetsDir = Join-Path $root "assets\img"

$red  = [System.Drawing.ColorTranslator]::FromHtml("#c8102e")
$gold = [System.Drawing.ColorTranslator]::FromHtml("#f0a500")

# ---------------------------------------------------------------------------
# Favicon / touch icon: "PI" monogram. The full wordmark is 644x387 and turns
# to mush below ~64px, so the square icons use the brand colors + initials.
# ---------------------------------------------------------------------------
function New-Icon([int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

  $g.Clear($red)

  # Gold rule under the initials, echoing the wordmark's star bar.
  $barH = [math]::Max(1, [int]($size * 0.07))
  $barY = [int]($size * 0.76)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush($gold)),
                   [int]($size * 0.22), $barY, [int]($size * 0.56), $barH)

  $fontSize = $size * 0.52
  $font  = New-Object System.Drawing.Font("Arial Black", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt   = New-Object System.Drawing.StringFormat
  $fmt.Alignment     = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

  $rect = New-Object System.Drawing.RectangleF(0, [single](-$size * 0.06), [single]$size, [single]$size)
  $g.DrawString("PI", $font, (New-Object System.Drawing.SolidBrush($gold)), $rect, $fmt)

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $font.Dispose()
  Write-Host ("icon  {0,-28} {1}x{1}" -f (Split-Path $outPath -Leaf), $size)
}

New-Icon 16  (Join-Path $assetsDir "favicon-16.png")
New-Icon 32  (Join-Path $assetsDir "favicon-32.png")
New-Icon 180 (Join-Path $assetsDir "apple-touch-icon.png")

# ---------------------------------------------------------------------------
# Open Graph image: 1200x630 crop of the truck livery — the strongest, most
# recognizable brand asset, and the one already carrying the company name,
# tagline and phone number.
# ---------------------------------------------------------------------------
$srcPath = Join-Path $assetsDir "truck-logo-closeup.jpg"
$src     = [System.Drawing.Image]::FromFile($srcPath)

$targetW = 1200
$targetH = 630
$ratio   = $targetW / $targetH

# Widest horizontal band the source allows, centered on the truck signage
# (which sits above the vertical middle of this near-square photo).
$cropW = $src.Width
$cropH = [int]($cropW / $ratio)
$cropX = 0
$cropY = [int](($src.Height - $cropH) * 0.35)

$og = New-Object System.Drawing.Bitmap($targetW, $targetH)
$og.SetResolution(72, 72)
$g  = [System.Drawing.Graphics]::FromImage($og)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$destRect = New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)
$g.DrawImage($src, $destRect, $cropX, $cropY, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)

$jpegCodec     = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]82)

$ogPath = Join-Path $assetsDir "og-share.jpg"
$og.Save($ogPath, $jpegCodec, $encoderParams)

$src.Dispose(); $g.Dispose(); $og.Dispose()
Write-Host ("og    {0,-28} {1}x{2}  {3:N0} KB" -f "og-share.jpg", $targetW, $targetH, ((Get-Item $ogPath).Length / 1KB))
