#!/bin/bash

# Script de inicialización del proyecto Paseo Coto Tonalá

set -e

echo "🏗️  Iniciando configuración del proyecto Paseo Coto Tonalá..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versión 18 o superior es requerida. Versión actual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Instalando pnpm..."
    npm install -g pnpm@8.15.0
fi

echo "✅ pnpm $(pnpm -v) detectado"

# Instalar dependencias
echo "📦 Instalando dependencias..."
pnpm install

# Copiar archivo de variables de entorno
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env desde .env.example..."
    cp .env.example .env
    echo "⚠️  Por favor configura las variables de entorno en el archivo .env"
fi

# Crear base de datos local (si no existe)
if [ ! -f "database/dev.db" ]; then
    echo "🗄️  Creando base de datos local..."
    touch database/dev.db
fi

echo ""
echo "✅ ¡Configuración completada!"
echo ""
echo "📚 Próximos pasos:"
echo "   1. Configura las variables de entorno en .env"
echo "   2. Ejecuta las migraciones: pnpm db:migrate"
echo "   3. (Opcional) Carga datos de prueba: pnpm db:seed"
echo "   4. Inicia el servidor de desarrollo: pnpm dev"
echo ""
echo "📖 Para más información, consulta: docs/SETUP.md"

# Made with Bob
