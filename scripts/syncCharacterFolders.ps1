param(
  [string]$WorkbookPath = "",
  [string]$CharactersRoot = "",
  [switch]$DryRun,
  [switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($WorkbookPath)) {
  $WorkbookPath = Join-Path $PSScriptRoot "..\assets\characters\Character.xlsx"
}

if ([string]::IsNullOrWhiteSpace($CharactersRoot)) {
  $CharactersRoot = Join-Path $PSScriptRoot "..\assets\characters"
}

$WorkbookPath = [System.IO.Path]::GetFullPath($WorkbookPath)
$CharactersRoot = [System.IO.Path]::GetFullPath($CharactersRoot)
$OldRoot = Join-Path $CharactersRoot "old"
$BackupRoot = Join-Path $CharactersRoot "backup"
$EnglishHeader = [string]::Concat([char]0x82F1, [char]0x540D)
$CatalogTypeHeader = [string]::Concat([char]0x30AB, [char]0x30BF, [char]0x30ED, [char]0x30B0, [char]0x533A, [char]0x5206)
$VariantCandidateSheetName = [string]::Concat([char]0x5225, [char]0x500B, [char]0x4F53, [char]0x5019, [char]0x88DC)
$script:KnownWorldFolderNames = New-Object "System.Collections.Generic.HashSet[string]" ([System.StringComparer]::OrdinalIgnoreCase)

if (-not (Test-Path -LiteralPath $WorkbookPath -PathType Leaf)) {
  throw "Workbook not found: $WorkbookPath"
}

if (-not (Test-Path -LiteralPath $CharactersRoot -PathType Container)) {
  throw "Characters root not found: $CharactersRoot"
}

function Join-NormalizedPath {
  param([string]$Left, [string]$Right)
  return [System.IO.Path]::GetFullPath((Join-Path $Left $Right))
}

function Test-IsUnderPath {
  param([string]$Path, [string]$ParentPath)

  if ([string]::IsNullOrWhiteSpace($ParentPath)) {
    return $false
  }

  $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
  $fullParent = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd('\', '/')

  return $fullPath.Equals($fullParent, [System.StringComparison]::OrdinalIgnoreCase) -or
    $fullPath.StartsWith($fullParent + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
}

function Convert-ToSafeFolderName {
  param([string]$Name)

  if ($null -eq $Name) {
    $safeName = ""
  }
  else {
    $safeName = $Name.Trim()
  }
  foreach ($char in [System.IO.Path]::GetInvalidFileNameChars()) {
    $safeName = $safeName.Replace([string]$char, "_")
  }

  $safeName = $safeName.Trim().TrimEnd(".")
  if ([string]::IsNullOrWhiteSpace($safeName)) {
    return $null
  }

  return $safeName
}

function Get-ColumnNameFromCellReference {
  param([string]$Reference)

  if ($Reference -match "^([A-Z]+)") {
    return $Matches[1]
  }

  return $null
}

function Get-XmlDocument {
  param([string]$Path)

  $xml = New-Object System.Xml.XmlDocument
  $xml.PreserveWhitespace = $true
  $xml.Load($Path)
  return $xml
}

function New-NamespaceManager {
  param(
    [System.Xml.XmlDocument]$Document,
    [string]$Prefix,
    [string]$Uri
  )

  $namespaceManager = New-Object System.Xml.XmlNamespaceManager -ArgumentList $Document.NameTable
  $namespaceManager.AddNamespace($Prefix, $Uri)
  return ,$namespaceManager
}

function Get-SharedStrings {
  param([string]$ExtractRoot)

  $sharedStringsPath = Join-Path $ExtractRoot "xl\sharedStrings.xml"
  if (-not (Test-Path -LiteralPath $sharedStringsPath -PathType Leaf)) {
    return @()
  }

  $document = Get-XmlDocument $sharedStringsPath
  $namespaceManager = New-NamespaceManager $document "m" "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  $items = New-Object System.Collections.Generic.List[string]

  foreach ($item in $document.SelectNodes("//m:si", $namespaceManager)) {
    $textParts = New-Object System.Collections.Generic.List[string]
    foreach ($textNode in $item.SelectNodes(".//m:t", $namespaceManager)) {
      [void]$textParts.Add($textNode.InnerText)
    }
    [void]$items.Add(($textParts -join ""))
  }

  return $items.ToArray()
}

function Get-CellValue {
  param(
    [System.Xml.XmlElement]$Cell,
    [string[]]$SharedStrings,
    [System.Xml.XmlNamespaceManager]$NamespaceManager
  )

  $cellType = $Cell.GetAttribute("t")

  if ($cellType -eq "s") {
    $valueNode = $Cell.SelectSingleNode("m:v", $NamespaceManager)
    if ($null -eq $valueNode -or [string]::IsNullOrWhiteSpace($valueNode.InnerText)) {
      return ""
    }

    $index = [int]$valueNode.InnerText
    if ($index -ge 0 -and $index -lt $SharedStrings.Count) {
      return $SharedStrings[$index]
    }

    return ""
  }

  if ($cellType -eq "inlineStr") {
    $textParts = New-Object System.Collections.Generic.List[string]
    foreach ($textNode in $Cell.SelectNodes(".//m:t", $NamespaceManager)) {
      [void]$textParts.Add($textNode.InnerText)
    }
    return ($textParts -join "")
  }

  $plainValueNode = $Cell.SelectSingleNode("m:v", $NamespaceManager)
  if ($null -eq $plainValueNode) {
    return ""
  }

  return $plainValueNode.InnerText
}

function Get-SheetsFromWorkbook {
  param([string]$ExtractRoot)

  $workbookPath = Join-Path $ExtractRoot "xl\workbook.xml"
  $relsPath = Join-Path $ExtractRoot "xl\_rels\workbook.xml.rels"

  $workbookDocument = Get-XmlDocument $workbookPath
  $workbookNamespace = New-NamespaceManager $workbookDocument "m" "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  $workbookNamespace.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

  $relsDocument = Get-XmlDocument $relsPath
  $relsNamespace = New-NamespaceManager $relsDocument "rel" "http://schemas.openxmlformats.org/package/2006/relationships"

  $relationshipTargets = @{}
  foreach ($relationship in $relsDocument.SelectNodes("//rel:Relationship", $relsNamespace)) {
    $relationshipTargets[$relationship.GetAttribute("Id")] = $relationship.GetAttribute("Target")
  }

  $sheets = New-Object System.Collections.Generic.List[object]
  foreach ($sheet in $workbookDocument.SelectNodes("//m:sheet", $workbookNamespace)) {
    $sheetName = $sheet.GetAttribute("name")
    $relationshipId = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

    if (-not $relationshipTargets.ContainsKey($relationshipId)) {
      continue
    }

    $target = ($relationshipTargets[$relationshipId] -replace "/", "\").TrimStart([char[]]"\/")
    if ($target.StartsWith("xl\", [System.StringComparison]::OrdinalIgnoreCase)) {
      $worksheetPath = Join-Path $ExtractRoot $target
    }
    else {
      $worksheetPath = Join-Path (Join-Path $ExtractRoot "xl") $target
    }

    [void]$sheets.Add([pscustomobject]@{
        Name = $sheetName
        WorksheetPath = [System.IO.Path]::GetFullPath($worksheetPath)
      })
  }

  return $sheets
}

function Get-EnglishNamesFromWorksheet {
  param(
    [string]$WorksheetPath,
    [string[]]$SharedStrings
  )

  $document = Get-XmlDocument $WorksheetPath
  $namespaceManager = New-NamespaceManager $document "m" "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  $rows = $document.SelectNodes("//m:sheetData/m:row", $namespaceManager)
  $englishColumn = $null
  $catalogTypeColumn = $null
  $names = New-Object System.Collections.Generic.List[string]

  foreach ($row in $rows) {
    $rowNumber = 0
    [void][int]::TryParse($row.GetAttribute("r"), [ref]$rowNumber)

    $valuesByColumn = @{}
    foreach ($cell in $row.SelectNodes("m:c", $namespaceManager)) {
      $columnName = Get-ColumnNameFromCellReference $cell.GetAttribute("r")
      if ($null -eq $columnName) {
        continue
      }

      $valuesByColumn[$columnName] = (Get-CellValue $cell $SharedStrings $namespaceManager).Trim()
    }

    if ($rowNumber -eq 1 -or $null -eq $englishColumn) {
      foreach ($key in $valuesByColumn.Keys) {
        if ($valuesByColumn[$key] -eq $EnglishHeader) {
          $englishColumn = $key
        }

        if ($valuesByColumn[$key] -eq $CatalogTypeHeader) {
          $catalogTypeColumn = $key
        }
      }

      continue
    }

    if ($null -eq $englishColumn) {
      continue
    }

    if ($null -ne $catalogTypeColumn -and $valuesByColumn.ContainsKey($catalogTypeColumn)) {
      $catalogType = $valuesByColumn[$catalogTypeColumn]
      if (-not [string]::IsNullOrWhiteSpace($catalogType) -and
        -not $catalogType.Equals("base_species", [System.StringComparison]::OrdinalIgnoreCase) -and
        -not $catalogType.Equals("rare", [System.StringComparison]::OrdinalIgnoreCase)) {
        continue
      }
    }

    if ($valuesByColumn.ContainsKey($englishColumn)) {
      $englishName = $valuesByColumn[$englishColumn]
      if (-not [string]::IsNullOrWhiteSpace($englishName)) {
        [void]$names.Add($englishName)
      }
    }
  }

  return $names.ToArray()
}

function Ensure-Directory {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path -PathType Container) {
    return "existing"
  }

  if ($DryRun) {
    if (-not $Quiet) {
      Write-Host "[dry-run] create: $Path"
    }
    return "created"
  }

  New-Item -ItemType Directory -Force -Path $Path | Out-Null
  if (-not $Quiet) {
    Write-Host "created: $Path"
  }
  return "created"
}

function Find-FolderOutsideOld {
  param(
    [string]$FolderName,
    [string]$DesiredPath
  )

  $matches = Get-ChildItem -LiteralPath $CharactersRoot -Directory -Recurse -Force |
    Where-Object {
      $parent = [System.IO.Directory]::GetParent($_.FullName)
      $parentParent = if ($null -ne $parent) { $parent.Parent } else { $null }
      $isUnderKnownWorldFolder = $false
      if ($null -ne $parent -and $null -ne $parentParent) {
        $isUnderKnownWorldFolder =
          $parentParent.FullName.Equals($CharactersRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
          $script:KnownWorldFolderNames.Contains($parent.Name)
      }

      $_.Name.Equals($FolderName, [System.StringComparison]::OrdinalIgnoreCase) -and
      -not (Test-IsUnderPath $_.FullName $OldRoot) -and
      -not (Test-IsUnderPath $_.FullName $BackupRoot) -and
      -not $isUnderKnownWorldFolder -and
      -not $_.FullName.Equals($DesiredPath, [System.StringComparison]::OrdinalIgnoreCase)
    } |
    Sort-Object `
      @{ Expression = { if ([System.IO.Path]::GetDirectoryName($_.FullName).Equals($CharactersRoot, [System.StringComparison]::OrdinalIgnoreCase)) { 0 } else { 1 } } },
      @{ Expression = { $_.FullName.Split([System.IO.Path]::DirectorySeparatorChar).Count } },
      FullName

  return @($matches)
}

function Move-OrMergeFolder {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  if (Test-IsUnderPath $SourcePath $OldRoot) {
    if (-not $Quiet) {
      Write-Host "skip old: $SourcePath"
    }
    return "skippedOld"
  }

  if (Test-IsUnderPath $SourcePath $BackupRoot) {
    if (-not $Quiet) {
      Write-Host "skip backup: $SourcePath"
    }
    return "skippedBackup"
  }

  if ($SourcePath.Equals($DestinationPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return "existing"
  }

  $destinationParent = [System.IO.Path]::GetDirectoryName($DestinationPath)

  if (-not (Test-Path -LiteralPath $DestinationPath -PathType Container)) {
    if ($DryRun) {
      if (-not $Quiet) {
        Write-Host "[dry-run] move: $SourcePath -> $DestinationPath"
      }
      return "moved"
    }

    New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null
    Move-Item -LiteralPath $SourcePath -Destination $DestinationPath
    if (-not $Quiet) {
      Write-Host "moved: $SourcePath -> $DestinationPath"
    }
    return "moved"
  }

  $conflicts = New-Object System.Collections.Generic.List[string]
  foreach ($child in Get-ChildItem -LiteralPath $SourcePath -Force) {
    $targetChild = Join-Path $DestinationPath $child.Name
    if (Test-Path -LiteralPath $targetChild) {
      [void]$conflicts.Add($child.FullName)
      continue
    }

    if ($DryRun) {
      if (-not $Quiet) {
        Write-Host "[dry-run] merge item: $($child.FullName) -> $targetChild"
      }
    }
    else {
      Move-Item -LiteralPath $child.FullName -Destination $targetChild
    }
  }

  if ($conflicts.Count -gt 0) {
    Write-Warning "merge conflicts remained in $SourcePath"
    foreach ($conflict in $conflicts) {
      Write-Warning "  conflict: $conflict"
    }
    return "mergeConflict"
  }

  if ($DryRun) {
    if (-not $Quiet) {
      Write-Host "[dry-run] remove empty source after merge: $SourcePath"
    }
  }
  else {
    Remove-Item -LiteralPath $SourcePath -Force
    if (-not $Quiet) {
      Write-Host "merged: $SourcePath -> $DestinationPath"
    }
  }

  return "merged"
}

function Sync-CharacterFolder {
  param(
    [string]$WorldFolder,
    [string]$EnglishName
  )

  $folderName = Convert-ToSafeFolderName $EnglishName
  if ($null -eq $folderName) {
    return "skippedBlank"
  }

  $desiredPath = Join-NormalizedPath $WorldFolder $folderName

  if (Test-Path -LiteralPath $desiredPath -PathType Container) {
    return "existing"
  }

  $matches = @(Find-FolderOutsideOld $folderName $desiredPath)
  if ($matches.Count -gt 0) {
    return Move-OrMergeFolder $matches[0].FullName $desiredPath
  }

  [void](Ensure-Directory $desiredPath)
  return "created"
}

$summary = [ordered]@{
  sheets = 0
  englishRows = 0
  worldFoldersCreated = 0
  characterFoldersCreated = 0
  foldersMoved = 0
  foldersMerged = 0
  existing = 0
  skippedOld = 0
  skippedBackup = 0
  skippedBlank = 0
  mergeConflicts = 0
  sheetsWithoutEnglish = 0
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("character_xlsx_" + [System.Guid]::NewGuid().ToString("N"))

try {
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($WorkbookPath, $tempRoot)

  $sharedStrings = Get-SharedStrings $tempRoot
  $sheets = Get-SheetsFromWorkbook $tempRoot
  $script:KnownWorldFolderNames.Clear()
  foreach ($sheet in $sheets) {
    if ($sheet.Name.Equals("old", [System.StringComparison]::OrdinalIgnoreCase) -or
      $sheet.Name.Equals($VariantCandidateSheetName, [System.StringComparison]::OrdinalIgnoreCase)) {
      continue
    }

    $knownWorldFolderName = Convert-ToSafeFolderName $sheet.Name
    if ($null -ne $knownWorldFolderName) {
      [void]$script:KnownWorldFolderNames.Add($knownWorldFolderName)
    }
  }

  foreach ($sheet in $sheets) {
    if ($sheet.Name.Equals("old", [System.StringComparison]::OrdinalIgnoreCase) -or
      $sheet.Name.Equals($VariantCandidateSheetName, [System.StringComparison]::OrdinalIgnoreCase)) {
      Write-Host "skip sheet: $($sheet.Name)"
      continue
    }

    $summary.sheets += 1
    $worldFolderName = Convert-ToSafeFolderName $sheet.Name
    if ($null -eq $worldFolderName) {
      Write-Warning "skip sheet with empty folder name"
      continue
    }

    $worldFolder = Join-NormalizedPath $CharactersRoot $worldFolderName
    $worldResult = Ensure-Directory $worldFolder
    if ($worldResult -eq "created") {
      $summary.worldFoldersCreated += 1
    }

    $englishNames = @(Get-EnglishNamesFromWorksheet $sheet.WorksheetPath $sharedStrings |
        Sort-Object -Unique)
    $summary.englishRows += $englishNames.Count

    if ($englishNames.Count -eq 0) {
      $summary.sheetsWithoutEnglish += 1
      Write-Warning "No English names found in sheet: $($sheet.Name)"
      continue
    }

    foreach ($englishName in $englishNames) {
      $result = Sync-CharacterFolder $worldFolder $englishName
      switch ($result) {
        "created" { $summary.characterFoldersCreated += 1 }
        "moved" { $summary.foldersMoved += 1 }
        "merged" { $summary.foldersMerged += 1 }
        "existing" { $summary.existing += 1 }
        "skippedOld" { $summary.skippedOld += 1 }
        "skippedBackup" { $summary.skippedBackup += 1 }
        "skippedBlank" { $summary.skippedBlank += 1 }
        "mergeConflict" { $summary.mergeConflicts += 1 }
      }
    }
  }
}
finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}

Write-Host ""
Write-Host "Character folder sync complete."
Write-Host "Workbook: $WorkbookPath"
Write-Host "Root:     $CharactersRoot"
Write-Host "DryRun:   $DryRun"
foreach ($key in $summary.Keys) {
  Write-Host ("{0}: {1}" -f $key, $summary[$key])
}

if ($summary.mergeConflicts -gt 0) {
  exit 2
}

exit 0
