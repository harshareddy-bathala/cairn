import type { Module } from "@/content/types";

export const dbDepth: Module = {
  slug: "corecs-db-depth",
  trackSlug: "corecs",
  phaseSlug: "depth",
  order: 1,
  title: "Databases in depth",
  summary:
    "The second pass on databases, from the side of someone who runs one. Read a query plan and find the slow step; design indexes for the queries you actually have; kill N+1 queries; write the window functions interviewers love; and handle the isolation anomalies that only appear under concurrency — with the retry loop that makes serializable transactions usable.",
  prereqSlugs: ["corecs-dbms"],
  units: [
    {
      slug: "corecs-dbd-explain",
      title: "Reading EXPLAIN ANALYZE",
      objective:
        "Read a Postgres plan inside-out, recognise the common scan and join nodes, and find the step where time actually goes.",
      estMinutes: 70,
      primer: `When a query is slow, do not guess — ask the database what it did. \`EXPLAIN ANALYZE\` runs the query and prints its **plan**: a tree of steps, each with how many rows it produced and how long it took.

Read the tree from the **innermost, most indented** step outward — those run first and feed the steps above them. The step names tell a story: a **Seq Scan** read the whole table; an **Index Scan** used an index; a **Nested Loop**, **Hash Join** or **Merge Join** combined two inputs.

Two things to look for: the step where most of the time goes, and places where the planner's **estimated** row count is far from the **actual** one — a bad estimate is often why it chose a slow plan.

**You need already:** SQL joins, and indexes from the Phase 1 DBMS unit.`,
      conceptMd: `\`EXPLAIN\` shows the plan the optimiser chose, with **estimates**. \`EXPLAIN ANALYZE\` **runs the query** and adds what actually happened. \`EXPLAIN (ANALYZE, BUFFERS)\` also shows how many pages came from cache versus disk.

Because ANALYZE executes the statement, wrap writes in a transaction you roll back:

\`\`\`sql
BEGIN;
EXPLAIN (ANALYZE, BUFFERS) UPDATE links SET clicks = clicks + 1 WHERE code = 'aZ3x9Qk';
ROLLBACK;
\`\`\`

**Read it inside-out.** The plan is a tree; the most indented nodes run first and feed their parents. Each node shows:

\`\`\`text
Index Scan using links_pkey on links  (cost=0.42..8.44 rows=1 width=64) (actual time=0.031..0.032 rows=1 loops=1)
\`\`\`

- \`cost\` — the optimiser's unit-less estimate (start-up..total). Compare costs between plans, never to milliseconds.
- \`rows\` estimated vs \`actual ... rows\` — **a large mismatch is the most important thing in a plan**: the optimiser chose based on a wrong guess.
- \`loops\` — the node ran this many times; multiply \`actual time\` by \`loops\` for its real total. An inner node with loops=50,000 is often the whole problem.

**Nodes to recognise:**

| Node | Means |
|---|---|
| Seq Scan | read the whole table — fine for small tables or when most rows match |
| Index Scan | walk the index, then fetch each row from the table |
| Index Only Scan | answer from the index alone (a covering index) |
| Bitmap Heap Scan | collect matching row locations from an index, then read them in physical order |
| Nested Loop | for each outer row, look up inner rows — great when the outer side is small |
| Hash Join | build a hash table on one side, probe it with the other — good for large unsorted inputs |
| Merge Join | walk two sorted inputs together |
| Sort (external merge Disk) | the sort spilled to disk — \`work_mem\` too small, or too many rows |

**The method:** find the node with the largest actual time × loops; check its estimate against reality; ask whether an index, a rewritten query or fresh statistics (\`ANALYZE table\`) would change the plan.`,
      interviewAngle:
        "\"This query is slow — what do you do?\" wants EXPLAIN ANALYZE, then a specific reading: " +
        "which node dominates, whether estimates match, and what change you would try. Mentioning " +
        "loops shows you have read real plans.",
      pitfalls: [
        "Running EXPLAIN ANALYZE on an UPDATE or DELETE outside a rolled-back transaction.",
        "Comparing cost numbers to milliseconds.",
        "Reading a node's actual time without multiplying by loops.",
        "Assuming a Seq Scan is always bad — on a small table or a non-selective filter it is the right plan.",
      ],
      recall: [
        {
          front: "Why must EXPLAIN ANALYZE on an UPDATE be wrapped in BEGIN … ROLLBACK?",
          back: "EXPLAIN ANALYZE actually executes the statement, so the update would really happen.",
        },
        {
          front: "In a query plan, what does `loops=50000` on an inner node tell you?",
          back:
            "The node ran 50,000 times — usually the inner side of a nested loop — so its real cost " +
            "is its per-loop time multiplied by 50,000.",
        },
        {
          front: "Nested loop versus hash join — when is each the right choice?",
          back:
            "Nested loop when the outer side is small and the inner lookup is indexed; hash join " +
            "when both inputs are large and unsorted.",
        },
      ],
      resources: [
        {
          title: "PostgreSQL — Using EXPLAIN",
          url: "https://www.postgresql.org/docs/current/using-explain.html",
          kind: "docs",
          minutes: 40,
          whyThisOne:
            "The official walkthrough of every field, with real plans — the best explanation there is.",
          steps: [
            "Read *EXPLAIN Basics* and run the same kind of queries on your own tables.",
            "Read *EXPLAIN ANALYZE* and compare estimated with actual rows in your output.",
            "Paste one of atlas's plans into explain.dalibo.com (next link) and find the slowest node.",
          ],
          isPrimary: true,
        },
        {
          title: "explain.dalibo.com — plan visualiser",
          url: "https://explain.dalibo.com/",
          kind: "do",
          whyThisOne:
            "Paste a plan and see where the time goes, as a tree.",
        },
      ],
    },
    {
      slug: "corecs-dbd-index-design",
      title: "Designing indexes",
      objective:
        "Design composite, covering, partial and expression indexes for specific queries, and weigh each index against its write cost.",
      estMinutes: 70,
      primer: `An index helps only the queries it was designed for, so you design indexes from your actual queries.

- A **composite index** covers several columns, and **order matters**: an index on \`(user_id, created_at)\` helps \`WHERE user_id = ?\` and \`WHERE user_id = ? ORDER BY created_at\`, but not \`WHERE created_at > ?\` alone. Put columns you test with \`=\` first.
- A **covering index** also stores the columns the query returns (\`INCLUDE\`), so the table itself need not be read.
- A **partial index** indexes only some rows (\`WHERE status = 'open'\`) — smaller and faster when you only ever query those.
- An **expression index** indexes a computed value, like \`lower(email)\`.

Every index slows down writes and takes space, so each one must earn its place.

**You need already:** EXPLAIN from the last unit.`,
      conceptMd: `An index is designed **for a query**, not for a column. Start from the \`WHERE\`, \`JOIN\` and \`ORDER BY\` of the queries that matter.

**Composite index column order.** Put columns compared with **equality first**, then the one used for a **range or sort**:

\`\`\`sql
-- query: WHERE owner_id = $1 AND created_at > now() - interval '7 days' ORDER BY created_at DESC
CREATE INDEX links_owner_created ON links (owner_id, created_at DESC);
\`\`\`

With \`(owner_id, created_at)\` the index jumps to one owner and reads that owner's rows already in date order — no sort. Reversed, \`(created_at, owner_id)\`, it must scan every owner's rows in the date range.

**Covering indexes** — include the other columns the query returns, and Postgres can answer from the index alone (an **Index Only Scan**):

\`\`\`sql
CREATE INDEX links_code_cover ON links (code) INCLUDE (long_url);
\`\`\`

Index-only scans also depend on the table's visibility map being current, which autovacuum maintains.

**Partial indexes** index only the rows a query cares about — smaller and faster:

\`\`\`sql
CREATE INDEX jobs_pending ON jobs (created_at) WHERE status = 'pending';
\`\`\`

**Expression indexes** match a function in the query:

\`\`\`sql
CREATE INDEX users_email_lower ON users (lower(email));   -- serves WHERE lower(email) = $1
\`\`\`

**The cost side.** Every index slows every \`INSERT\`, every \`UPDATE\` of an indexed column and every \`DELETE\`, and takes space and cache. An unused index is pure cost — \`pg_stat_user_indexes\` shows which ones are never scanned. And an index on a low-selectivity column (a boolean where most rows are \`true\`) is rarely used.

Build indexes on a live table with \`CREATE INDEX CONCURRENTLY\` so writes are not blocked.`,
      interviewAngle:
        "Interviewers give a query and ask for the index. Getting the column order right — equality " +
        "then range — and mentioning INCLUDE or a partial index shows design, not just knowing that " +
        "indexes exist.",
      pitfalls: [
        "Putting the range column first in a composite index.",
        "One single-column index per column instead of one composite index for the query.",
        "Forgetting that each index is paid for on every write.",
        "CREATE INDEX without CONCURRENTLY on a busy production table, blocking writes.",
      ],
      recall: [
        {
          front: "For WHERE a = ? AND b > ? ORDER BY b, what composite index, in what order?",
          back: "(a, b): the equality column first, then the range and sort column, so one range of the index is read in order.",
        },
        {
          front: "What is a covering index, and which scan does it enable?",
          back:
            "An index that contains every column the query needs (via INCLUDE), enabling an Index " +
            "Only Scan that never touches the table.",
        },
        {
          front: "When is a partial index the right tool?",
          back:
            "When queries only ever touch a small, fixed subset of rows — like status = 'pending' — " +
            "so the index can skip the rest and stay small.",
        },
      ],
      resources: [
        {
          title: "Use The Index, Luke — Column order in multi-column indexes",
          url: "https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Why a two-column index helps some queries and not others — the argument for column order.",
          steps: [
            "Read the page and predict which of its example queries can use the index.",
            "Read Postgres's covering-index page (next link) and add an `INCLUDE` to one of your indexes.",
            "Read the partial-index page (last link).",
            "For three atlas queries, write the index you would add and check it with EXPLAIN.",
          ],
          isPrimary: true,
        },
        {
          title: "PostgreSQL — Index-only scans and covering indexes",
          url: "https://www.postgresql.org/docs/current/indexes-index-only-scans.html",
          kind: "docs",
          whyThisOne:
            "`INCLUDE`, and the visibility-map condition for index-only scans.",
        },
        {
          title: "PostgreSQL — Partial indexes",
          url: "https://www.postgresql.org/docs/current/indexes-partial.html",
          kind: "docs",
          whyThisOne:
            "When a partial index helps, with examples.",
        },
      ],
    },
    {
      slug: "corecs-dbd-n-plus-one",
      title: "The N+1 problem & thinking in sets",
      objective:
        "Recognise and fix N+1 queries from an ORM, and move row-by-row application logic into single set-based SQL statements.",
      estMinutes: 60,
      primer: `The **N+1 problem** is the most common way an app makes a database slow without any single slow query.

You load 50 blog posts (1 query), then loop over them and load each post's author (50 more queries) — 51 round trips where 1 or 2 would do. ORMs do this silently when you access a related object inside a loop.

The fixes: load the related rows **up front** — with a **join**, or with one extra query using \`WHERE id IN (...)\` — which ORMs offer as \`joinedload\` / \`selectinload\`.

The wider habit is **thinking in sets**: instead of fetching rows and looping over them in Python, write one SQL statement that does the whole job — an \`UPDATE ... FROM\`, a \`GROUP BY\`, a join.

**You need already:** SQL joins; SQLAlchemy if you use it in atlas.`,
      conceptMd: `**N+1**: one query fetches a list, then the code runs one more query **per item**:

\`\`\`python
links = session.scalars(select(Link).limit(50)).all()      # 1 query
for link in links:
    print(link.owner.email)                                # +1 query per link: 51 in total
\`\`\`

Each query is fast, so nothing looks slow in isolation — but 51 round trips at 1 ms each is 51 ms, and the page with 500 items takes half a second. It is the most common performance bug in ORM code.

**Detect it** by counting queries per request: turn on SQL logging (\`echo=True\` in SQLAlchemy) in development, or assert on the query count in a test.

**Fix it** by loading the related rows in bulk:

- a **JOIN** — one query, rows widened (\`joinedload\` in SQLAlchemy);
- an **IN** query for all related IDs at once — two queries total, whatever N is (\`selectinload\`). Usually the better choice for one-to-many relationships.

**Thinking in sets.** The same mistake without an ORM: fetching rows into Python and looping to compute something SQL could do in one statement. "The highest-paid employee in each department" is not a loop over departments — it is one query:

\`\`\`sql
SELECT d.name AS department, e.name, e.salary
FROM employee e JOIN department d ON d.id = e.department_id
WHERE (e.department_id, e.salary) IN (
  SELECT department_id, max(salary) FROM employee GROUP BY department_id
);
\`\`\`

The database can use indexes, avoid the round trips, and never ship unneeded rows to the app. When you catch yourself writing a loop around a query, ask what the single query would be.`,
      interviewAngle:
        "\"What is the N+1 problem?\" is a common backend question, and the strong answer names the " +
        "detection (query counting) and both fixes (join versus IN-batch loading) — then applies " +
        "the same idea to replacing application loops with set-based SQL.",
      pitfalls: [
        "Accessing a lazy-loaded relationship inside a loop over results.",
        "Fixing N+1 with a JOIN on a one-to-many relationship and multiplying the parent rows.",
        "Computing aggregates in application code after fetching every row.",
        "Never measuring the number of queries a request makes.",
      ],
      recall: [
        {
          front: "What is the N+1 query problem?",
          back:
            "One query loads N items, then code issues one more query per item for related data — " +
            "N+1 round trips where one or two would do.",
        },
        {
          front: "joinedload versus selectinload in SQLAlchemy — how many queries, and when is each better?",
          back:
            "joinedload: one query with a JOIN, good for many-to-one. selectinload: a second query " +
            "with IN (…ids), usually better for one-to-many because parent rows are not multiplied.",
        },
        {
          front: "How do you catch N+1 queries before production?",
          back: "Log SQL in development, or assert on the number of queries a request makes in a test.",
        },
      ],
      resources: [
        {
          title: "PlanetScale — What is the N+1 query problem?",
          url: "https://planetscale.com/blog/what-is-n-1-query-problem-and-how-to-solve-it",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The problem shown and measured, then both fixes compared.",
          steps: [
            "Read the article and note the query count before and after each fix.",
            "Find one N+1 in atlas: turn on SQL logging and load a list page.",
            "Fix it with `selectinload` or `joinedload` from SQLAlchemy (next link).",
            "Set `raiseload` on a relationship so a future N+1 becomes an error.",
          ],
          isPrimary: true,
        },
        {
          title: "SQLAlchemy — Relationship loading techniques",
          url: "https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html",
          kind: "docs",
          whyThisOne:
            "lazy, joinedload, selectinload and raiseload.",
        },
      ],
    },
    {
      slug: "corecs-dbd-window",
      title: "Window functions, properly",
      objective:
        "Use PARTITION BY, ORDER BY and frame clauses for rankings, top-N per group, running totals, moving averages and row-to-row comparisons.",
      estMinutes: 80,
      primer: `\`GROUP BY\` squashes rows into one per group. Sometimes you want to keep every row **and** see something about its group — a rank, a running total, the previous row's value. That is what **window functions** do.

\`\`\`sql
SELECT name, dept, salary,
       rank() OVER (PARTITION BY dept ORDER BY salary DESC)
FROM employees;
\`\`\`

\`OVER (...)\` defines the window: \`PARTITION BY\` splits rows into groups (here, per department), \`ORDER BY\` orders them within each group. Useful functions: \`row_number\`, \`rank\`, \`dense_rank\`, \`lag\` / \`lead\` (the previous or next row), and \`sum\` / \`avg\` used as running totals.

"Top 3 salaries per department" and "compare each day with the day before" are standard interview questions, and both are one window function.

**You need already:** GROUP BY and ORDER BY.`,
      conceptMd: `A window function computes a value for each row **from a set of related rows**, without collapsing them the way \`GROUP BY\` does.

\`\`\`sql
fn(...) OVER (PARTITION BY group_cols ORDER BY sort_cols ROWS BETWEEN ... AND ...)
\`\`\`

**Ranking** — the three differ only on ties:

| salary | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 900 | 1 | 1 | 1 |
| 900 | 2 | 1 | 1 |
| 800 | 3 | 3 | 2 |

**Top N per group** — a window cannot appear in \`WHERE\` (windows are computed after it), so rank in a subquery or CTE and filter outside:

\`\`\`sql
WITH ranked AS (
  SELECT d.name AS dept, e.name, e.salary,
         DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS r
  FROM employee e JOIN department d ON d.id = e.department_id
)
SELECT dept, name, salary FROM ranked WHERE r <= 3;
\`\`\`

**Comparing with neighbouring rows** — \`LAG(x)\` and \`LEAD(x)\` read the previous or next row in the window's order: day-over-day change, "three consecutive equal values", gaps in a sequence.

**Running totals and moving averages** depend on the **frame**:

\`\`\`sql
SUM(amount) OVER (ORDER BY day)                                        -- running total
AVG(amount) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)  -- 7-day moving average
\`\`\`

The trap: with \`ORDER BY\` and no frame, the default is \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, which includes **all rows tied with the current one**. Two rows on the same day get the same running total. Say \`ROWS\` when you mean rows.

Without \`ORDER BY\` in the window, the frame is the whole partition — \`SUM(x) OVER (PARTITION BY g)\` is the group total on every row, useful for "share of the group".`,
      interviewAngle:
        "SQL rounds love window functions: top-N per group, consecutive runs and moving averages " +
        "are the standard asks. Knowing why the window must be filtered in an outer query, and the " +
        "RANGE-versus-ROWS default, is what separates a pass from a strong pass.",
      pitfalls: [
        "Filtering a window function's result in WHERE instead of an outer query.",
        "Using ROW_NUMBER where ties should share a rank, or RANK where the question wants no gaps.",
        "Relying on the default RANGE frame and getting identical running totals for tied rows.",
        "Forgetting PARTITION BY, so the ranking runs across the whole table.",
      ],
      recall: [
        {
          front: "ROW_NUMBER, RANK, DENSE_RANK — how do they differ on the values 900, 900, 800?",
          back: "ROW_NUMBER 1,2,3; RANK 1,1,3; DENSE_RANK 1,1,2.",
        },
        {
          front: "Why can't you write WHERE rank_col <= 3 in the same query that computes the window?",
          back: "Window functions are evaluated after WHERE; compute them in a subquery or CTE and filter outside.",
        },
        {
          front: "What is the default window frame when ORDER BY is given, and what surprise does it cause?",
          back:
            "RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW — it includes all peers tied on the " +
            "ORDER BY value, so tied rows get the same running total.",
        },
      ],
      resources: [
        {
          title: "PostgreSQL — Window functions tutorial",
          url: "https://www.postgresql.org/docs/current/tutorial-window.html",
          kind: "docs",
          minutes: 25,
          whyThisOne:
            "Partitions, ordering and frames, with small examples.",
          steps: [
            "Read the tutorial and run each example on a small table of your own.",
            "Write *top 3 salaries per department* with `dense_rank`.",
            "Write a running total and a 7-day moving average.",
            "Look up any function you need in the reference (next link).",
          ],
          isPrimary: true,
        },
        {
          title: "PostgreSQL — Window function reference",
          url: "https://www.postgresql.org/docs/current/functions-window.html",
          kind: "docs",
          whyThisOne:
            "Every window function, including ntile, first_value and nth_value.",
        },
      ],
    },
    {
      slug: "corecs-dbd-isolation",
      title: "Isolation anomalies & retrying",
      objective:
        "Reproduce lost updates and write skew in Postgres, pick the isolation level or locking that prevents each, and write the retry loop serializable transactions need.",
      estMinutes: 80,
      primer: `Isolation levels (from the Phase 1 transactions unit) become real under concurrency. Two anomalies to recognise:

- **Lost update** — two transactions read the same balance, both add to it, both write back; one addition disappears. Fix: \`SELECT ... FOR UPDATE\` to lock the row, or an atomic \`UPDATE ... SET x = x + 1\`.
- **Write skew** — two transactions each check a condition ("at least one doctor stays on call"), both see it holds, and both make changes that together break it. Only the **Serializable** level, or explicit locking, prevents it.

Serializable does not block; it **aborts** one of the conflicting transactions with a serialization error. So code that uses it needs a **retry loop**: on that error, roll back and run the whole transaction again.

**You need already:** ACID and isolation levels from Phase 1.`,
      conceptMd: `The Phase 1 anomalies (dirty read, non-repeatable read, phantom) are about **reading**. The ones that corrupt data in real systems are about **writing**:

**Lost update.** Two transactions read a value, both compute from it, both write — one write is lost.

\`\`\`sql
-- T1 and T2 both run:
SELECT stock FROM items WHERE id = 7;         -- both see 5
UPDATE items SET stock = 4 WHERE id = 7;      -- both write 4; one sale disappears
\`\`\`

Fixes: do it in one statement (\`UPDATE items SET stock = stock - 1 WHERE id = 7 AND stock > 0\`); or lock the row when reading (\`SELECT … FOR UPDATE\`); or run at **Repeatable Read**, where Postgres aborts the second writer with a serialization failure.

**Write skew.** Two transactions read an overlapping set, each checks a condition, and each writes a *different* row — together they break the rule. The textbook case: at least one doctor must be on call; two doctors each check "someone else is on call", and both go off call. No row was written twice, so row locks do not see a conflict, and **Repeatable Read (snapshot isolation) allows it**. Only **Serializable** prevents it (or an explicit \`SELECT … FOR UPDATE\` on the rows the check reads).

**Postgres isolation levels, precisely:**

| Level | Prevents | Still allows |
|---|---|---|
| Read Committed (default) | dirty reads | non-repeatable reads, phantoms, lost updates, write skew |
| Repeatable Read (snapshot) | the above, phantoms, and lost updates (the second writer fails) | write skew |
| Serializable (SSI) | all of them | — |

(Read Uncommitted behaves as Read Committed in Postgres.)

**The price: retries.** At Repeatable Read and Serializable, Postgres aborts a transaction that cannot be serialised with **SQLSTATE 40001** (\`serialization_failure\`); a deadlock aborts with **40P01**. Both are safe to retry — and the application **must** retry them:

\`\`\`python
for attempt in range(5):
    try:
        with conn.transaction():          # the whole transaction, not just the failing statement
            do_work(conn)
        break
    except SerializationFailure:          # 40001 (and DeadlockDetected, 40P01)
        time.sleep(0.01 * 2 ** attempt + random.random() * 0.01)
else:
    raise
\`\`\`

Retry the **whole** transaction, including its reads — its decisions were based on data that has since changed.`,
      interviewAngle:
        "\"Two users buy the last item at the same time — what happens?\" is a lost update. Naming " +
        "the atomic UPDATE, SELECT FOR UPDATE and serializable-with-retry as the three fixes, and " +
        "write skew as what snapshot isolation misses, is a top-tier database answer.",
      pitfalls: [
        "Read-then-write in application code without locking or an atomic UPDATE.",
        "Believing Repeatable Read prevents every anomaly — Postgres snapshot isolation allows write skew.",
        "Using Serializable without a retry loop, so users see random errors under load.",
        "Retrying only the failed statement instead of the whole transaction.",
      ],
      recall: [
        {
          front: "What is write skew, and which Postgres isolation level prevents it?",
          back:
            "Two transactions read overlapping data, each checks a rule and writes a different row, " +
            "jointly breaking the rule. Only Serializable (or explicit locking of the read rows) prevents it.",
        },
        {
          front: "Give three ways to prevent a lost update on a stock counter.",
          back:
            "An atomic UPDATE … SET stock = stock − 1 WHERE stock > 0; SELECT … FOR UPDATE before " +
            "writing; or Repeatable Read/Serializable with a retry on 40001.",
        },
        {
          front: "Which SQLSTATE codes signal a serialization failure and a deadlock in Postgres, and what must the app do?",
          back: "40001 and 40P01. Retry the entire transaction, with backoff.",
        },
      ],
      resources: [
        {
          title: "Cockroach Labs — What write skew looks like",
          url: "https://www.cockroachlabs.com/blog/what-write-skew-looks-like/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The on-call doctors example, step by step — the clearest picture of the anomaly.",
          steps: [
            "Read the example and replay it in two `psql` sessions at Read Committed.",
            "Repeat at Serializable and watch one transaction fail.",
            "Read the Postgres isolation page (next link) for what each level guarantees.",
            "Read serialization failure handling (last link) and write a retry loop for atlas.",
          ],
          isPrimary: true,
        },
        {
          title: "PostgreSQL — Transaction isolation",
          url: "https://www.postgresql.org/docs/current/transaction-iso.html",
          kind: "docs",
          whyThisOne:
            "What each level does in Postgres, with the serializable examples.",
        },
        {
          title: "PostgreSQL — Serialization failure handling",
          url: "https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html",
          kind: "docs",
          whyThisOne:
            "The official statement that applications must retry, and which errors are retryable.",
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-sql-department-highest-salary", title: "Department Highest Salary", platform: "leetcode", url: "https://leetcode.com/problems/department-highest-salary/", difficulty: "medium", patternTag: "sql-sets", triggerHint: "The top row per group, as one query.", approachHint: "Join employee to department; keep rows where (department_id, salary) is in the per-department max.", estMinutes: 20, unitSlug: "corecs-dbd-n-plus-one" },
    { slug: "lc-sql-managers-5-reports", title: "Managers with at Least 5 Direct Reports", platform: "leetcode", url: "https://leetcode.com/problems/managers-with-at-least-5-direct-reports/", difficulty: "medium", patternTag: "sql-sets", triggerHint: "Count related rows per parent, without a loop.", approachHint: "GROUP BY managerId HAVING count(*) >= 5, then join back to get the names.", estMinutes: 15, unitSlug: "corecs-dbd-n-plus-one" },
    { slug: "lc-sql-rank-scores", title: "Rank Scores", platform: "leetcode", url: "https://leetcode.com/problems/rank-scores/", difficulty: "medium", patternTag: "sql-window", triggerHint: "Ranks where ties share a rank and there are no gaps.", approachHint: "DENSE_RANK() OVER (ORDER BY score DESC).", estMinutes: 10, unitSlug: "corecs-dbd-window" },
    { slug: "lc-sql-dept-top-three", title: "Department Top Three Salaries", platform: "leetcode", url: "https://leetcode.com/problems/department-top-three-salaries/", difficulty: "hard", patternTag: "sql-window", triggerHint: "Top N distinct values per group.", approachHint: "DENSE_RANK partitioned by department in a CTE; filter r <= 3 outside it.", estMinutes: 25, unitSlug: "corecs-dbd-window" },
    { slug: "lc-sql-consecutive-numbers", title: "Consecutive Numbers", platform: "leetcode", url: "https://leetcode.com/problems/consecutive-numbers/", difficulty: "medium", patternTag: "sql-window", triggerHint: "A value repeated in consecutive rows.", approachHint: "LAG(num, 1) and LAG(num, 2) ordered by id; keep rows where all three match.", estMinutes: 20, unitSlug: "corecs-dbd-window" },
    { slug: "lc-sql-restaurant-growth", title: "Restaurant Growth", platform: "leetcode", url: "https://leetcode.com/problems/restaurant-growth/", difficulty: "medium", patternTag: "sql-window", triggerHint: "A 7-day moving sum and average.", approachHint: "Aggregate per day first, then SUM/AVG OVER (ORDER BY visited_on ROWS BETWEEN 6 PRECEDING AND CURRENT ROW); skip the first 6 days.", estMinutes: 30, unitSlug: "corecs-dbd-window" },
  ],
};
