@echo off
setlocal
cd /d "%~dp0"
title Lammet Elbeit VORTEXweplab Color Font Banner Fix 2026 - Deployment

echo ======================================================
echo  LAMMET ELBEIT - VORTEXweplab COLOR / FONT / BANNER FIX 2026
echo  Existing Firebase project: noor-el-hekaya
echo  Deployment scope: Hosting ONLY (colors, fonts, unobscured poster banner)
echo  Firestore and Storage rules remain unchanged in this release.
echo  Source folder: %CD%
echo ======================================================
echo.
if not exist "firebase.json" (
  echo ERROR: firebase.json is missing. Extract the ZIP and run this file inside the project folder.
  pause
  exit /b 1
)
if not exist "public\index.html" (
  echo ERROR: public\index.html is missing.
  pause
  exit /b 1
)
if not exist "public\admin.html" (
  echo ERROR: public\admin.html is missing.
  pause
  exit /b 1
)
if not exist "public\details.html" (
  echo ERROR: public\details.html is missing.
  pause
  exit /b 1
)
if not exist "public\watch.html" (
  echo ERROR: public\watch.html is missing.
  pause
  exit /b 1
)
if not exist "public\brand.svg" (
  echo ERROR: public\brand.svg is missing.
  pause
  exit /b 1
)
if not exist "firestore.rules" (
  echo ERROR: firestore.rules is missing.
  pause
  exit /b 1
)
where firebase >nul 2>nul
if errorlevel 1 (
  echo ERROR: Firebase CLI is not available in PATH. Install/login to Firebase CLI first.
  pause
  exit /b 1
)
echo.
echo ======================================================
echo SECURITY CHECK - READ BEFORE PUBLISHING
echo The current firestore.rules grants public read, create, update and delete access to episodes.
echo The current storage.rules also grants public deletion of stored video and media objects.
echo The admin page has no sign-in gate, so anyone who knows the site can potentially change or delete library data.
echo This script publishes Hosting ONLY and does NOT repair those backend permissions.
echo For a public production release, protect admin writes with Firebase Authentication and allowlisted admin claims first.
echo ======================================================
echo.
set "SECURITY_ACK="
set /p "SECURITY_ACK=To knowingly deploy Hosting while accepting this risk, type DEPLOY-ANYWAY (anything else cancels): "
if /I not "%SECURITY_ACK%"=="DEPLOY-ANYWAY" goto cancelled
echo.
echo Deploying Hosting only to noor-el-hekaya...
call firebase deploy --only hosting --project noor-el-hekaya
if errorlevel 1 goto failed
echo.
echo Deploy complete!
echo Website: https://noor-el-hekaya.web.app
echo Details page: https://noor-el-hekaya.web.app/details.html?id=ITEM_ID
echo Player page:  https://noor-el-hekaya.web.app/watch.html?id=ITEM_ID
echo Admin page (direct link): https://noor-el-hekaya.web.app/admin.html
echo.
goto finish
:cancelled
echo.
echo Deployment cancelled. Resolve the backend security issue before publishing, or explicitly acknowledge the risk.
exit /b 2
:failed
echo.
echo Deployment failed. Copy the complete error output above for diagnosis.
:finish
echo.
pause
endlocal
