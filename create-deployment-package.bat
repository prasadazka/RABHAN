@echo off
echo Creating clean deployment package...

REM Create deployment folder
mkdir deployment-package
cd deployment-package

REM Copy essential files and folders, excluding large directories
echo Copying source code...
robocopy "..\backend" "backend" /E /XD node_modules dist logs uploads temp_*
robocopy "..\frontend" "frontend" /E /XD node_modules dist build .next
robocopy "..\scripts" "scripts" *.sh *.bat
robocopy "..\nginx" "nginx" /E
robocopy "..\.claude" ".claude" /E

REM Copy root files
copy "..\*.json" .
copy "..\*.md" .
copy "..\*.yml" .
copy "..\*.yaml" .
copy "..\*.env*" .
copy "..\*.bat" .
copy "..\*.sh" .
copy "..\docker-compose.*" .
copy "..\.gitignore" .

echo Clean deployment package created!
echo Size should be under 100MB now.
pause