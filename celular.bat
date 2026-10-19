@echo off
setlocal
title Projeto Akai - Android na rede local
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\jogar.ps1" -Online -Mobile %*
set "AKAI_EXIT=%ERRORLEVEL%"
if not "%AKAI_EXIT%"=="0" (
  echo.
  echo O acesso pelo celular nao iniciou. Confira a mensagem acima.
  if not defined CI pause
)
exit /b %AKAI_EXIT%
