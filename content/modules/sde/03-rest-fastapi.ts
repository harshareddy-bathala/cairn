import type { Module } from "@/content/types";

export const restFastapi: Module = {
  slug: "sde-rest-fastapi",
  trackSlug: "sde",
  phaseSlug: "foundations",
  order: 3,
  title: "REST API design & FastAPI",
  summary:
    "The foundation for atlas. Same stack as Meridian, so the effort compounds — and API design questions are common in backend rounds because they reveal how you think about contracts.",
  prereqSlugs: ["sde-oop"],
  units: [
    {
      slug: "sde-rest-design",
      title: "Resources, verbs & status codes",
      objective:
        "Design a small API with correct nouns, verbs and status codes, and defend each choice.",
      estMinutes: 75,
      conceptMd: `**Resources are nouns, plural.** \`/users\`, \`/users/42\`, \`/users/42/orders\`. Verbs belong in the HTTP method, not the path — \`POST /users\`, never \`POST /createUser\`.

Method semantics carry real guarantees. **GET** is safe (no side effects) and cacheable. **PUT** replaces and is **idempotent** — doing it twice equals doing it once. **PATCH** partially updates. **DELETE** is idempotent. **POST** is neither safe nor idempotent, which is why double-submitting a form can create two records.

Idempotency is not trivia: it decides whether a client can safely retry after a timeout. When the client does not know whether its request landed, only an idempotent endpoint can be retried blindly. For POST, the standard answer is an **\`Idempotency-Key\` header** that the server records — a genuinely strong thing to raise unprompted.

Status codes that carry meaning: **201** with a \`Location\` header on creation, **204** for a successful delete with no body, **400** malformed, **401** unauthenticated, **403** forbidden, **404** missing, **409** conflict, **422** semantically invalid, **429** rate limited.`,
      interviewAngle:
        "API design questions reveal how you think about contracts. Raising idempotency keys " +
        "unprompted, as the answer to `can the client retry?`, is a genuinely strong move.",
      pitfalls: [
        "Putting verbs in the path. `POST /createUser` — the verb is the method, the path is " +
          "the noun.",
        "Treating idempotency as trivia. It decides whether a client can safely retry after a " +
          "timeout, which is a real availability property.",
        "Returning 200 for a creation. It is 201 with a `Location` header; 204 is the no-body " +
          "success.",
        "Using 400 for everything. 401, 403, 404, 409, 422 and 429 each tell the client " +
          "something different about what to do next.",
      ],
      recall: [
        {
          front: "Which HTTP methods are idempotent, and why does that matter operationally?",
          back:
            "GET, PUT and DELETE (GET is also safe). It matters because a client that times out " +
            "does not know whether its request landed — and only an idempotent endpoint can be " +
            "blindly retried.",
        },
        {
          front: "POST is not idempotent. How do you make it safely retryable?",
          back:
            "An `Idempotency-Key` header that the client generates and the server records, so a " +
            "repeat of the same key returns the original result instead of creating a second " +
            "record.",
        },
        {
          front:
            "What do you return on a successful creation, and on a successful delete with no " +
            "body?",
          back:
            "201 with a `Location` header pointing at the new resource, and 204 respectively.",
        },
        {
          front: "409 versus 422 — what is the difference?",
          back:
            "409 is a conflict with current state (the resource already exists, or a version " +
            "clash). 422 is a well-formed request that is semantically invalid — the shape " +
            "parsed, the meaning did not.",
        },
      ],
      resources: [
        {
          title: "Microsoft — REST API design guidelines",
          url: "https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design",
          kind: "read",
          minutes: 40,
          whyThisOne: "Opinionated and complete, with the idempotency and versioning reasoning spelled out.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "sde-rest-fastapi-build",
      title: "Building it with FastAPI",
      objective:
        "Stand up a FastAPI service with Pydantic validation, dependency injection and generated docs.",
      estMinutes: 90,
      conceptMd: `FastAPI's core idea: **your type hints are the contract.** A Pydantic model on a request body gives you parsing, validation, a 422 with a precise error, and OpenAPI documentation — from one declaration.

\`\`\`python
class UnitIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    est_minutes: int = Field(gt=0, le=480)

@app.post("/units", status_code=201)
async def create_unit(body: UnitIn, db: Session = Depends(get_db)) -> UnitOut:
    ...
\`\`\`

\`Depends\` is dependency injection — the D in SOLID, made concrete. It is how you get a database session per request and, importantly, how you swap in a fake one for tests.

Separate your input and output models. Reusing one model for both is how password hashes end up in API responses.

\`/docs\` gives you an interactive Swagger UI for free. Point at it in an interview: a documented API is evidence of professional habits.`,
      interviewAngle:
        "`How do you test this?` follows any API answer, and `Depends` is the concrete reply — " +
        "dependency injection is what lets a test swap in a fake session.",
      pitfalls: [
        "Reusing one Pydantic model for input and output. That is how password hashes end up " +
          "in API responses — separate the models.",
        "Validating by hand inside the handler. The type hints and `Field` constraints are " +
          "the contract; FastAPI turns them into a 422 with a precise error for free.",
        "Constructing the database session inside the handler instead of taking it through " +
          "`Depends`, which makes it unswappable in tests.",
      ],
      recall: [
        {
          front: "What do you get from declaring a Pydantic model on a request body?",
          back:
            "Parsing, validation, a 422 with a precise per-field error, and an OpenAPI schema " +
            "that drives the generated docs — from one declaration.",
        },
        {
          front: "What is `Depends` and which SOLID principle is it?",
          back:
            "Dependency injection — the D, Dependency Inversion, made concrete. It supplies a " +
            "database session per request and lets a test substitute a fake without touching " +
            "the handler.",
        },
        {
          front: "Why must input and output models be separate?",
          back:
            "Because they are different contracts. Sharing one lets internal fields — a " +
            "password hash, an internal flag — leak into responses the moment someone adds them " +
            "to the model.",
        },
      ],
      resources: [
        {
          title: "FastAPI — tutorial (first steps through dependencies)",
          url: "https://fastapi.tiangolo.com/tutorial/",
          kind: "do",
          minutes: 90,
          whyThisOne: "Genuinely excellent documentation — among the best in any framework. Work it, do not read it.",
          isPrimary: true,
        },
        {
          title: "Pydantic — models",
          url: "https://docs.pydantic.dev/latest/concepts/models/",
          kind: "docs",
          whyThisOne: "Validation is where FastAPI's leverage comes from; knowing the field constraints pays off fast.",
        },
      ],
    },
    {
      slug: "sde-rest-auth",
      title: "Authentication: sessions, JWT & password storage",
      objective:
        "Choose between sessions and JWT with a stated trade-off, and store passwords correctly.",
      estMinutes: 75,
      conceptMd: `**Sessions**: the server stores session state and hands the client an opaque ID. Revocation is trivial — delete the row. Requires shared session storage across instances.

**JWT**: a signed token carrying claims; the server stores nothing and verifies the signature. Scales without shared state, but **revocation is the hard part** — a valid token stays valid until it expires. The standard mitigation is short-lived access tokens plus a refresh token you *can* revoke.

Naming that trade-off is the answer. "JWT because it is stateless, and I would keep access tokens at 15 minutes with a revocable refresh token" is a complete one.

**Password storage**: never plaintext, never a bare SHA-256. Use **bcrypt** or **argon2** — deliberately slow, with a per-password **salt** that defeats rainbow tables. Fast hashes are the wrong tool here precisely because they are fast.

Also: **never put secrets in a JWT payload.** It is base64, not encryption — anyone holding the token can read it.`,
      interviewAngle:
        "Sessions or JWT is a trade-off question, and the complete answer names revocation as " +
        "the cost of statelessness plus the short-token mitigation.",
      pitfalls: [
        "Claiming a JWT can be revoked. It stays valid until it expires — that is the cost of " +
          "statelessness, and the mitigation is short-lived access tokens plus a revocable " +
          "refresh token.",
        "Putting anything secret in a JWT payload. It is base64, not encryption; anyone " +
          "holding the token can read it.",
        "Hashing passwords with SHA-256. Fast hashes are the wrong tool precisely because " +
          "they are fast — use bcrypt or argon2.",
        "Omitting the salt. Without a per-password salt, rainbow tables do the work for the " +
          "attacker.",
      ],
      recall: [
        {
          front: "Sessions versus JWT — state the trade-off in one sentence each.",
          back:
            "Sessions store state server-side and hand out an opaque ID, so revocation is " +
            "trivial but you need shared session storage. JWTs are signed and stateless, so " +
            "they scale without shared storage, but a valid token cannot be revoked before it " +
            "expires.",
        },
        {
          front: "Give a complete one-sentence answer to `which would you choose?`",
          back:
            "JWT because it is stateless, with access tokens kept to about 15 minutes and a " +
            "refresh token that *is* revocable — naming the mitigation is what makes the answer " +
            "complete.",
        },
        {
          front: "How should passwords be stored, and why not SHA-256?",
          back:
            "bcrypt or argon2 with a per-password salt. They are deliberately slow, which is " +
            "what makes brute force expensive; SHA-256 is fast, which helps the attacker, and " +
            "the salt is what defeats rainbow tables.",
        },
        {
          front: "Why must secrets never go in a JWT payload?",
          back:
            "The payload is base64-encoded, not encrypted. The signature protects integrity, " +
            "not confidentiality — anyone holding the token can decode and read every claim.",
        },
      ],
      resources: [
        {
          title: "OWASP — Password Storage Cheat Sheet",
          url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
          kind: "read",
          minutes: 25,
          whyThisOne: "The authoritative short answer, and it ties directly into your Cyber Security subject.",
          isPrimary: true,
        },
        {
          title: "FastAPI — OAuth2 with JWT",
          url: "https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/",
          kind: "do",
          minutes: 45,
          whyThisOne: "A working end-to-end implementation you will lift almost directly into atlas.",
        },
      ],
    },
    {
      slug: "sde-rest-production",
      title: "What makes an API production-shaped",
      objective:
        "Add structured logging, error handling, pagination and config that an operator would thank you for.",
      estMinutes: 75,
      conceptMd: `This unit is what turns a toy API into something you can defend as production work.

**Structured logging** — emit JSON, not prose. \`{"level":"error","request_id":"...","route":"/units","latency_ms":412}\` is queryable; "Error processing request" is not. Attach a **request ID** to every log line and return it in the response header, so a user report maps to exact log lines.

**Error handling** — one exception handler producing a consistent error shape. Never leak stack traces to clients; log them with the request ID instead.

**Pagination** — never return an unbounded list. Offset pagination is simple but drifts when rows are inserted; cursor pagination is stable and is what you want for anything append-only.

**Config from the environment**, never committed. Twelve-factor: config varies per deployment, code does not.

**Health endpoints** — a liveness check that says the process is up, and a readiness check that says it can serve (database reachable). Kubernetes needs both, and getting the distinction right is a real interview question in phase 3.`,
      interviewAngle:
        "Liveness versus readiness is a real question in phase 3, and the request-ID answer is " +
        "what turns `I built an API` into `I built an API someone can operate`.",
      pitfalls: [
        "Logging prose. `Error processing request` is not queryable; structured JSON with a " +
          "request ID is.",
        "Returning stack traces to clients. Log them against the request ID instead and " +
          "return a consistent error shape.",
        "Returning an unbounded list. Offset pagination drifts when rows are inserted; cursor " +
          "pagination is stable for append-only data.",
        "Committing config. Config varies per deployment and code does not — that is the " +
          "twelve-factor line.",
      ],
      recall: [
        {
          front: "What makes a log line useful in an incident?",
          back:
            "That it is structured and correlated — JSON fields rather than prose, and a " +
            "request ID on every line that is also returned in the response header, so a user's " +
            "report maps to exact log lines.",
        },
        {
          front: "Offset versus cursor pagination — when does offset break?",
          back:
            "Offset drifts when rows are inserted or deleted between pages, so items get " +
            "skipped or repeated. Cursor pagination anchors to a stable key and is what you " +
            "want for anything append-only.",
        },
        {
          front:
            "Liveness versus readiness — what does each mean, and what happens if you confuse " +
            "them?",
          back:
            "Liveness says the process is alive; failing it restarts the container. Readiness " +
            "says it can serve requests right now; failing it removes it from load balancing. " +
            "Putting a database check in liveness turns a brief database blip into a restart " +
            "loop.",
        },
      ],
      resources: [
        {
          title: "The Twelve-Factor App",
          url: "https://12factor.net/",
          kind: "read",
          minutes: 40,
          whyThisOne: "Short, and it is the shared vocabulary for what 'production-ready' means. Read all twelve.",
          isPrimary: true,
        },
        {
          title: "Google SRE Book — ch. 16, Tracking Outages",
          url: "https://sre.google/sre-book/tracking-outages/",
          kind: "read",
          minutes: 25,
          whyThisOne: "Shows why structured, correlated logs matter — from the operator's side of the fence.",
        },
      ],
    },
  ],
};
