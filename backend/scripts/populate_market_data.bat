@echo off
echo ================================================================================
echo Market Data Population Script
echo ================================================================================
echo.
echo This script will populate the database with sample market intelligence data.
echo.
echo Press Ctrl+C to cancel, or
pause

python scripts\populate_market_data.py

echo.
echo ================================================================================
echo Script execution completed!
echo ================================================================================
pause
