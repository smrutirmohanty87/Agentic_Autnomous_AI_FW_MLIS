# Regression Tests Runner Script for CI/CD (PowerShell)
# This script runs regression test suite

param(
    [ValidateSet('chrome', 'chromium', 'edge', 'all')]
    [string]$Browser = 'all'
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Regression Test Suite Runner" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

function Run-Tests {
    param(
        [string]$BrowserName,
        [string]$TestCommand
    )
    
    Write-Host "Running Regression tests on $BrowserName..." -ForegroundColor Yellow
    
    try {
        npm run $TestCommand
        Write-Host "✓ Regression tests on $BrowserName passed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Regression tests on $BrowserName failed" -ForegroundColor Red
        return $false
    }
}

# Main execution
$chromeResult = $true
$chromiumResult = $true
$edgeResult = $true

switch ($Browser) {
    'chrome' {
        Write-Host "Running Regression tests on Chrome..." -ForegroundColor Cyan
        $chromeResult = Run-Tests -BrowserName "Chrome" -TestCommand "test:regression:chrome"
        if (-not $chromeResult) { exit 1 }
    }
    'chromium' {
        Write-Host "Running Regression tests on Chromium..." -ForegroundColor Cyan
        $chromiumResult = Run-Tests -BrowserName "Chromium" -TestCommand "test:regression:chromium"
        if (-not $chromiumResult) { exit 1 }
    }
    'edge' {
        Write-Host "Running Regression tests on Microsoft Edge..." -ForegroundColor Cyan
        $edgeResult = Run-Tests -BrowserName "Edge" -TestCommand "test:regression:edge"
        if (-not $edgeResult) { exit 1 }
    }
    'all' {
        Write-Host "Running Regression tests on all browsers..." -ForegroundColor Cyan
        
        $chromeResult = Run-Tests -BrowserName "Chrome" -TestCommand "test:regression:chrome"
        $chromiumResult = Run-Tests -BrowserName "Chromium" -TestCommand "test:regression:chromium"
        $edgeResult = Run-Tests -BrowserName "Edge" -TestCommand "test:regression:edge"
        
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Cyan
        Write-Host "Regression Test Execution Summary:" -ForegroundColor Cyan
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
Write-Host "Regression Tests Completed Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
