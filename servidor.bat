@echo off
setlocal
title Projeto Akai - Servidor e jogo online
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\jogar.ps1" -Online %*
set "AKAI_EXIT=%ERRORLEVEL%"
if not "%AKAI_EXIT%"=="0" (
  echo.
  echo O modo online nao iniciou. Confira a mensagem acima.
  if not defined CI pause
)
exit /b %AKAI_EXIT%
