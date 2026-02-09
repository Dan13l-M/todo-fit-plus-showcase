# Script para configurar el Firewall de Windows para el Backend Local
# Ejecutar como Administrador

Write-Host "Configurando reglas de Firewall para el backend..." -ForegroundColor Cyan

# Crear regla de entrada para el puerto 8000
New-NetFirewallRule -DisplayName "ToDo Fit Backend - Puerto 8000" `
    -Direction Inbound `
    -LocalPort 8000 `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain,Private `
    -Description "Permite conexiones al backend de ToDo Fit Plus en el puerto 8000"

Write-Host "✅ Regla de Firewall creada exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host "Para usar el backend local:" -ForegroundColor Yellow
Write-Host "1. Edita frontend/.env y cambia a: EXPO_PUBLIC_BACKEND_URL=http://192.168.1.147:8000" -ForegroundColor White
Write-Host "2. Reinicia Expo con: npx expo start -c" -ForegroundColor White
Write-Host ""
Write-Host "Para eliminar la regla en el futuro:" -ForegroundColor Yellow
Write-Host "Remove-NetFirewallRule -DisplayName 'ToDo Fit Backend - Puerto 8000'" -ForegroundColor Gray
