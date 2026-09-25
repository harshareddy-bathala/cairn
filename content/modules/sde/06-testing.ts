import type { Module } from "@/content/types";

export const testing: Module = {
  slug: "sde-testing",
  trackSlug: "sde",
  phaseSlug: "depth",
  order: 3,
  title: "Testing that earns its keep",
  summary:
    "Your Software Testing subject, turned into a resume skill: a test suite for atlas that runs in CI, catches real regressions, and does not break every time the code is refactored. The pyramid tells you what to write, pytest tells you how, and integration tests against a real Postgres tell you whether it actually works.",
  prereqSlugs: ["sde-rest-fastapi"],
  units: [
    {
      slug: "sde-test-pyramid",
      title: "The test pyramid",
      objective:
        "Explain unit, integration and end-to-end tests by speed, confidence and cost, and decide what to test at each level.",
      estMinutes: 50,
      primer: `Tests come in sizes:

- **Unit tests** check one function or class on its own. They run in milliseconds, so you can have thousands.
- **Integration tests** check that pieces work together — your code against a real database, say. Slower, but they catch what unit tests cannot.
- **End-to-end tests** drive the whole system the way a user would. The most realistic, the slowest, and the most likely to break for unrelated reasons.

The **test pyramid** says: many unit tests at the bottom, fewer integration tests, a handful of end-to-end tests at the top. Upside down, the suite is slow and flaky and people stop running it.

A good test checks *behaviour* (what the code does), not *implementation* (how it does it), so refactoring does not break it.

**You need already:** Python, and the FastAPI units.`,
      conceptMd: `| Level | Tests | Speed | Confidence it gives | Breaks when |
|---|---|---|---|---|
| **Unit** | one function or class, dependencies replaced | milliseconds | the logic is right | the logic changes |
| **Integration** | your code with a real database, queue or HTTP layer | ~a second | the pieces fit together | an interface or query changes |
| **End-to-end** | the deployed system through its UI or public API | seconds to minutes | the user's path works | almost anything changes, including timing |

**The pyramid**: many unit tests, fewer integration tests, a handful of end-to-end tests. Lower levels are fast and precise about *where* something broke; higher levels catch what lower ones cannot, but are slow and flaky. An upside-down suite — mostly end-to-end — takes twenty minutes and fails randomly, so people stop trusting it.

**What to test:**

- **Behaviour, not implementation.** Assert on what a function returns or what an endpoint responds, not on which private helpers it called. Tests tied to implementation break on every refactor and catch nothing.
- **The edges**: empty input, one element, the maximum, invalid input, the error path.
- **Every bug fixed gets a test** that fails before the fix — that is a regression test.

**Coverage** tells you what is *not* tested. It does not tell you what *is* tested well: a line can be executed by a test that asserts nothing. Use it to find gaps, not as a target to hit.

Good tests are **fast, independent** (any order, in parallel), **repeatable** (no dependence on time, network or the previous test) and **self-checking** (they assert; nobody reads their output).`,
      interviewAngle:
        "\"How do you test your project?\" is asked about every project on your resume. Describing " +
        "the pyramid as it applies to atlas — what is unit-tested, what hits a real database, what " +
        "the smoke test checks — is a complete answer.",
      pitfalls: [
        "Mostly end-to-end tests, so the suite is slow and flaky and people stop trusting it.",
        "Testing private implementation details, so every refactor breaks the tests.",
        "Chasing a coverage percentage with tests that assert nothing.",
        "Tests that depend on each other's order or on the current time.",
      ],
      recall: [
        {
          front: "Why is the test pyramid wide at the bottom?",
          back:
            "Unit tests are fast, stable and pinpoint failures; end-to-end tests are slow and " +
            "flaky. Most checks belong where they are cheapest.",
        },
        {
          front: "What does code coverage tell you, and what does it not?",
          back:
            "It shows which code no test executes. It does not show whether the executed code is " +
            "checked — a test can run a line and assert nothing.",
        },
        {
          front: "What should the first step of fixing any bug be, test-wise?",
          back: "Write a test that reproduces it and fails; the fix makes it pass, and it guards against regression.",
        },
      ],
      resources: [
        {
          title: "Martin Fowler — The practical test pyramid",
          url: "https://martinfowler.com/articles/practical-test-pyramid.html",
          kind: "read",
          minutes: 45,
          whyThisOne:
            "What goes at each level, with a real service as the example.",
          steps: [
            "Read up to and including the section on unit tests.",
            "Read the integration tests section.",
            "Skim the rest; stop before the contract-testing detail.",
            "List three things in atlas you would test at each level.",
          ],
          isPrimary: true,
        },
      ],
    },
    {
      slug: "sde-test-pytest",
      title: "pytest: fixtures, parametrize & mocking",
      objective:
        "Write pytest suites with fixtures and parametrised cases, replace dependencies with mocks and FastAPI dependency overrides, and know when not to mock.",
      estMinutes: 75,
      primer: `**pytest** is Python's standard test tool. A test is a function whose name starts with \`test_\` and which uses plain \`assert\`: \`assert add(2, 3) == 5\`. Run \`pytest\` and it finds and runs them all.

Three features do most of the work:

- **Fixtures** — functions that set up what a test needs (a database session, a test client) and clean up afterwards; a test asks for one just by naming it as a parameter.
- **Parametrize** — run the same test over a table of inputs and expected outputs.
- **Mocks** — replace a slow or external dependency (an email sender, a payment API) with a fake that records how it was called.

Mock the things you do not own; do not mock your own code so heavily that the test only proves the mock works.

**You need already:** the test pyramid unit.`,
      conceptMd: `**Fixtures** provide what a test needs, and clean it up afterwards:

\`\`\`python
# conftest.py — fixtures here are available to every test in the directory
import pytest

@pytest.fixture
def user(db):                      # fixtures can depend on other fixtures
    u = db.create_user(email="a@x.dev")
    yield u                        # the test runs here
    db.delete_user(u.id)           # teardown, even if the test failed

def test_user_can_rename(user):
    user.rename("Ada")
    assert user.name == "Ada"
\`\`\`

\`scope="session"\` builds a fixture once for the whole run (an expensive database container); the default \`scope="function"\` builds it per test (isolation).

**Parametrize** turns one test into a table of cases:

\`\`\`python
@pytest.mark.parametrize("raw, ok", [("https://a.dev", True), ("ftp://a.dev", False), ("", False)])
def test_validate_url(raw, ok):
    assert is_valid_url(raw) is ok
\`\`\`

**Test doubles** replace a dependency: a **stub** returns canned answers; a **mock** also records how it was called so you can assert on it; a **fake** is a working lightweight version (an in-memory repository).

\`\`\`python
from unittest.mock import patch

@patch("atlas.links.send_email")            # patch where it is *looked up*, not where it is defined
def test_signup_sends_welcome(send_email, client):
    client.post("/signup", json={...})
    send_email.assert_called_once()
\`\`\`

**FastAPI** has a cleaner seam: \`app.dependency_overrides[get_db] = lambda: test_db\` swaps a dependency for every request in the test, and \`TestClient\` calls the app without a server.

**When not to mock:** mock things that are slow, external or non-deterministic — email, payment APIs, the clock. Do **not** mock your own database layer in every test; a suite where everything is mocked tests the mocks. That is what the integration tests in the next unit are for.`,
      interviewAngle:
        "Interviewers ask \"what is a fixture?\" and \"mock versus stub?\" to check you have written " +
        "tests rather than read about them. \"Patch where it is looked up\" is the detail that " +
        "shows you have been bitten by it.",
      pitfalls: [
        "Patching a function where it is defined instead of where the code under test imports it.",
        "Mocking the database everywhere, so the suite passes while the SQL is wrong.",
        "Session-scoped fixtures that tests mutate, so tests leak state into each other.",
        "Copy-pasting near-identical tests instead of parametrising.",
      ],
      recall: [
        {
          front: "In a pytest fixture, what does the code after `yield` do?",
          back: "It is teardown — it runs after the test finishes, whether the test passed or failed.",
        },
        {
          front: "Stub, mock, fake — one line each.",
          back:
            "A stub returns canned answers; a mock also records calls so you can assert on them; " +
            "a fake is a working lightweight implementation, like an in-memory store.",
        },
        {
          front: "Why patch `atlas.links.send_email` rather than `atlas.email.send_email`?",
          back:
            "patch replaces the name where it is looked up; the code under test uses the name " +
            "imported into atlas.links, so that is the one to replace.",
        },
      ],
      resources: [
        {
          title: "pytest — Get started",
          url: "https://docs.pytest.org/en/stable/getting-started.html",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "Install, write and run a first test, then group tests and use a first fixture.",
          steps: [
            "Work through the page, running every example.",
            "Then read [How to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html) up to *yield* fixtures.",
            "Write fixture-based tests for one atlas endpoint, using FastAPI dependency overrides (next link).",
            "Read Fowler's *Mocks aren't stubs* (last link) before adding any mock.",
          ],
          isPrimary: true,
        },
        {
          title: "FastAPI — Testing dependencies with overrides",
          url: "https://fastapi.tiangolo.com/advanced/testing-dependencies/",
          kind: "docs",
          whyThisOne:
            "`dependency_overrides`, the clean way to swap a dependency in FastAPI tests.",
        },
        {
          title: "Martin Fowler — Mocks aren't stubs",
          url: "https://martinfowler.com/articles/mocksArentStubs.html",
          kind: "read",
          whyThisOne:
            "The vocabulary of test doubles, and the case against over-mocking.",
        },
      ],
    },
    {
      slug: "sde-test-integration",
      title: "Integration tests against a real database, in CI",
      objective:
        "Run atlas's integration tests against a real Postgres — locally with a container and in CI with a service container — with each test isolated.",
      estMinutes: 90,
      primer: `Unit tests with a fake database can pass while the real one fails — a typo in SQL, a missing index, a constraint you forgot. **Integration tests** run your code against a **real Postgres**.

You do not need a permanent test database. Locally, **Testcontainers** starts a throwaway Postgres in Docker for the test run and deletes it after. In CI, GitHub Actions can start Postgres as a **service container** next to your job.

Each test must be **isolated** — it must not depend on what an earlier test left behind. The usual way: run each test inside a transaction and roll it back at the end, or truncate the tables between tests.

**You need already:** pytest fixtures, Docker, and the CI/CD module.`,
      conceptMd: `**Test against the database you run.** SQLite is tempting for tests, but it differs from Postgres in types, constraint behaviour, \`ON CONFLICT\`, JSON operators and locking — so tests pass and production fails. Use a real Postgres.

**Locally**, start one in a container. \`testcontainers\` does it from inside the test run:

\`\`\`python
# conftest.py
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def pg_url():
    with PostgresContainer("postgres:16") as pg:
        yield pg.get_connection_url()
\`\`\`

**In CI**, GitHub Actions runs Postgres as a **service container** beside the job:

\`\`\`yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:test@localhost:5432/postgres
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: alembic upgrade head          # the same migrations production runs
      - run: pytest
\`\`\`

The health options make the job wait until Postgres accepts connections.

**Isolating tests.** Tests must not see each other's rows. The fastest approach: run each test inside a transaction and **roll it back** at the end. Where the code under test commits, truncate the tables between tests instead. Either way, build the schema by running your **real migrations**, so the tests also prove the migrations work.

**What an integration test checks**: an endpoint called through \`TestClient\`, hitting the real database, asserting on the response *and* on what is now stored. A unique-constraint violation returning 409, pagination with real ordering, a transaction rolling back on error — the things unit tests with mocks cannot see.`,
      interviewAngle:
        "\"Do your tests hit a real database?\" separates hobby projects from serious ones. \"Yes — " +
        "Postgres as a service container in CI, migrations applied, each test rolled back\" is a " +
        "concrete and strong answer.",
      pitfalls: [
        "Using SQLite in tests for a Postgres application.",
        "Creating the test schema with create_all() instead of running the real migrations.",
        "Tests that share rows, so they pass alone and fail together.",
        "No health check on the CI service container, so tests start before Postgres is ready.",
      ],
      recall: [
        {
          front: "Why should a Postgres application not use SQLite for its tests?",
          back:
            "They differ in types, constraints, ON CONFLICT, JSON and locking, so tests can pass " +
            "while the same SQL fails in production.",
        },
        {
          front: "How do you keep integration tests from seeing each other's data?",
          back:
            "Run each test in a transaction that is rolled back afterwards — or truncate tables " +
            "between tests when the code under test commits.",
        },
        {
          front: "In GitHub Actions, how does a job get a Postgres to test against?",
          back: "A `services:` container on the job, with a pg_isready health check so steps wait until it is up.",
        },
      ],
      resources: [
        {
          title: "GitHub — Creating PostgreSQL service containers",
          url: "https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers",
          kind: "lab",
          minutes: 30,
          whyThisOne:
            "The exact CI setup, with the health check.",
          steps: [
            "Read the page and copy its service definition into atlas's workflow.",
            "Keep the health-check options — without them tests can start before Postgres is ready.",
            "Locally, start the same Postgres with Testcontainers (next link) from a pytest fixture.",
            "Make each test roll back its own transaction.",
          ],
          isPrimary: true,
        },
        {
          title: "Testcontainers — Getting started for Python",
          url: "https://testcontainers.com/guides/getting-started-with-testcontainers-for-python/",
          kind: "lab",
          whyThisOne:
            "A real Postgres per test run on your laptop, from a pytest fixture.",
        },
        {
          title: "FastAPI — Testing",
          url: "https://fastapi.tiangolo.com/tutorial/testing/",
          kind: "docs",
          whyThisOne:
            "TestClient basics, for driving the endpoints in these tests.",
        },
      ],
    },
  ],
};
