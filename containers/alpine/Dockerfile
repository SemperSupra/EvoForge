# Experimental capability profiles. Supply digest-resolved Alpine and Node refs.
ARG ALPINE_BASE
ARG NODE_DONOR
FROM ${NODE_DONOR} AS donor
FROM ${ALPINE_BASE} AS base
RUN addgroup -g 10001 app && adduser -D -u 10001 -G app -h /home/app app \
    && mkdir -p /workspace && chown app:app /workspace
WORKDIR /workspace
USER 10001:10001
CMD ["/bin/sh"]
FROM base AS runtime
USER 0
RUN apk add --no-cache ca-certificates libstdc++
COPY --from=donor /usr/local/bin/node /usr/local/bin/node
COPY --from=donor /usr/local/LICENSE /usr/share/licenses/node/LICENSE
RUN node --version
USER 10001:10001
ENTRYPOINT ["node"]
FROM runtime AS compiler
USER 0
COPY --from=donor /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && npm --version
USER 10001:10001
ENTRYPOINT []
CMD ["node"]
FROM compiler AS debug
USER 0
RUN apk add --no-cache curl strace
USER 10001:10001
FROM base AS apk-compiler
USER 0
RUN apk add --no-cache nodejs npm ca-certificates
USER 10001:10001
CMD ["node"]
