param(
  [Parameter(Mandatory = $true)]
  [string]$ExcelPath,

  [Parameter(Mandatory = $false)]
  [string]$SheetName = 'Policy Numbers',

  [Parameter(Mandatory = $true)]
  [string]$PolicyNumber,

  [Parameter(Mandatory = $true)]
  [string]$TestName,

  [Parameter(Mandatory = $true)]
  [string]$PortalType,

  [Parameter(Mandatory = $true)]
  [string]$Environment,

  [Parameter(Mandatory = $true)]
  [string]$DateTime
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Set-Headers {
  param(
    [Parameter(Mandatory = $true)]$Worksheet
  )

  $Worksheet.Cells.Item(1, 1).Value2 = 'Run #'
  $Worksheet.Cells.Item(1, 2).Value2 = 'Policy Number'
  $Worksheet.Cells.Item(1, 3).Value2 = 'Test Name'
  $Worksheet.Cells.Item(1, 4).Value2 = 'Portal Type'
  $Worksheet.Cells.Item(1, 5).Value2 = 'Environment'
  $Worksheet.Cells.Item(1, 6).Value2 = 'Date / Time'
}

try {
  $excel = [Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application')
} catch {
  # Excel is not open, so caller should use file-write fallback.
  exit 2
}

try {
  $resolvedPath = [System.IO.Path]::GetFullPath($ExcelPath)
  $targetWorkbook = $null

  foreach ($workbook in $excel.Workbooks) {
    $candidatePath = [System.IO.Path]::GetFullPath([string]$workbook.FullName)
    if ([string]::Equals($candidatePath, $resolvedPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      $targetWorkbook = $workbook
      break
    }
  }

  if ($null -eq $targetWorkbook) {
    # Workbook is not currently open in Excel.
    exit 3
  }

  $worksheet = $null
  foreach ($sheet in $targetWorkbook.Worksheets) {
    if ([string]$sheet.Name -eq $SheetName) {
      $worksheet = $sheet
      break
    }
  }

  if ($null -eq $worksheet) {
    $worksheet = $targetWorkbook.Worksheets.Add()
    $worksheet.Name = $SheetName
    Set-Headers -Worksheet $worksheet
  }

  $xlUp = -4162
  $lastRow = [int]$worksheet.Cells.Item($worksheet.Rows.Count, 1).End($xlUp).Row
  if ($lastRow -lt 1) {
    $lastRow = 1
  }

  $firstCell = [string]$worksheet.Cells.Item(1, 1).Value2
  if ([string]::IsNullOrWhiteSpace($firstCell)) {
    Set-Headers -Worksheet $worksheet
    $lastRow = 1
  }

  $prevRun = 0
  if ($lastRow -gt 1) {
    $prevValue = $worksheet.Cells.Item($lastRow, 1).Value2
    if ($null -ne $prevValue -and "$prevValue" -match '^\d+$') {
      $prevRun = [int]$prevValue
    }
  }

  $nextRun = $prevRun + 1
  $nextRow = $lastRow + 1

  $worksheet.Cells.Item($nextRow, 1).Value2 = $nextRun
  $worksheet.Cells.Item($nextRow, 2).Value2 = $PolicyNumber
  $worksheet.Cells.Item($nextRow, 3).Value2 = $TestName
  $worksheet.Cells.Item($nextRow, 4).Value2 = $PortalType
  $worksheet.Cells.Item($nextRow, 5).Value2 = $Environment
  $worksheet.Cells.Item($nextRow, 6).Value2 = $DateTime

  $targetWorkbook.Save()
  exit 0
} catch {
  Write-Error $_
  exit 1
}