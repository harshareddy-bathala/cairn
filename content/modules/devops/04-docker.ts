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
      interviewAngle:
        "`What is a container?` is asked in almost every ops interview, and `a lightweight VM` " +
        "is the wrong answer. Namespaces for visibility, cgroups for resources, one shared " +
        "kernel — that is the whole answer.",
      pitfalls: [
        "Calling a container a lightweight VM. There is no guest OS and no guest kernel — it " +
          "is a host process with a restricted view.",
        "Assuming isolation equals a VM's. It is weaker, which is why untrusted multi-tenant " +
          "workloads still run in VMs.",
        "Using the shell form of `CMD`. PID 1 gets no default signal handlers, so a shell " +
          "wrapper swallows SIGTERM and every deploy waits the full grace period.",
      ],
      recall: [
        {
          front: "Namespaces and cgroups — which does what?",
          back:
            "Namespaces restrict what a process can *see* (pid, net, mnt, uts, ipc, user). " +
            "cgroups restrict what it can *use* (CPU, memory, block IO).",
        },
        {
          front: "What does exit code 137 mean, and what causes it?",
          back:
            "128 + 9, so SIGKILL — almost always the memory cgroup limit being exceeded and the " +
            "kernel OOM-killing the process. Raise the limit or fix the leak.",
        },
        {
          front: "Why can you not run a Windows container on a Linux host?",
          back:
            "The container shares the host kernel; there is no guest OS. A Windows binary needs " +
            "Windows kernel syscalls, which a Linux kernel does not provide.",
        },
        {
          front: "Why does being PID 1 matter for signal handling?",
          back:
            "PID 1 does not get the kernel's default signal handlers, so a process that does " +
            "not explicitly handle SIGTERM simply ignores it — and the runtime falls back to " +
            "SIGKILL after the grace period.",
        },
      ],
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

Reversing those two lines means reinstalling every dependency on every build. It is an easy mistake to make and an invisible one until builds start taking minutes.

