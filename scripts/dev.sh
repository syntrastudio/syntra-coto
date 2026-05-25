#!/bin/bash

# Script para iniciar el entorno de desarrollo

set -e

echo "🚀 Iniciando entorno de desarrollo..."

# Verificar que las dependencias estén instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    pnpm install
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado. Copiando desde .env.example..."
    cp .env.example .env
    echo "⚠️  Por favor configura las variables de entorno en .env"
    exit 1
fi

# Iniciar servicios en desarrollo
echo "🔧 Iniciando servicios..."
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8787"
echo ""

pnpm dev

# Made with Bob
