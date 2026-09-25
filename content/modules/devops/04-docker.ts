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
      primer: `"It works on my machine" happens because your laptop and the server have different versions of everything. A **container** packages your program *together with everything it needs* — libraries, runtime, config — so it runs the same everywhere.

A container is not a small virtual machine. It is an **ordinary process on the host's Linux kernel**, with two restrictions applied:

- **namespaces** limit what it can *see*: its own process list, its own network, its own files;
- **cgroups** limit what it can *use*: how much CPU and memory.

That is why containers start in under a second and you can run dozens on a laptop — there is no second operating system booting inside. **Docker** is the tool that builds and runs them.

**You need already:** processes from the Linux module, and Docker installed.`,
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
          title: "Docker docs — What is a container?",
          url: "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The official beginner lesson: the idea, the comparison with virtual machines, and your first container.",
          steps: [
            "Read **Explanation** and **Containers versus virtual machines (VMs)**.",
            "Do **Try it out** on your own machine, including *Explore your container* and *Stop your container*.",
            "While it runs, find its process with `ps aux` on the host — it is just a process.",
          ],
          isPrimary: true,
        },
        {
          title: "Julia Evans — What even is a container: namespaces and cgroups",
          url: "https://jvns.ca/blog/2016/10/10/what-even-is-a-container/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "A short, friendly explanation of the two kernel features that make a container.",
        },
        {
          title: "unshare(1) — make a namespace by hand",
          url: "https://man7.org/linux/man-pages/man1/unshare.1.html",
          kind: "lab",
          whyThisOne:
            "Run `sudo unshare --pid --fork --mount-proc bash`, then `ps aux`: you are in your own process namespace.",
        },
      ],
    },
    {
      slug: "devops-docker-images",
      title: "Images, layers & the build cache",
      objective:
        "Order a Dockerfile so the cache actually helps, and explain why a deleted file can still bloat an image.",
      estMinutes: 75,
      primer: `An **image** is the packaged, read-only template a container starts from — a bit like a class, where a running container is an object made from it.

Images are built in **layers**. Each instruction in the build recipe adds one layer on top of the previous ones: a base OS layer, then installed packages, then your code. Layers are shared and **cached**: if nothing has changed up to a given layer, Docker reuses the saved one instead of rebuilding it.

That gives the unit's main lesson: put the things that rarely change (installing dependencies) *before* the things that change all the time (copying your code). Then editing your code rebuilds only the last layer — seconds instead of minutes.

**You need already:** the previous unit — running a container.`,
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
          title: "Docker docs — Understanding the image layers",
          url: "https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Shows layers being created and stacked, then has you build them by hand.",
          steps: [
            "Read **Image layers** and **Stacking the layers**.",
            "Do **Try it out**: *Create a base image*, then *Build an app image*.",
            "Run `docker history` on your image and match each layer to a step.",
            "Then read *Using the build cache* (next link).",
          ],
          isPrimary: true,
        },
        {
          title: "Docker docs — Using the build cache",
          url: "https://docs.docker.com/get-started/docker-concepts/building-images/using-the-build-cache/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "What invalidates the cache and how instruction order decides your rebuild time.",
        },
        {
          title: "Docker — Building best practices",
          url: "https://docs.docker.com/build/building/best-practices/",
          kind: "read",
          whyThisOne:
            "Once the basics are clear: the official list of habits for small, fast, safe images.",
        },
      ],
    },
    {
      slug: "devops-docker-dockerfile",
      title: "Dockerfile mastery: CMD vs ENTRYPOINT, multi-stage, non-root",
      objective:
        "Write a multi-stage Dockerfile producing a small image that runs as a non-root user.",
      estMinutes: 90,
      primer: `A **Dockerfile** is the recipe for building an image — a text file of instructions run top to bottom:

- \`FROM python:3.12-slim\` — start from this base image;
- \`WORKDIR /app\` — work in this folder;
- \`COPY . .\` — copy files in;
- \`RUN pip install -r requirements.txt\` — run a command while building;
- \`CMD ["python", "app.py"]\` — what to run when a container starts.

Two ideas make a Dockerfile production-grade. A **multi-stage build** uses one stage with all the build tools, then copies only the finished result into a small clean final stage. And **running as a non-root user** means a break-in through your app does not get root inside the container.

**You need already:** images and layers from the last unit.`,
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
          title: "Docker docs — Writing a Dockerfile",
          url: "https://docs.docker.com/get-started/docker-concepts/building-images/writing-a-dockerfile/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "The common instructions explained one by one, then a Dockerfile you write yourself.",
          steps: [
            "Read **Explanation** and **Common instructions**.",
            "Do **Try it out** and build the image.",
            "Then read *Multi-stage builds* (next link) and convert your Dockerfile to two stages.",
            "Add a `USER` line so the app does not run as root, and rebuild.",
          ],
          isPrimary: true,
        },
        {
          title: "Docker docs — Multi-stage builds",
          url: "https://docs.docker.com/get-started/docker-concepts/building-images/multi-stage-builds/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Why the final image should not contain your compiler, and how two `FROM` lines achieve that.",
        },
        {
          title: "Dockerfile reference — CMD and ENTRYPOINT",
          url: "https://docs.docker.com/reference/dockerfile/",
          kind: "docs",
          whyThisOne:
            "Look up *Understand how CMD and ENTRYPOINT interact* — the table that summaries usually get wrong.",
        },
      ],
    },
    {
      slug: "devops-docker-runtime",
      title: "Networking, volumes & docker compose",
      objective:
        "Run a multi-service stack locally with compose, and persist data correctly across restarts.",
      estMinutes: 90,
      primer: `Real applications are several containers working together — an API, a database, maybe a cache. Three things make that work.

**Networking.** Containers on the same Docker network can reach each other *by name*: the API connects to \`db:5432\`, not \`localhost:5432\`. Inside a container, \`localhost\` means that container itself.

**Volumes.** A container's own files disappear when it is removed. A **volume** is storage that lives outside the container, so a database keeps its data across restarts and upgrades.

**Docker Compose.** Instead of typing long \`docker run\` commands, you describe every service, network and volume in one \`compose.yaml\` and start everything with \`docker compose up\`.

**You need already:** running containers and writing a Dockerfile.`,
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
          title: "Docker docs — Multi-container applications",
          url: "https://docs.docker.com/get-started/docker-concepts/running-containers/multi-container-applications/",
          kind: "lab",
          minutes: 30,
          whyThisOne:
            "Runs a two-container app by hand first, then replaces all those commands with one Compose file.",
          steps: [
            "Read **Explanation**.",
            "Do **Try it out** — build the images and run the containers by hand.",
            "Do **Simplify the deployment using Docker Compose** and compare the two approaches.",
            "Then do *Persisting container data* (next link) and restart your database without losing data.",
          ],
          isPrimary: true,
        },
        {
          title: "Docker docs — Persisting container data",
          url: "https://docs.docker.com/get-started/docker-concepts/running-containers/persisting-container-data/",
          kind: "lab",
          minutes: 20,
          whyThisOne:
            "Volumes, shown by deleting a container and getting the data back.",
        },
        {
          title: "Docker networking overview",
          url: "https://docs.docker.com/engine/network/",
          kind: "read",
          whyThisOne:
            "Bridge, host and none networks, and why reaching a service by name works.",
        },
      ],
    },
    {
      slug: "devops-docker-debug",
      title: "Debugging containers",
      objective:
        "Diagnose a container that exits immediately, and read the common exit codes.",
      estMinutes: 60,
      primer: `Containers fail in a few typical ways: they exit the moment they start, they keep restarting, or they run but do not answer. Debugging follows the same short routine each time:

1. \`docker ps -a\` — is it running, and what was its **exit code**?
2. \`docker logs <name>\` — what did the program print before it died?
3. \`docker inspect <name>\` — its full configuration: environment, ports, mounts, health.
4. \`docker exec -it <name> sh\` — open a shell *inside* a running container and look around.

Exit codes tell you a lot: 0 means the program simply finished (a container only lives as long as its main process), 1 is an application error, 137 means it was killed — often for using too much memory.

**You need already:** the earlier Docker units.`,
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
          title: "Docker CLI — docker container logs",
          url: "https://docs.docker.com/reference/cli/docker/container/logs/",
          kind: "docs",
          minutes: 10,
          whyThisOne:
            "The first command in every container investigation, with the flags that matter.",
          steps: [
            "Read the description and the options table; try `--tail`, `-f` and `--since` on a running container.",
            "Break a container on purpose (a typo in its command), then find the cause from `docker ps -a` and `docker logs` alone.",
            "Read the `docker container exec` page (next link) and open a shell inside a running container.",
          ],
          isPrimary: true,
        },
        {
          title: "Docker CLI — docker container exec",
          url: "https://docs.docker.com/reference/cli/docker/container/exec/",
          kind: "docs",
          whyThisOne:
            "Getting a shell inside a live container, and running one-off commands in it.",
        },
        {
          title: "Docker CLI — docker inspect",
          url: "https://docs.docker.com/reference/cli/docker/inspect/",
          kind: "docs",
          whyThisOne:
            "Reading the full state of a container, including its exit code and the reason it was killed.",
        },
      ],
    },
  ],
};
