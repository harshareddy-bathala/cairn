import type { Module } from "@/content/types";

export const docker: Module = {
  slug: "devops-docker",
  trackSlug: "devops",
  phaseSlug: "foundations",
  order: 4,
  title: "Containers & Docker",
  summary:
    "Know the actual mechanism — namespaces and cgroups — not the 'lightweight VM' analogy. That distinction is a reliable interview filter, and it is also what makes debugging containers possible.",
  prereqSlugs: ["devops-linux-foundations"],
  units: [
    {
      slug: "devops-docker-mechanism",
      title: "Namespaces & cgroups: what a container actually is",
      objective:
        "Explain a container as a Linux process with restricted visibility and bounded resources.",
      estMinutes: 75,
      conceptMd: `**A container is just a process on the host kernel.** There is no guest OS. Run \`ps aux\` on the host and you can see it. Two kernel features do the work:

**Namespaces** restrict what a process can *see*: \`pid\` (its own process tree, so it thinks it is PID 1), \`net\` (its own interfaces and ports), \`mnt\` (its own filesystem view), \`uts\` (its own hostname), \`ipc\`, and \`user\` (UID mapping).

**cgroups** restrict what a process can *use*: CPU shares, memory limits, block IO. Exceeding a memory cgroup gets you OOM-killed — which is exactly what an exit code of **137** means (128 + SIGKILL 9), and recognising that code is a practical debugging skill.

The consequences follow directly: containers start fast because there is no OS to boot; they share the host kernel so you cannot run a Windows container on Linux; and isolation is weaker than a VM, which is why untrusted multi-tenant workloads still use VMs.

Being PID 1 also matters — PID 1 does not get default signal handlers, so a shell-form \`CMD\` can swallow SIGTERM and make your container take the full 10 seconds before SIGKILL on every deploy.`,
      resources: [
        {
          title: "Docker docs — what is a container",
          url: "https://docs.docker.com/get-started/docker-overview/",
          kind: "read",
          minutes: 25,
          whyThisOne: "Official, accurate, and the diagram is the one to reproduce on a whiteboard.",
          isPrimary: true,
        },
        {
          title: "unshare(1) — make a namespace by hand",
          url: "https://man7.org/linux/man-pages/man1/unshare.1.html",
          kind: "lab",
          minutes: 30,
          whyThisOne: "Run `sudo unshare --pid --fork --mount-proc bash` then `ps aux`. Containers stop being magic.",
        },
      ],
    },
    {
      slug: "devops-docker-images",
      title: "Images, layers & the build cache",
      objective:
        "Order a Dockerfile so the cache actually helps, and explain why a deleted file can still bloat an image.",
      estMinutes: 75,
      conceptMd: `An image is a stack of read-only layers; a container adds one writable layer on top. Each Dockerfile instruction creates a layer, and layers are cached by content.

**The cache rule that matters:** a changed layer invalidates every layer after it. So order from least to most frequently changing — dependency manifests before source code:

\`\`\`dockerfile
COPY package*.json ./
RUN npm ci              # cached unless dependencies changed
COPY . .                # changes on every commit
\`\`\`

Reversing those two lines means reinstalling all dependencies on every single build. This is the most common real-world Dockerfile mistake.

**Layers are additive.** \`RUN rm -rf /var/cache\` in a later layer does not shrink the image — the files still exist in the earlier layer, just hidden. Clean up in the *same* \`RUN\`, or use a multi-stage build.

\`.dockerignore\` matters more than people expect: without it, \`COPY . .\` sends \`node_modules\` and \`.git\` into the build context, which is slow and can leak secrets from \`.env\` files into the image.`,
      resources: [
        {
          title: "Docker — building best practices",
          url: "https://docs.docker.com/build/building/best-practices/",
          kind: "read",
          minutes: 35,
          whyThisOne: "The cache-ordering and layer-size sections are the two highest-value pages in Docker's docs.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "devops-docker-dockerfile",
      title: "Dockerfile mastery: CMD vs ENTRYPOINT, multi-stage, non-root",
      objective:
        "Write a multi-stage Dockerfile producing a small image that runs as a non-root user.",
      estMinutes: 90,
      conceptMd: `**CMD vs ENTRYPOINT.** ENTRYPOINT is the executable; CMD supplies default arguments and is replaced by anything you pass on the command line. \`ENTRYPOINT ["python", "app.py"]\` with \`CMD ["--port", "8000"]\` means \`docker run img --port 9000\` overrides just the port. If you only set CMD, any argument replaces the whole command. Use the **exec form** (JSON array) — the shell form wraps your process in \`/bin/sh -c\`, which breaks signal handling.

**COPY vs ADD**: use COPY. ADD additionally auto-extracts tarballs and fetches URLs, which is surprising behaviour you rarely want.

**Multi-stage** is how images get small: build with the full toolchain, then copy only the artifact into a minimal runtime image.

\`\`\`dockerfile
FROM golang:1.23 AS build
WORKDIR /src
COPY . .
RUN go build -o /app ./cmd/server

FROM gcr.io/distroless/static
COPY --from=build /app /app
USER nonroot
ENTRYPOINT ["/app"]
\`\`\`

**Run as non-root.** A container escape as root on the container is often root-adjacent on the host. \`USER\` costs one line, and its absence is flagged in every security review.`,
      resources: [
        {
          title: "Dockerfile reference",
          url: "https://docs.docker.com/reference/dockerfile/",
          kind: "docs",
          minutes: 40,
          whyThisOne: "Read the ENTRYPOINT and CMD interaction table directly — summaries of it are usually wrong.",
          isPrimary: true,
        },
        {
          title: "hadolint — Dockerfile linter",
          url: "https://github.com/hadolint/hadolint",
          kind: "do",
          whyThisOne: "Lint every Dockerfile you write. It teaches the conventions while catching real problems.",
        },
      ],
    },
    {
      slug: "devops-docker-runtime",
      title: "Networking, volumes & docker compose",
      objective:
        "Run a multi-service stack locally with compose, and persist data correctly across restarts.",
      estMinutes: 90,
      conceptMd: `**Networking.** Containers on a user-defined bridge network reach each other **by service name** — Docker runs an embedded DNS server. That is why \`postgres://db:5432\` works in compose while \`localhost\` does not: inside a container, \`localhost\` is the container itself.

**Volumes vs bind mounts.** A named volume is managed by Docker and is the right choice for databases. A bind mount maps a host path in and is the right choice for live-reloading source in development. Anything written to the container's writable layer disappears when the container is removed — which is how people lose their database.

**compose** describes the stack declaratively. \`depends_on\` only controls start *order*, not readiness — a database container being "started" does not mean Postgres is accepting connections. Use a \`healthcheck\` with \`condition: service_healthy\`, or your app must retry on startup. Retrying is the more robust habit anyway, and it is the same reliability thinking that shows up later in the SRE module.

This project's own \`docker-compose.yml\` is a working example — read it.`,
      resources: [
        {
          title: "Docker Compose — file reference",
          url: "https://docs.docker.com/reference/compose-file/",
          kind: "docs",
          minutes: 30,
          whyThisOne: "The healthcheck and depends_on conditions section resolves the most common compose confusion.",
          isPrimary: true,
        },
        {
          title: "Docker networking overview",
          url: "https://docs.docker.com/engine/network/",
          kind: "read",
          minutes: 25,
          whyThisOne: "Bridge vs host vs none, and why service-name DNS works. Short and worth it.",
        },
      ],
    },
    {
      slug: "devops-docker-debug",
      title: "Debugging containers",
      objective:
        "Diagnose a container that exits immediately, and read the common exit codes.",
      estMinutes: 60,
      conceptMd: `The commands, in the order you actually reach for them: \`docker logs --tail 100 -f <c>\`, \`docker inspect <c>\`, \`docker exec -it <c> sh\`, \`docker stats\`.

**Exit codes worth recognising:**
- **0** — clean exit. If the container "keeps stopping", often the process simply finished; a container lives exactly as long as its PID 1.
- **1** — application error. Read the logs.
- **125** — the docker command itself was wrong. **126** — the command is not executable. **127** — command not found (usually a missing binary in a slim base image).
- **137** — SIGKILL, almost always the memory cgroup limit. Raise the limit or fix the leak.
- **143** — SIGTERM, a normal graceful stop.

**A container that exits immediately** is usually one of: the process daemonised itself into the background so PID 1 exited; the command is not found (127) in a distroless or alpine image; or a config error killed it on startup. \`docker run --entrypoint sh -it <image>\` gets you a shell to look around when the container will not stay up long enough to \`exec\` into.`,
      resources: [
        {
          title: "Docker CLI reference",
          url: "https://docs.docker.com/reference/cli/docker/",
          kind: "docs",
          minutes: 25,
          whyThisOne: "Skim logs, exec, inspect and stats so the flags are in your fingers during an incident.",
          isPrimary: true,
        },
      ],
    },
  ],
};
