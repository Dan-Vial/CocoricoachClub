FROM oven/bun:latest

USER root

RUN apt-get update \
  && apt-get install -y \
  curl \
  ca-certificates \
  ripgrep \
  && rm -rf /var/lib/apt/lists/*

RUN update-ca-certificates

USER bun

WORKDIR /app

CMD [ "tail", "-f", "/dev/null" ]
