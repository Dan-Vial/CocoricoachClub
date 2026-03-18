FROM oven/bun:latest

USER root

RUN apt-get update \
  && apt-get install -y \
  curl \
  ca-certificates \ 
  && rm -rf /var/lib/apt/lists/*

RUN update-ca-certificates

USER bun

WORKDIR /app
