# Build the Chrome Web Store submission zip.
#   powershell -ExecutionPolicy Bypass -File dev/pack.ps1
#
# Ships exactly the files Chrome loads: every tracked file except dev/ and the
# repo docs (LICENSE, *.md, dotfiles). Entry paths use "/" — Windows
# PowerShell's Compress-Archive writes "\", which the Web Store uploader chokes
# on (especially for _locales/), so entries are written explicitly.

$ErrorActionPreference = "Stop"
$src = Split-Path $PSScriptRoot -Parent
$name = Split-Path $src -Leaf
$version = (Get-Content (Join-Path $src "manifest.json") | ConvertFrom-Json).version
$zip = Join-Path (Split-Path $src) "$name-v$version.zip"

$docs = @("LICENSE", ".gitignore", ".gitattributes")
$files = git -C $src ls-files | Where-Object {
  ($_ -notlike "dev/*") -and ($_ -notlike "*.md") -and ($docs -notcontains $_)
}

if (Test-Path $zip) { [System.IO.File]::Delete($zip) }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$fs = [System.IO.File]::Open($zip, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($f in ($files | Sort-Object)) {
  $entry = $archive.CreateEntry(($f -replace "\\", "/"), [System.IO.Compression.CompressionLevel]::Optimal)
  $es = $entry.Open()
  $bytes = [System.IO.File]::ReadAllBytes((Join-Path $src $f))
  $es.Write($bytes, 0, $bytes.Length)
  $es.Close()
}
$archive.Dispose()
$fs.Close()

Write-Output "$zip"
[System.IO.Compression.ZipFile]::OpenRead($zip).Entries | ForEach-Object { "  $($_.FullName)" }
Write-Output ("  ({0:N0} bytes)" -f (Get-Item $zip).Length)
