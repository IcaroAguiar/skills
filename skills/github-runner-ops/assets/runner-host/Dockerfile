FROM ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517

ARG RUNNER_VERSION=2.336.0
ARG RUNNER_SHA256=04cf0be1aff4c3ec3554466c39124ca250e3effd8873bb7e8d68535aa9505d5d
ARG NODE_VERSION=24.14.0
ARG NODE_SHA256=41cd79bb7877c81605a9e68ec4c91547774f46a40c67a17e34d7179ef11729df
ARG PNPM_VERSION=10.31.0

ENV DEBIAN_FRONTEND=noninteractive \
    RUNNER_ALLOW_RUNASROOT=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        docker.io \
        docker-compose-v2 \
        git \
        jq \
        libicu74 \
        libssl3 \
        openssh-client \
        postgresql-client \
        procps \
        rsync \
        sudo \
        tar \
        unzip \
        xz-utils \
    && find /var/lib/apt/lists -mindepth 1 -delete \
    && mkdir -p /opt/actions-runner /opt/runner-hooks /runner \
    && curl --fail --location --retry 5 \
        --output /tmp/node.tar.xz \
        "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum --check --strict \
    && tar --extract --xz --file /tmp/node.tar.xz --directory /usr/local --strip-components=1 \
    && rm /tmp/node.tar.xz \
    && corepack enable pnpm \
    && corepack prepare "pnpm@${PNPM_VERSION}" --activate \
    && test "$(node --version)" = "v${NODE_VERSION}" \
    && npm --version >/dev/null \
    && npx --version >/dev/null \
    && corepack --version >/dev/null \
    && test "$(pnpm --version)" = "${PNPM_VERSION}" \
    && curl --fail --location --retry 5 \
        --output /tmp/actions-runner.tar.gz \
        "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
    && echo "${RUNNER_SHA256}  /tmp/actions-runner.tar.gz" | sha256sum --check --strict \
    && tar --extract --gzip --file /tmp/actions-runner.tar.gz --directory /opt/actions-runner \
    && rm /tmp/actions-runner.tar.gz

COPY entrypoint.sh /usr/local/bin/runner-entrypoint
COPY job-completed.sh /opt/runner-hooks/job-completed.sh

RUN chmod 0755 /usr/local/bin/runner-entrypoint /opt/runner-hooks/job-completed.sh

WORKDIR /runner

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD pgrep -f 'Runner.Listener' >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/runner-entrypoint"]
