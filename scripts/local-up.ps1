$ErrorActionPreference = "Stop"

$ROOT_DIR = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT_DIR

# --- .env setup ---
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

# Load DATABASE_URL from .env
$envContent = Get-Content ".env" | Where-Object { $_ -match "^DATABASE_URL=" }
$DATABASE_URL = ($envContent -replace '^DATABASE_URL="?', '') -replace '"?$', ''

# Parse connection details from DATABASE_URL
# Expected: postgresql://user:password@host:port/dbname
if ($DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)') {
    $DB_USER = $Matches[1]
    $DB_PASS = $Matches[2]
    $DB_HOST = $Matches[3]
    $DB_PORT = [int]$Matches[4]
    $DB_NAME = $Matches[5]
} else {
    Write-Error "Could not parse DATABASE_URL: $DATABASE_URL"
    exit 1
}

$env:PGPASSWORD = $DB_PASS

# --- Locate Postgres bin directory ---
# Try PATH first, then common Windows install locations
function Find-PgBin {
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        return ""  # already on PATH, no prefix needed
    }
    $candidates = Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Select-Object -First 1
    if ($candidates) {
        $bin = Join-Path $candidates.FullName "bin"
        if (Test-Path (Join-Path $bin "psql.exe")) {
            return $bin
        }
    }
    return $null
}

$pgBin = Find-PgBin
if ($null -eq $pgBin) {
    Write-Error "Could not find Postgres tools (psql). Add the Postgres bin directory to your PATH and retry."
    exit 1
}

function Invoke-Pg($exe) {
    $args = $args  # capture rest of args from caller — PowerShell quirk, use param instead
    # Resolved via pgBin prefix if needed
    if ($pgBin -eq "") { return $exe } else { return Join-Path $pgBin "$exe.exe" }
}

$psql    = if ($pgBin -eq "") { "psql"    } else { Join-Path $pgBin "psql.exe" }
$createdb = if ($pgBin -eq "") { "createdb" } else { Join-Path $pgBin "createdb.exe" }

# --- Check Postgres is reachable via TCP ---
Write-Host "Checking Postgres connection at ${DB_HOST}:${DB_PORT}..."
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect($DB_HOST, $DB_PORT)
    $tcp.Close()
} catch {
    Write-Error "Cannot reach Postgres at ${DB_HOST}:${DB_PORT}. Make sure your local Postgres server is running."
    exit 1
}

# --- Create database if it doesn't exist ---
$dbExists = & $psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>$null
if ($dbExists.Trim() -ne "1") {
    Write-Host "Creating database '$DB_NAME'..."
    & $createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
}

# --- Install dependencies ---
Write-Host "Installing dependencies..."
npm install

# --- Apply migrations ---
Write-Host "Applying Prisma migrations..."
npx prisma migrate deploy

# --- Start dev server ---
Write-Host "Starting Next.js dev server at http://localhost:3000"
npm run dev
