FROM ghcr.io/astral-sh/uv:0.12.10@sha256:2bb3ebca0a796a155094a27773d290c4b074572e6107f171d88d086682fd2500 AS uv
FROM python:3.14.7-slim@sha256:51dafde81dbdb6ebde285137a295cf18a47ca95234fe388a343719cb97305b3d AS dependencies
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_PYTHON_DOWNLOADS=never UV_LINK_MODE=copy
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project --no-editable

FROM python:3.14.7-slim@sha256:51dafde81dbdb6ebde285137a295cf18a47ca95234fe388a343719cb97305b3d AS runtime
LABEL org.opencontainers.image.source="https://github.com/The-PR-Agent/pr-agent" \
      org.opencontainers.image.revision="8e5a9295973b24af4b70cafd0b660a230811ef9e"
ENV PYTHONPATH=/app PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    LITELLM_LOCAL_MODEL_COST_MAP=True GIT_PYTHON_REFRESH=quiet \
    HOME=/tmp/reviewer
COPY --from=dependencies /app/.venv /app/.venv
COPY pr_agent /app/pr_agent
COPY UPSTREAM-LICENSE.txt /app/UPSTREAM-LICENSE.txt
COPY benchmark-entrypoint.py smoke.py /app/
WORKDIR /bench
USER 10001:10001
RUN --network=none /app/.venv/bin/python /app/smoke.py
HEALTHCHECK --interval=60s --timeout=10s --retries=1 CMD ["/app/.venv/bin/python", "/app/smoke.py"]
ENTRYPOINT ["/app/.venv/bin/python", "/app/benchmark-entrypoint.py"]
