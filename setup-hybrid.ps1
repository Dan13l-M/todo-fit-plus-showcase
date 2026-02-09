# PowerShell script for Windows
# Setup híbrido para repositorios

Write-Host "🔐 Configurando repositorios híbridos..." -ForegroundColor Cyan

# Primero necesitas crear los repos en GitHub:
Write-Host "`n📋 PASO 1: Crear repos en GitHub" -ForegroundColor Yellow
Write-Host "  1. Ve a: https://github.com/new"
Write-Host "  2. Crea 'todo-fit-plus-showcase' como PÚBLICO"
Write-Host "  3. Luego crea 'todo-fit-plus' como PRIVADO"
Write-Host "`nPresiona Enter cuando hayas creado ambos repos..."
Read-Host

# Preparar repo público
Write-Host "`n📱 PASO 2: Preparando repo público..." -ForegroundColor Cyan
$parentDir = Split-Path -Parent (Get-Location)
$showcaseDir = Join-Path $parentDir "todo-fit-plus-showcase"

New-Item -ItemType Directory -Force -Path $showcaseDir | Out-Null
Set-Location $showcaseDir

# Inicializar git
git init
git branch -M main

# Copiar archivos públicos
Copy-Item "..\todo-fit-plus\README_PUBLIC.md" "README.md"
New-Item -ItemType Directory -Force -Path "assets\demo" | Out-Null
Copy-Item "..\todo-fit-plus\frontend\assets\demo\*.jpg" "assets\demo\"

# Commit y push público
git add .
git commit -m "Initial commit: Demo showcase"
git remote add origin https://github.com/Dan-iel-stack/todo-fit-plus-showcase.git
git push -u origin main

Write-Host "✅ Repo público listo!" -ForegroundColor Green

# Configurar repo privado
Write-Host "`n🔐 PASO 3: Configurando repo privado..." -ForegroundColor Cyan
Set-Location "..\todo-fit-plus"

git remote set-url origin https://github.com/Dan-iel-stack/todo-fit-plus.git
git push -u origin main

Write-Host "`n🎉 Setup completo!" -ForegroundColor Green
Write-Host "  ✅ Código privado: https://github.com/Dan-iel-stack/todo-fit-plus" -ForegroundColor White
Write-Host "  ✅ Demo público: https://github.com/Dan-iel-stack/todo-fit-plus-showcase" -ForegroundColor White
