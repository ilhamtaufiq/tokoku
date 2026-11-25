# syntax=docker/dockerfile:1.7

# Build stage. Cache registry dan target disimpan BuildKit, sehingga dependency
# tidak dikompilasi ulang setiap kali hanya source yang berubah.
FROM rust:1.97-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/app/target,sharing=locked \
    cargo build --release --locked && cp target/release/toko_backend /app/toko_backend

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates bash \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/toko_backend /usr/local/bin/toko_backend
WORKDIR /app
RUN mkdir -p /app/uploads
ENV BIND_ADDR=0.0.0.0:8080 \
    UPLOAD_DIR=/app/uploads
EXPOSE 8080
CMD ["toko_backend"]
