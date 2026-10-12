# Build: Go with cgo for github.com/mattn/go-sqlite3.
FROM golang:1.27.2-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY cmd ./cmd
COPY internal ./internal
COPY web ./web
# The release tag (v3.0.0); the deployment passes it, git is not in the image.
ARG VERSION=dev
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=1 go build -trimpath -ldflags "-s -w -X main.version=${VERSION#v}" -o /out/budget ./cmd/budget
RUN mkdir -p /out/data

# Run: distroless with glibc and CA certificates. User 1000 is the owner of
# the data directory the old app (oven/bun, user bun) left on the server.
FROM gcr.io/distroless/base-debian12
COPY --from=build /out/budget /usr/local/bin/budget
COPY --from=build --chown=1000:1000 /out/data /data
USER 1000:1000
ENV BUDGET_DATA=/data \
    BUDGET_ADDR=:4000
VOLUME ["/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD ["/usr/local/bin/budget", "health"]
ENTRYPOINT ["/usr/local/bin/budget"]
CMD ["serve"]
