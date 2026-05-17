@echo off
title Instalando NutriClinica...
set DIR=%~dp0
pwsh -Command "$dir = '%DIR%'; $sh = New-Object -Com WScript.Shell; $lnk = $sh.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\NutriClinica.lnk'); $lnk.TargetPath = $dir + 'Abrir FotoClinica.vbs'; $lnk.IconLocation = $dir + 'icono_nutri.ico, 0'; $lnk.WorkingDirectory = $dir; $lnk.Description = 'NutriClinica - Gestion de pacientes en nutricion'; $lnk.Save()"
echo.
echo Listo! Ya tienes NutriClinica en el escritorio.
timeout /t 2 >nul
