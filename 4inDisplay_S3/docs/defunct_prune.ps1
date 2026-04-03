<# 
  Run from the folder that contains: Doxyfile and the "html" folder.
  This script will:
    1) Delete .\html
    2) Run doxygen Doxyfile
    3) Prune build-only files, gzip html/css/js/svg
    4) Remove all contents of ..\data\docs
    5) Copy results to ..\data\docs (preserving subfolders), keeping only *.gz and images
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- paths ---
$Root = $PWD
$HtmlDir = Join-Path $Root "html"
$DestDir = Join-Path (Split-Path $Root -Parent) "data\docs"

# --- step 1: delete html directory ---
if (Test-Path $HtmlDir) {
    Write-Host "==> Removing existing '$HtmlDir'..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $HtmlDir
}

# --- step 2: run doxygen ---
if (-not (Get-Command doxygen -ErrorAction SilentlyContinue)) {
    Write-Error "doxygen not found in PATH. Install it or open a shell where 'doxygen' is available."
}
Write-Host "==> Running 'doxygen Doxyfile'..." -ForegroundColor Cyan
& doxygen "Doxyfile"

if (-not (Test-Path $HtmlDir)) {
    Write-Error "Doxygen did not create '$HtmlDir'. Check Doxyfile's OUTPUT_DIRECTORY/GENERATE_HTML."
}

# --- step 3a: prune build-only cruft ---
Write-Host "==> Pruning build-only files in '$HtmlDir'..." -ForegroundColor Cyan
Get-ChildItem -Path "$HtmlDir\*" -Recurse -Include *.md5, *_org.svg, *.map, *.dot -File |
Remove-Item -Force -ErrorAction SilentlyContinue

foreach ($sub in @("latex", "rtf", "man", "xml")) {
    $p = Join-Path $HtmlDir $sub
    if (Test-Path $p) {
        Write-Host "Removing $p" -ForegroundColor DarkYellow
        Remove-Item -Recurse -Force $p
    }
}

# optional: drop Doxygen client-side search to save space
$SearchDir = Join-Path $HtmlDir "search"
if (Test-Path $SearchDir) {
    Write-Host "Removing search/ (optional space saver)" -ForegroundColor DarkYellow
    Remove-Item -Recurse -Force $SearchDir
}


# --- step 3b: gzip html/css/js/svg (in place) ---
Write-Host "==> Gzipping HTML/CSS/JS/SVG (in place)..." -ForegroundColor Cyan
$targets = Get-ChildItem -Path "$HtmlDir\*" -Recurse -File |
Where-Object { $_.Extension -in ('.html', '.css', '.js', '.svg') }

$counter = 0
foreach ($f in $targets) {
    $in = $f.FullName
    $out = "$in.gz"
    if (Test-Path $out) { Remove-Item $out -Force -ErrorAction SilentlyContinue }

    $fs = [IO.File]::OpenRead($in)
    $gzOut = [IO.File]::Create($out)
    $gzip = New-Object IO.Compression.GZipStream($gzOut, [IO.Compression.CompressionLevel]::Optimal)
    $fs.CopyTo($gzip)
    $gzip.Dispose(); $fs.Dispose(); $gzOut.Dispose()

    $counter++
    if (($counter % 50) -eq 0) { Write-Host ("  gzipped {0} files..." -f $counter) }
}
Write-Host ("==> Gzipped {0} files." -f $counter) -ForegroundColor Green


# Remove ONLY top-level dir_* pages in the HTML output root (raw and gz)
Write-Host "==> Removing top-level dir_* files from HTML root..." -ForegroundColor Yellow

# Raw files in html root
Get-ChildItem -Path $HtmlDir -File -Filter 'dir_*.*' -ErrorAction SilentlyContinue |
Remove-Item -Force -ErrorAction SilentlyContinue

# Any leftover gz in html root
Get-ChildItem -Path $HtmlDir -File -Include 'dir_*.html.gz', 'dir_*.js.gz', 'dir_*.svg.gz' -ErrorAction SilentlyContinue |
Remove-Item -Force -ErrorAction SilentlyContinue


# --- step 4: clear ../data/docs ---
Write-Host "==> Clearing old contents of '$DestDir'..." -ForegroundColor Yellow
if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Force -Path $DestDir | Out-Null }
Get-ChildItem -Path $DestDir -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# --- step 5: copy to ..\data\docs with ROBOCOPY (preserve structure, include only wanted files) ---
Write-Host "==> Publishing to '$DestDir'..." -ForegroundColor Cyan

# File masks to include (space-separated). Robocopy supports multiple masks.
$includeMasks = @("*.gz", "*.png", "*.jpg", "*.jpeg", "*.ico", "*.gif", "*.webp")

# Build robocopy args: source, dest, masks..., /S recurse (no empty dirs), retry/wait low, quiet logs
$rcArgs = @("$HtmlDir", "$DestDir") + $includeMasks + @("/S", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
# Optional: exclude any remaining big folders just in case (already pruned above)
# $rcArgs += @("/XD","search","latex","rtf","man","xml")

# Run it
$LastExitCode = 0
robocopy @rcArgs | Out-Null

# Robocopy uses special exit codes; 0 and 1 mean success (1 = some files copied)
if ($LastExitCode -gt 7) {
    Write-Error "Robocopy failed with exit code $LastExitCode"
}
else {
    Write-Host "==> Copy complete (robocopy exit $LastExitCode)." -ForegroundColor Green
}

Write-Host "All done. Now run:  pio run -e Display -t uploadfs" -ForegroundColor Cyan


# change back to project root (parent of docs/)
Set-Location (Split-Path $Root -Parent)

# run uploadfs for your environment
pio run -e Display -t uploadfs