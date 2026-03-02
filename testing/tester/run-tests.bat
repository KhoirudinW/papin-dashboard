@echo off
setlocal

cd /d "%~dp0\..\.."
node "testing\tester\run-tests.js" "testing\tester\test-plan.json"

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Testing failed with exit code %ERRORLEVEL%.
  exit /b %ERRORLEVEL%
)

echo.
echo Testing finished successfully.
exit /b 0
