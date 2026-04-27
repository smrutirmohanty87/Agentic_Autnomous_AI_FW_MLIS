# Sanity Tests Runner Script for CI/CD (PowerShell)
# This script runs sanity test suite

param(
    [ValidateSet('chrome', 'chromium', 'edge', 'all')]
    [string]$Browser = 'all'
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Sanity Test Suite Runner" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

function Run-Tests {
    param(
        [string]$BrowserName,
        [string]$TestCommand
    )
    
    Write-Host "Running Sanity tests on $BrowserName..." -ForegroundColor Yellow
    
    try {
        npm run $TestCommand
        Write-Host "✓ Sanity tests on $BrowserName passed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Sanity tests on $BrowserName failed" -ForegroundColor Red
        return $false
    }
}

# Main execution
$chromeResult = $true
$chromiumResult = $true
$edgeResult = $true

switch ($Browser) {
    'chrome' {
        Write-Host "Running Sanity tests on Chrome..." -ForegroundColor Cyan
        $chromeResult = Run-Tests -BrowserName "Chrome" -TestCommand "test:sanity:chrome"
        if (-not $chromeResult) { exit 1 }
    }
    'chromium' {
        Write-Host "Running Sanity tests on Chromium..." -ForegroundColor Cyan
        $chromiumResult = Run-Tests -BrowserName "Chromium" -TestCommand "test:sanity:chromium"
        if (-not $chromiumResult) { exit 1 }
    }
    'edge' {
        Write-Host "Running Sanity tests on Microsoft Edge..." -ForegroundColor Cyan
        $edgeResult = Run-Tests -BrowserName "Edge" -TestCommand "test:sanity:edge"
        if (-not $edgeResult) { exit 1 }
    }
    'all' {
        Write-Host "Running Sanity tests on all browsers..." -ForegroundColor Cyan
        
        $chromeResult = Run-Tests -BrowserName "Chrome" -TestCommand "test:sanity:chrome"
        $chromiumResult = Run-Tests -BrowserName "Chromium" -TestCommand "test:sanity:chromium"
        $edgeResult = Run-Tests -BrowserName "Edge" -TestCommand "test:sanity:edge"
        
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Cyan
        Write-Host "Sanity Test Execution Summary:" -ForegroundColor Cyan
        Write-Host "================================================" -ForegroundColor Cyan
        
        if ($chromeResult) {
            Write-Host "✓ Chrome: PASSED" -ForegroundColor Green
        } else {
            Write-Host "✗ Chrome: FAILED" -ForegroundColor Red
        }
        
        if ($chromiumResult) {
            Write-Host "✓ Chromium: PASSED" -ForegroundColor Green
        } else {
            Write-Host "✗ Chromium: FAILED" -ForegroundColor Red
        }
        
        if ($edgeResult) {
            Write-Host "✓ Edge: PASSED" -ForegroundColor Green
        } else {
            Write-Host "✗ Edge: FAILED" -ForegroundColor Red
        }
        
        if (-not $chromeResult -or -not $chromiumResult -or -not $edgeResult) {
            exit 1
        }
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Sanity Tests Completed Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
