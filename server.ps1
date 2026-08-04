param([int]$Port = 8080)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"

$mime = @{
  ".html" = "text/html"
  ".htm"  = "text/html"
  ".css"  = "text/css"
  ".js"   = "application/javascript"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".json" = "application/json"
  ".yml"  = "text/yaml"
  ".yaml" = "text/yaml"
  ".txt"  = "text/plain"
  ".xml"  = "application/xml"
  ".webmanifest" = "application/manifest+json"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $req = $context.Request
  $res = $context.Response
  try {
    $path = [System.Uri]::UnescapeDataString($req.Url.LocalPath)
    if ($path -eq "/") { $path = "/index.html" }

    # Mirrors the /portfolio/* 200 rewrite in netlify.toml so pretty job URLs
    # can be tested locally instead of only after a deploy.
    if ($path -match '^/portfolio/.+') { $path = "/portfolio-detail.html" }

    # Stands in for Netlify's Image CDN (/.netlify/images?url=...&w=...) so the
    # portfolio uses one set of URLs everywhere. Resizing is Netlify's job —
    # this just returns the original file.
    if ($path -eq "/.netlify/images") {
      $m = [regex]::Match($req.Url.Query, '(?:\?|&)url=([^&]*)')
      if ($m.Success) {
        $path = [System.Uri]::UnescapeDataString($m.Groups[1].Value)
      }
    }

    $filePath = Join-Path $root ($path.TrimStart("/"))

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $res.ContentType = $contentType
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $res.OutputStream.Write($notFound, 0, $notFound.Length)
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.OutputStream.Close()
  }
}
