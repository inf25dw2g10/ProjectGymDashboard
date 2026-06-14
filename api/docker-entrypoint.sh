#!/bin/sh
set -e

if [ "$NODE_ENV" = "development" ]; then
  npm install
  DB_ENV=development
else
  DB_ENV=production
fi

echo "A correr migrations..."
until npx sequelize-cli db:migrate --env "$DB_ENV" 2>/dev/null; do
  sleep 5
done

echo "A inserir seeders..."
npx sequelize-cli db:seed:all --env "$DB_ENV" 2>/dev/null || echo "Seeders já aplicados ou ignorados."

echo "Base de dados pronta. A iniciar servidor..."
if [ "$NODE_ENV" = "development" ]; then
  exec npm run dev
else
  exec npm start
fi
