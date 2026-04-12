# 1. Estágio de Build
FROM oven/bun AS builder
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install

COPY ./src ./src

RUN bun build \
  --compile \
  --minify-whitespace \
  --minify-syntax \
  --target bun-linux-x64 \
  --outfile server \
  src/index.ts

RUN bun build \
  --compile \
  --minify-whitespace \
  --minify-syntax \
  --target bun-linux-x64 \
  --outfile worker \
  src/modules/iot/iot.worker.ts

# 2. Estágio de Execução
FROM gcr.io/distroless/base
WORKDIR /app

# Traz o executável do builder
COPY --from=builder /app/server .
COPY --from=builder /app/worker .

ENV NODE_ENV=production

EXPOSE 3000

# Roda o servidor
CMD ["./server"]