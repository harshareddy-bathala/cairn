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
