# Script to update Chrome Extension with new web build

$sourceDir = Join-Path (Split-Path $PSScriptRoot -Parent) "ExpoApp\dist"
$targetDir = $PSScriptRoot

Write-Host "Copying web build from ExpoApp/dist to ChromeExtension..." -ForegroundColor Cyan

# Copy all files except manifest.json, icons, and mediapipe folder
Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourceDir.Length + 1)
    $targetPath = Join-Path $targetDir $relativePath
    
    # Skip manifest.json, icons, and mediapipe (we keep these)
    if ($relativePath -like "manifest.json" -or 
        $relativePath -like "icon*.png" -or 
        $relativePath -like "mediapipe\*" -or
        $relativePath -like "README.md" -or
        $relativePath -like "*.ps1" -or
        $relativePath -like "*.md") {
        return
    }
    
    # Create directory if needed
    $targetParent = Split-Path $targetPath -Parent
    if (-not (Test-Path $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    }
    
    Copy-Item -Path $_.FullName -Destination $targetPath -Force
}

# Rename _expo folder to expo if it exists
$expoUnderscore = Join-Path $targetDir "_expo"
$expoNormal = Join-Path $targetDir "expo"
if (Test-Path $expoUnderscore) {
    if (Test-Path $expoNormal) {
        Remove-Item -Path $expoNormal -Recurse -Force
    }
    Rename-Item -Path $expoUnderscore -NewName "expo"
    Write-Host "Renamed _expo to expo" -ForegroundColor Green
}

# Fix index.html script path
$indexHtml = Join-Path $targetDir "index.html"
if (Test-Path $indexHtml) {
    $content = Get-Content $indexHtml -Raw
    $content = $content -replace '/_expo/', '/expo/'
    
    # Add popup size CSS if not present
    if ($content -notmatch 'min-width:400px') {
        $content = $content -replace '<style id="expo-reset">', '<style id="expo-reset">#root,body,html{height:100%}body{overflow:hidden}#root{display:flex}</style><style>html,body{min-width:400px;min-height:600px;width:400px;height:600px;}</style><style id="react-native-stylesheet">'
    }
    
    Set-Content -Path $indexHtml -Value $content -NoNewline
    Write-Host "Fixed index.html script paths" -ForegroundColor Green
}

Write-Host "`nDone! Extension updated. Now reload it in chrome://extensions" -ForegroundColor Cyan