**Layers are additive.** \`RUN rm -rf /var/cache\` in a later layer does not shrink the image — the files still exist in the earlier layer, just hidden. Clean up in the *same* \`RUN\`, or use a multi-stage build.

\`.dockerignore\` matters more than people expect: without it, \`COPY . .\` sends \`node_modules\` and \`.git\` into the build context, which is slow and can leak secrets from \`.env\` files into the image.`,
      interviewAngle:
        "`Why is our build slow?` and `why is the image so big?` are the two practical " +
        "questions, and both have the same root: layer ordering and layer additivity.",
      pitfalls: [
        "Copying source before installing dependencies. Every commit then invalidates the " +
          "dependency layer and reinstalls everything.",
        "Deleting files in a later `RUN` to shrink the image. The earlier layer still holds " +
          "them — clean up in the same `RUN`, or use multi-stage.",
        "Shipping without a `.dockerignore`. `COPY . .` then sends `.git` and `node_modules` " +
          "into the context, which is slow and can bake `.env` secrets into the image.",
      ],
      recall: [
        {
          front: "State the Dockerfile cache rule in one sentence.",
          back:
            "A changed layer invalidates every layer after it — so order instructions from " +
            "least to most frequently changing, dependency manifests before source code.",
        },
        {
          front: "Why does `RUN rm -rf /var/cache` in a later layer not shrink the image?",
          back:
            "Layers are additive and read-only. The later layer only records a deletion that " +
            "hides the files; the bytes still exist in the earlier layer and still ship.",
        },
        {
          front: "What does `.dockerignore` protect you from, beyond build speed?",
          back:
            "Leaking secrets. Without it `COPY . .` pulls `.env`, `.git` history and local " +
            "credentials into the build context and potentially into the image.",
        },
      ],
      resources: [
        {
          title: "Docker — building best practices",
          url: "https://docs.docker.com/build/building/best-practices/",
          kind: "read",
          minutes: 35,
          whyThisOne: "The cache-ordering and layer-size sections are the two worth reading closely.",
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
      interviewAngle:
        "A Dockerfile review is a common take-home step. The three things a reviewer looks for " +
        "are multi-stage, a non-root `USER`, and the exec form.",
      pitfalls: [
        "Using the shell form of ENTRYPOINT or CMD. It wraps the process in `/bin/sh -c`, " +
          "which breaks signal forwarding.",
        "Setting only CMD and expecting arguments to append. Without ENTRYPOINT, any argument " +
          "replaces the whole command.",
        "Reaching for ADD out of habit. It silently auto-extracts tarballs and fetches URLs; " +
          "COPY is what you meant.",
        "Running as root. Its absence is flagged in every security review, and `USER` is one " +
          "line.",
      ],
      recall: [
        {
          front: "ENTRYPOINT versus CMD — how do they interact?",
          back:
            "ENTRYPOINT is the executable; CMD supplies default arguments that command-line " +
            "arguments replace. With only CMD set, any argument replaces the entire command.",
        },
        {
          front: "Why must you use the exec (JSON array) form?",
          back:
            "The shell form wraps the process in `/bin/sh -c`, so the shell becomes PID 1 and " +
            "signals never reach your process — SIGTERM is swallowed and shutdown is never " +
            "graceful.",
        },
        {
          front: "What does a multi-stage build actually buy you?",
          back:
            "The build toolchain never ships. You compile in a full image, then copy just the " +
            "artifact into a minimal runtime image — smaller to pull and with far less attack " +
            "surface.",
        },
        {
          front: "COPY or ADD, and why?",
          back:
            "COPY. ADD additionally auto-extracts local tarballs and can fetch URLs, which is " +
            "surprising behaviour you almost never want.",
        },
      ],
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
      interviewAngle:
        "`Why can my app not reach the database at localhost?` is the question that reveals " +
        "whether you understand container networking. Inside a container, localhost is the " +
        "container.",
      pitfalls: [
        "Using `localhost` to reach another container. Inside a container that is the " +
          "container itself — use the service name, which Docker's embedded DNS resolves.",
        "Trusting `depends_on` to mean ready. It controls start order only; a started " +
          "Postgres container is not necessarily accepting connections.",
        "Writing data to the container's writable layer. It disappears when the container is " +
          "removed — which is how people lose a database.",
        "Using a bind mount for a database. Named volumes are the managed, correct choice; " +
          "bind mounts are for live-reloading source in development.",
      ],
      recall: [
        {
          front:
            "Why does `postgres://db:5432` work in compose while `postgres://localhost:5432` " +
            "does not?",
          back:
            "Containers on a user-defined bridge network resolve each other by service name " +
            "through Docker's embedded DNS. `localhost` inside a container refers to that " +
            "container, not the host or its siblings.",
        },
        {
          front: "Named volume versus bind mount — when do you use each?",
          back:
            "A named volume is managed by Docker and is right for databases and any persistent " +
            "state. A bind mount maps a host path in and is right for live-reloading source in " +
            "development.",
        },
        {
          front:
            "`depends_on` says the database starts first. Why does your app still fail to " +
            "connect?",
          back:
            "`depends_on` controls start order, not readiness — the container being started " +
            "does not mean Postgres is accepting connections. Use a healthcheck with " +
            "`condition: service_healthy`, and have the app retry on startup regardless.",
        },
      ],
      resources: [
        {
          title: "Docker Compose — file reference",
          url: "https://docs.docker.com/reference/compose-file/",
          kind: "docs",
          minutes: 30,
          whyThisOne: "The healthcheck and depends_on conditions section resolves a common source of compose confusion.",
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
      interviewAngle:
        "`The container keeps restarting — what do you do?` The answer is an ordered set of " +
        "commands and a reading of the exit code, not a guess.",
      pitfalls: [
        "Assuming a container that exits with 0 crashed. Its PID 1 simply finished — often " +
          "the process daemonised itself into the background.",
        "Reading 127 as an application bug. It is command not found, usually a binary missing " +
          "from a slim or distroless base image.",
        "Trying to `exec` into a container that will not stay up. Use `docker run " +
          "--entrypoint sh -it <image>` instead.",
      ],
      recall: [
        {
          front: "What do exit codes 0, 137 and 143 each tell you?",
          back:
            "0 is a clean exit — the process finished, and a container lives exactly as long as " +
            "its PID 1. 137 is SIGKILL, almost always the memory cgroup limit. 143 is SIGTERM, " +
            "a normal graceful stop.",
        },
        {
          front: "What does 127 mean in a container, and what usually causes it?",
          back:
            "Command not found — typically a binary that does not exist in a slim or distroless " +
            "base image, or a missing shell.",
        },
        {
          front: "A container exits immediately. Name the three usual causes.",
          back:
            "The process daemonised itself so PID 1 exited; the command is not found (127) in a " +
            "minimal image; or a config error killed it on startup.",
        },
        {
          front:
            "The container will not stay alive long enough to exec into. How do you get a " +
            "shell?",
          back:
            "`docker run --entrypoint sh -it <image>` — override the entrypoint so you get a " +
            "shell in the same filesystem instead of the failing process.",
        },
      ],
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
