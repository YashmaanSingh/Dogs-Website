@echo off
echo 🐾 Sharma's Pet Nation - Starting Server
echo ======================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo    Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚙️  Creating .env file...
    copy "env.example" ".env"
    echo ⚠️  Please update the .env file with your configuration
)

REM Check if database exists
if not exist "database" (
    echo 📁 Creating database directory...
    mkdir database
)

REM Initialize database if needed
if not exist "database\pets.db" (
    echo 🗄️  Initializing database...
    node database/init.js
    if errorlevel 1 (
        echo ❌ Failed to initialize database
        pause
        exit /b 1
    )
)

echo 🚀 Starting server...
echo.
echo 📱 Server will be available at: http://localhost:5000
echo 🔑 Admin panel: http://localhost:5000/admin.html
echo 📚 Default admin credentials:
echo    Username: admin
echo    Password: admin123
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
