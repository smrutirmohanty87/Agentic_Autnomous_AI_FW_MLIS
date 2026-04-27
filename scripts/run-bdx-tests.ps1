# BDX Tests Runner Script for CI/CD (PowerShell)
# This script runs BDX test scenarios separately

param(
    [ValidateSet('intro', 'rest', 'all')]
    [string]$TestType = 'all'
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "BDX Test Suite Runner" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

function Run-Tests {
    param(
        [string]$TestName,
        [string]$TestCommand
    )
    
    Write-Host "Running $TestName..." -ForegroundColor Yellow
    
    try {
        npm run $TestCommand
        Write-Host "✓ $TestName passed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ $TestName failed" -ForegroundColor Red
        return $false
    }
}

# Main execution
$introResult = $true
$restResult = $true

switch ($TestType) {
    'intro' {
        Write-Host "Running BDX INTRO scenario..." -ForegroundColor Cyan
        $introResult = Run-Tests -TestName "BDX INTRO" -TestCommand "test:bdx:intro"
        if (-not $introResult) { exit 1 }
    }
    'rest' {
        Write-Host "Running BDX REST scenarios (INTER, BDE, NO COMM)..." -ForegroundColor Cyan
        $restResult = Run-Tests -TestName "BDX REST" -TestCommand "test:bdx:rest"
        if (-not $restResult) { exit 1 }
    }
    'all' {
        Write-Host "Running all BDX scenarios..." -ForegroundColor Cyan
        
        $introResult = Run-Tests -TestName "BDX INTRO" -TestCommand "test:bdx:intro"
        $restResult = Run-Tests -TestName "BDX REST" -TestCommand "test:bdx:rest"
        
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Cyan
        Write-Host "Test Execution Summary:" -ForegroundColor Cyan
        Write-Host "================================================" -ForegroundColor Cyan
        
        if ($introResult) {
            Write-Host "✓ BDX INTRO: PASSED" -ForegroundColor Green
        } else {
            Write-Host "✗ BDX INTRO: FAILED" -ForegroundColor Red
        }
        
        if ($restResult) {
            Write-Host "✓ BDX REST: PASSED" -ForegroundColor Green
        } else {
            Write-Host "✗ BDX REST: FAILED" -ForegroundColor Red
        }
        
        if (-not $introResult -or -not $restResult) {
            exit 1
        }
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "BDX Tests Completed Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
