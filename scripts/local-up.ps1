$ErrorActionPreference = "Stop"

$ROOT_DIR = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT_DIR

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Error: docker is required for one-command local startup."
    exit 1
}

docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error: docker compose plugin is required."
    exit 1
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

Write-Host "Starting local Postgres container..."
docker compose up -d db

Write-Host "Waiting for Postgres health check..."
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    $status = docker inspect --format='{{json .State.Health.Status}}' spiritvale-db 2>$null
    if ($status -eq '"healthy"') {
        $healthy = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-not $healthy) {
    Write-Error "Error: Postgres did not become healthy in time."
    exit 1
}

Write-Host "Installing dependencies (npm install)..."
npm install

Write-Host "Applying Prisma migration..."
npx prisma migrate dev --name init --skip-seed

Write-Host "Starting Next.js dev server..."
npm run dev
