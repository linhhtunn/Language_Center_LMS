param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 3307,
    [string]$Database = "quanlytrungtam",
    [string]$User = "root",
    [string]$Password = "root",
    [string]$MysqlPath = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$seedFileName = "De_16_English_Test_seed.sql"
$seedFile = Get-ChildItem -LiteralPath $scriptDir -Recurse -Filter $seedFileName -File |
    Select-Object -First 1

if ($seedFile) {
    $seedPath = $seedFile.FullName
} else {
    $seedPath = Join-Path $scriptDir $seedFileName
}

if (-not (Test-Path -LiteralPath $seedPath)) {
    throw "Cannot find seed file: $seedFileName under $scriptDir"
}

if ([string]::IsNullOrWhiteSpace($MysqlPath)) {
    $mysqlCommand = Get-Command mysql -ErrorAction SilentlyContinue
    if ($mysqlCommand) {
        $MysqlPath = $mysqlCommand.Source
    }
}

if ([string]::IsNullOrWhiteSpace($MysqlPath)) {
    $candidates = @(
        "C:\xampp\mysql\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Workbench 8.0 CE\mysql.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            $MysqlPath = $candidate
            break
        }
    }
}

if ([string]::IsNullOrWhiteSpace($MysqlPath) -or -not (Test-Path -LiteralPath $MysqlPath)) {
    throw "Cannot find mysql.exe. Install MySQL client or pass -MysqlPath 'C:\...\mysql.exe'."
}

Write-Host "Importing De 16 English Test seed into database '$Database' at ${HostName}:$Port ..."
Write-Host "Seed file: $seedPath"
Write-Host "MySQL client: $MysqlPath"

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "english_education_seed"
$tempSeedPath = Join-Path $tempDir $seedFileName

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Copy-Item -LiteralPath $seedPath -Destination $tempSeedPath -Force

$mysqlCommand = '"' + $MysqlPath + '"' +
    " -h " + $HostName +
    " -P " + $Port +
    " -u " + $User +
    " -p" + $Password +
    " --default-character-set=utf8mb4 " +
    $Database +
    ' < "' + $tempSeedPath + '"'

cmd.exe /d /c $mysqlCommand

if ($LASTEXITCODE -ne 0) {
    throw "Seed import failed. Check MySQL service, port, database, user/password."
}

Write-Host "De 16 English Test seed imported successfully."
