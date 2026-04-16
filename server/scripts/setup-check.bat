@echo off
REM setup-check.bat - Pre-flight checks for Account CSV import

echo 🔍 Checking Account CSV Import Setup...
echo ========================================

REM Check if .env exists
if exist ".env" (
  echo ✓ .env file found
) else (
  echo ⚠ .env file not found - using .env.example
  if exist ".env.example" (
    echo   ^→ Run: copy .env.example .env
  )
)

REM Check DATABASE_URL
findstr /M "DATABASE_URL" .env >nul 2>&1
if %errorlevel% equ 0 (
  echo ✓ DATABASE_URL configured
) else (
  echo ✗ DATABASE_URL not found in .env
)

REM Check if CSV file exists
if exist "..\data\Account.csv" (
  echo ✓ Account.csv found
) else (
  echo ✗ Account.csv not found at ..\data\Account.csv
)

REM Check if node_modules exists
if exist "node_modules" (
  echo ✓ node_modules found
) else (
  echo ⚠ node_modules not found
  echo   ^→ Run: npm install
)

REM Check Prisma
if exist "node_modules\.bin\tsx.cmd" (
  echo ✓ tsx runtime found
) else (
  echo ⚠ tsx not installed
  echo   ^→ Run: npm install
)

echo.
echo ========================================
echo To complete setup:
echo.
echo 1. cd server
echo 2. npm install
echo 3. npm run prisma:migrate
echo 4. npm run import:accounts
echo.
pause
