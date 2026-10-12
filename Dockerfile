# Build: Go with cgo for github.com/mattn/go-sqlite3.
FROM golang:1.27.2-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY cmd ./cmd
COPY internal ./internal
COPY web ./web
ARG VERSION=dev
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=1 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/budget ./cmd/budget
RUN mkdir -p /out/data

# Run: distroless with glibc and CA certificates, as the nonroot user.
FROM gcr.io/distroless/base-debian12
COPY --from=build /out/budget /usr/local/bin/budget
COPY --from=build --chown=65532:65532 /out/data /data
USER 65532:65532
ENV BUDGET_DATA=/data \
    BUDGET_ADDR=:4000
VOLUME ["/data"]
EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/budget"]
CMD ["serve"]
