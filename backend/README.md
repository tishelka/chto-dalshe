# Backend (FastAPI)

## Запуск проекта через Docker Compose
1. Скопируйте файл с примером переменных окружения:
   cp .env.example .env
2. Запустите контейнеры:
   docker compose up --build -d
3. Проверьте работу:
   - Healthcheck: http://localhost:8000/health
   - Swagger UI: http://localhost:8000/docs
