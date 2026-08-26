FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    RUN_MIGRATIONS_ON_STARTUP=true

WORKDIR /app

RUN addgroup --system tractuslab \
  && adduser --system --ingroup tractuslab tractuslab

COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=tractuslab:tractuslab apps/api/app ./app
COPY --chown=tractuslab:tractuslab apps/api/migrations ./migrations
COPY --chown=tractuslab:tractuslab apps/api/alembic.ini ./alembic.ini
COPY --chown=tractuslab:tractuslab apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER tractuslab
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8000')+'/health', timeout=3).read()"

CMD ["./entrypoint.sh"]
