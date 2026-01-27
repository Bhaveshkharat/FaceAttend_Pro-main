# PowerShell script to download MediaPipe files for Chrome Extension

$mediapipeDir = Join-Path $PSScriptRoot "mediapipe"

# Create mediapipe folder if it doesn't exist
if (-not (Test-Path $mediapipeDir)) {
    New-Item -ItemType Directory -Path $mediapipeDir | Out-Null
    Write-Host "Created mediapipe folder"
}

# URLs to download
$files = @(
    @{
        Name = "camera_utils.js"
        Url = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
    },
    @{
        Name = "control_utils.js"
        Url = "https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"
    },
    @{
        Name = "drawing_utils.js"
        Url = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
    },
    @{
        Name = "face_mesh.js"
        Url = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
    }
)

# Download each file
foreach ($file in $files) {
    $outputPath = Join-Path $mediapipeDir $file.Name
    Write-Host "Downloading $($file.Name)..."
    try {
        Invoke-WebRequest -Uri $file.Url -OutFile $outputPath -UseBasicParsing
        Write-Host "✓ Downloaded $($file.Name)" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to download $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`nDone! All MediaPipe files should be in: $mediapipeDir" -ForegroundColor Cyan
