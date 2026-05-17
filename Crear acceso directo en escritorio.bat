@echo off
title Instalando FotoClinica...
powershell -Command "$sh = New-Object -Com WScript.Shell; $lnk = $sh.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\FotoClinica.lnk'); $lnk.TargetPath = '%~dp0Abrir FotoClinica.vbs'; $lnk.IconLocation = '%~dp0icono.ico, 0'; $lnk.WorkingDirectory = '%~dp0'; $lnk.Description = 'FotoClinica - Gestion de imagenes clinicas'; $lnk.Save()"
echo.
echo Listo! Ya tienes FotoClinica en el escritorio.
timeout /t 2 >nul
