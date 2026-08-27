# Practice Mastery Platform - Start All Script
# This script installs dependencies and starts both backend and frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Practice Mastery Platform - Starting" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if npm exists
function Test-CommandExists {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
if (-not (Test-CommandExists "npm")) {
    Write-Host "npm is not installed! Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "npm found!" -ForegroundColor Green
Write-Host ""

# Set project root
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "React.shadcn.JS-Template-main"

Write-Host "Installing Backend Dependencies..." -ForegroundColor Yellow
if (Test-Path $BackendPath) {
    Set-Location $BackendPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install backend dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Backend dependencies installed!" -ForegroundColor Green
}
else {
    Write-Host "Backend folder not found at $BackendPath!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "Installing Frontend Dependencies..." -ForegroundColor Yellow
if (Test-Path $FrontendPath) {
    Set-Location $FrontendPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install frontend dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Frontend dependencies installed!" -ForegroundColor Green
}
else {
    Write-Host "Frontend folder not found at $FrontendPath!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "Starting servers..." -ForegroundColor Yellow
Write-Host ""

# Start Backend in a new PowerShell window
Write-Host "  - Starting Backend server..." -ForegroundColor Cyan
$BackendCommand = "cd `"$BackendPath`"; npm start"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $BackendCommand

# Start Frontend in another new PowerShell window
Start-Sleep -Seconds 2
Write-Host "  - Starting Frontend server..." -ForegroundColor Cyan
$FrontendCommand = "cd `"$FrontendPath`"; npm run dev"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $FrontendCommand

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All servers are starting!" -ForegroundColor Green
Write-Host "  - Backend: http://localhost:3000" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
