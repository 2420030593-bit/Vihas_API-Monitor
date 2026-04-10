@echo off
REM API Performance Monitor - Windows Deployment Initialization Script

echo.
echo =========================================
echo API Performance Monitor - Setup Script
echo =========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js detected: %NODE_VERSION%

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm detected: %NPM_VERSION%
echo.

REM Install dependencies
echo Installing dependencies...
echo.

echo Installing root dependencies...
call npm install

echo.
echo Installing backend dependencies...
cd backend
call npm install
cd ..

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo [OK] All dependencies installed successfully
echo.

REM Check for .env files
echo Checking environment configuration...
echo.

if not exist "backend\.env" (
    echo Creating backend\.env from template...
    copy backend\.env.example backend\.env
    echo [WARN] You need to configure backend\.env with your MongoDB URI
)

if not exist "frontend\.env" (
    echo Creating frontend\.env from template...
    copy frontend\.env.example frontend\.env
    echo [OK] Frontend .env created
)

echo.
echo =========================================
echo [OK] Setup Complete!
echo =========================================
echo.

echo Next Steps:
echo 1. Update backend\.env with your MongoDB connection string
echo 2. Start development:
echo    npm run dev
echo.
echo 3. For production deployment to Render:
echo    - Push to GitHub
echo    - Connect repository to Render
echo    - Set environment variables in Render dashboard
echo    - Deploy!
echo.
echo For more information, see README.md
echo.
pause
