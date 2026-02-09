#!/bin/bash
# Setup script para estrategia híbrida

echo "🔐 Configurando repositorios híbridos..."

# 1. Crear repo público en GitHub primero:
# https://github.com/new
# Nombre: todo-fit-plus-showcase
# Tipo: PÚBLICO

# 2. Preparar carpeta para repo público
cd ..
mkdir todo-fit-plus-showcase
cd todo-fit-plus-showcase

# 3. Inicializar repo público
git init
cp ../todo-fit-plus/README_PUBLIC.md README.md
mkdir -p assets/demo
cp ../todo-fit-plus/frontend/assets/demo/*.jpg assets/demo/

# 4. Commit inicial repo público
git add .
git commit -m "Initial commit: Demo showcase"
git branch -M main
git remote add origin https://github.com/Dan-iel-stack/todo-fit-plus-showcase.git
git push -u origin main

echo "✅ Repo público creado!"
echo ""
echo "📍 Ahora configurando repo privado..."

# 5. Volver al repo principal
cd ../todo-fit-plus

# 6. Crear repo privado en GitHub:
# https://github.com/new
# Nombre: todo-fit-plus
# Tipo: PRIVADO

# 7. Subir código completo a repo privado
git remote set-url origin https://github.com/Dan-iel-stack/todo-fit-plus.git
git push -u origin main

echo "✅ Repo privado configurado!"
echo ""
echo "🎉 Setup completo:"
echo "  - Código privado: https://github.com/Dan-iel-stack/todo-fit-plus"
echo "  - Demo público: https://github.com/Dan-iel-stack/todo-fit-plus-showcase"
