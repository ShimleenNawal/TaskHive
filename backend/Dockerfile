FROM python:3.13-slim

WORKDIR /app

# Install netcat for wait-for-db
RUN apt-get update && apt-get install -y netcat-traditional && rm -rf /var/lib/apt/lists/*

RUN pip install poetry
COPY pyproject.toml poetry.lock ./
RUN poetry install --no-root

COPY . .

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]