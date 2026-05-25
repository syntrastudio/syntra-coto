#!/bin/bash

# Script para ejecutar migraciones de base de datos

set -e

echo "🗄️  Ejecutando migraciones de base de datos..."

# Verificar que el directorio de migraciones existe
if [ ! -d "database/migrations" ]; then
    echo "❌ Directorio de migraciones no encontrado"
    exit 1
fi

# Ejecutar migraciones
cd database

# Para desarrollo local con SQLite
if [ -f "dev.db" ]; then
    echo "📝 Aplicando migraciones a base de datos local..."
    for migration in migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "   Ejecutando: $(basename $migration)"
            sqlite3 dev.db < "$migration"
        fi
    done
    echo "✅ Migraciones aplicadas exitosamente"
else
    echo "⚠️  Base de datos local no encontrada. Creando..."
    touch dev.db
    echo "📝 Aplicando migraciones..."
    for migration in migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "   Ejecutando: $(basename $migration)"
            sqlite3 dev.db < "$migration"
        fi
    done
    echo "✅ Base de datos creada y migraciones aplicadas"
fi

cd ..

echo ""
echo "💡 Para producción con Cloudflare D1, usa:"
echo "   wrangler d1 migrations apply paseo-coto-tonala"

# Made with Bob
