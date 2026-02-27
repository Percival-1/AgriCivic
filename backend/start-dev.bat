@echo off
REM Development Startup Script for AI-Driven Agri-Civic Intelligence Platform (Windows)
REM This script helps start the backend and frontend in the correct order

echo ========================================
echo Starting AI-Driven Agri-Civic Intelligence Platform
echo ========================================
echo.

REM Check if PostgreSQL is running
echo Checking PostgreSQL...
pg_isready >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL is running
) else (
    echo [ERROR] PostgreSQL is not running
    echo Please start PostgreSQL first
    pause
    exit /b 1
)

REM Check if Redis is running
echo.
echo Checking Redis...
redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Redis is running
) else (
    echo [ERROR] Redis is not running
    echo Please start Redis first
    pause
    exit /b 1
)

REM Start Backend
echo.
echo Starting FastAPI Backend...
cd /d "%~dp0"

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else if defined CONDA_DEFAULT_ENV (
    echo Using conda environment: %CONDA_DEFAULT_ENV%
) else (
    echo [ERROR] No virtual environment found
    echo Please create a virtual environment first
    pause
    exit /b 1
)

REM Start backend in new window
start "FastAPI Backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [OK] Backend started
echo   URL: http://localhost:8000
echo   Docs: http://localhost:8000/docs

REM Wait for backend to be ready
echo.
echo Waiting for backend to be ready...
timeout /t 5 /nobreak >nul

REM Start Frontend
echo.
echo Starting Vue Frontend...
cd frontend-vue

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

REM Start frontend in new window
start "Vue Frontend" cmd /k "npm run dev"

echo [OK] Frontend started
echo   URL: http://localhost:3000

REM Summary
echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo.
echo Services:
echo   - Backend:  http://localhost:8000
echo   - Frontend: http://localhost:3000
echo   - API Docs: http://localhost:8000/docs
echo.
echo Two new windows have been opened:
echo   1. FastAPI Backend
echo   2. Vue Frontend
echo.
echo To stop services, close those windows or press Ctrl+C in them
echo.
pause
