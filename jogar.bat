@echo off
setlocal
title Projeto Akai - Preview local
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\jogar.ps1" %*
set "AKAI_EXIT=%ERRORLEVEL%"
if not "%AKAI_EXIT%"=="0" (
  echo.
  echo O preview nao iniciou. Confira a mensagem acima.
  if not defined CI pause
)
exit /b %AKAI_EXIT%
