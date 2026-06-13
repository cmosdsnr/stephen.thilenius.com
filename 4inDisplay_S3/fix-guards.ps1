# fix-guards.ps1
# Converts all #ifndef include guards to #pragma once across include/

$root = "$PSScriptRoot\include"
$converted = 0
$added = 0
$skipped = 0

Get-ChildItem $root -Recurse -Filter *.h | ForEach-Object {
    $file = $_.FullName
    $lines = @(Get-Content $file)

    # Already has #pragma once — skip
    if ($lines | Where-Object { $_ -match '#pragma\s+once' }) {
        $skipped++
        return
    }

    $guardIdx   = -1
    $guardSymbol = ''
    $defineIdx  = -1
    $endifIdx   = -1

    # Find first non-blank, non-comment line; check if it's a #ifndef include guard
    $inComment = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i].Trim()
        if ($line -eq '') { continue }
        # Track /* ... */ comment blocks
        if ($line -match '^/\*') { $inComment = $true }
        if ($inComment) {
            if ($line -match '\*/') { $inComment = $false }
            continue
        }
        # Skip // line comments
        if ($line -match '^//') { continue }
        # First real non-comment line — is it a #ifndef guard?
        if ($line -match '^#ifndef\s+(\w+)\s*$') {
            $guardIdx    = $i
            $guardSymbol = $Matches[1]
        }
        break  # stop regardless
    }

    # Verify the very next non-blank line is #define of the same symbol
    if ($guardIdx -ge 0) {
        $j = $guardIdx + 1
        while ($j -lt $lines.Count -and $lines[$j].Trim() -eq '') { $j++ }
        if ($j -lt $lines.Count -and $lines[$j].Trim() -match "^#define\s+$([regex]::Escape($guardSymbol))\s*$") {
            $defineIdx = $j
        } else {
            $guardIdx = -1   # not an include guard
        }
    }

    # Verify the last non-blank line is #endif (the guard closer)
    if ($defineIdx -ge 0) {
        $k = $lines.Count - 1
        while ($k -ge 0 -and $lines[$k].Trim() -eq '') { $k-- }
        if ($k -ge 0 -and $lines[$k].Trim() -eq '#endif') {
            $endifIdx = $k
        } else {
            $guardIdx  = -1
            $defineIdx = -1
        }
    }

    # Remove the three guard lines
    $removeIdx = @{}
    if ($guardIdx  -ge 0) { $removeIdx[$guardIdx]  = $true }
    if ($defineIdx -ge 0) { $removeIdx[$defineIdx] = $true }
    if ($endifIdx  -ge 0) { $removeIdx[$endifIdx]  = $true }

    $newLines = [System.Collections.Generic.List[string]]::new()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if (-not $removeIdx.ContainsKey($i)) { $newLines.Add($lines[$i]) }
    }
    $lines = @($newLines)

    # Find insertion point: after leading /** ... */ doc comment, or at position 0
    $insertAt  = 0
    $inComment = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i].Trim()
        if ($line -eq '' -and -not $inComment) {
            # Leading blank lines before the comment — keep scanning
            if ($insertAt -eq 0) { continue }
            break   # blank line after comment = end of header block
        }
        if ($line -match '^/\*') {
            $inComment = $true
            $insertAt  = $i + 1
            if ($line -match '\*/') { $inComment = $false; break }
            continue
        }
        if ($inComment) {
            $insertAt = $i + 1
            if ($line -match '\*/') { $inComment = $false; break }
            continue
        }
        break  # hit a non-blank non-comment line with no leading comment
    }

    # Insert #pragma once (+ blank line) at insertAt
    $before = if ($insertAt -gt 0 -and $insertAt -le $lines.Count) { $lines[0..($insertAt - 1)] } else { @() }
    $after  = if ($insertAt -lt $lines.Count) { $lines[$insertAt..($lines.Count - 1)] } else { @() }
    $lines  = $before + @('#pragma once', '') + $after

    Set-Content -Path $file -Value $lines -Encoding UTF8

    if ($guardIdx -ge 0) {
        $converted++
        Write-Host "CONVERTED  $($_.Name)  [$guardSymbol]"
    } else {
        $added++
        Write-Host "ADDED      $($_.Name)  (no guard)"
    }
}

Write-Host ""
Write-Host "Done: $converted converted, $added added pragma once, $skipped already had pragma once"
