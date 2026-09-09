import type { Module } from "@/content/types";

export const dbms: Module = {
  slug: "corecs-dbms",
  trackSlug: "corecs",
  phaseSlug: "foundations",
  order: 2,
  title: "DBMS & SQL",
  summary:
    "SQL rounds reward practice rather than theory: the queries are not hard, but they have to be written from scratch rather than recognised. Roughly fifty hand-written queries is where the syntax stops needing thought.",
  units: [
    {
      slug: "corecs-dbms-modelling",
      title: "ER modelling, keys & normalisation",
      objective:
        "Normalise a schema to 3NF and justify a deliberate denormalisation.",
      estMinutes: 75,
      conceptMd: `**Keys**: a *super key* uniquely identifies a row; a *candidate key* is a minimal super key; the *primary key* is the candidate you chose; a *foreign key* references another table's primary key; a *composite key* spans multiple columns.

**Normalisation**, each form fixing one class of anomaly:
- **1NF** — atomic values, no repeating groups.
- **2NF** — 1NF plus no partial dependency on part of a composite key.
- **3NF** — 2NF plus no transitive dependency (a non-key column determining another non-key column).
- **BCNF** — a stricter 3NF where every determinant is a candidate key.

The anomalies are the *reason*: without normalisation, updating a supplier's address means updating many rows (update anomaly), you cannot record a supplier with no products (insert anomaly), and deleting the last product loses the supplier (delete anomaly).

Then the answer that shows judgement: **denormalisation is a legitimate performance decision.** Duplicating a column to avoid a join on a hot read path is fine *if* you know you are trading write complexity for read speed and you say so. Normalise by default, denormalise deliberately.`,
      resources: [
        {
          title: "GeeksforGeeks — normalisation with examples",
          url: "https://www.geeksforgeeks.org/normal-forms-in-dbms/",
          kind: "read",
          minutes: 40,
          whyThisOne: "Worked decompositions in the format written tests use.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "corecs-dbms-sql",
      title: "Joins, grouping & window functions",
      objective:
        "Write every join type and a grouped aggregate correctly, and know when HAVING is required.",
      estMinutes: 90,
      conceptMd: `**Joins**: INNER (matches only), LEFT (all left rows, NULLs where unmatched), RIGHT, FULL OUTER, CROSS (cartesian), SELF (a table joined to itself, for hierarchies like employee → manager).

**WHERE filters rows before grouping; HAVING filters groups after.** The distinction is asked constantly, and the answer is mechanical:

\`\`\`sql
SELECT department, COUNT(*) AS n, AVG(salary) AS avg_salary
FROM employees
WHERE active = true          -- before grouping
GROUP BY department
HAVING COUNT(*) > 5          -- after grouping
ORDER BY avg_salary DESC;
\`\`\`

**NULL handling** is where interview queries hide their trap: \`NULL = NULL\` is not true, you need \`IS NULL\`; \`COUNT(*)\` counts rows but \`COUNT(col)\` skips NULLs; and \`NOT IN\` with a NULL in the subquery returns no rows at all, which surprises almost everyone.

**Window functions** are worth two hours for a large payoff. \`ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)\` ranks within groups without a self-join — that is the standard "second highest salary per department" question, and the elegant answer is noticed.`,
      resources: [
        {
          title: "PostgreSQL tutorial — joins, grouping, window functions",
          url: "https://www.postgresql.org/docs/current/tutorial-window.html",
          kind: "docs",
          minutes: 45,
          whyThisOne: "Official docs on the real database you are using in atlas, so the practice transfers directly.",
          isPrimary: true,
        },
        {
          title: "LeetCode — SQL 50",
          url: "https://leetcode.com/studyplan/top-sql-50/",
          kind: "do",
          minutes: 90,
          whyThisOne: "This is where the fifty hand-written queries come from. Work it, do not read it.",
        },
      ],
    },
    {
      slug: "corecs-dbms-indexes",
      title: "Indexes & query plans",
      objective:
        "Explain when a B-tree index helps and when it hurts, and read an EXPLAIN output.",
      estMinutes: 75,
      conceptMd: `A **B-tree index** is a balanced tree giving O(log n) lookup, and it supports range queries and ordered scans — which is why it is the default.

**When indexes help**: WHERE on a selective column, JOIN keys, ORDER BY, and covering queries where the index alone answers the query.

**When they hurt**: every INSERT, UPDATE and DELETE must maintain them; they consume space; and on a low-cardinality column (a boolean, say) the planner will ignore the index and scan anyway, because reading most of the table via random index lookups is slower than a sequential scan.

**Composite indexes obey a leftmost-prefix rule**: an index on \`(a, b, c)\` serves queries filtering on \`a\`, or \`a, b\`, or \`a, b, c\` — but not on \`b\` alone. Column order is a design decision, not an afterthought.

**\`EXPLAIN ANALYZE\`** is the tool. Learn to spot a \`Seq Scan\` on a large table where you expected an \`Index Scan\`, and to compare the planner's estimated rows against the actual — a large discrepancy means stale statistics, and \`ANALYZE\` fixes it.

The classic index-defeating mistake: wrapping the column in a function. \`WHERE LOWER(email) = '...'\` cannot use a plain index on \`email\`; you need an expression index on \`LOWER(email)\`.`,
      resources: [
        {
          title: "Use The Index, Luke",
          url: "https://use-the-index-luke.com/",
          kind: "read",
          minutes: 60,
          whyThisOne: "The best free writing on indexing anywhere. The leftmost-prefix chapter alone earns the time.",
          isPrimary: true,
        },
        {
          title: "PostgreSQL — using EXPLAIN",
          url: "https://www.postgresql.org/docs/current/using-explain.html",
          kind: "docs",
          minutes: 30,
          whyThisOne: "Run it against your own atlas queries and the abstract advice becomes concrete.",
        },
      ],
    },
    {
      slug: "corecs-dbms-transactions",
      title: "Transactions, ACID & isolation levels",
      objective:
        "Name the anomaly each isolation level prevents, and explain what a deadlock looks like in a database.",
      estMinutes: 75,
      conceptMd: `**ACID**: **Atomicity** (all or nothing), **Consistency** (constraints hold before and after), **Isolation** (concurrent transactions do not corrupt each other), **Durability** (committed means survives a crash — implemented by the write-ahead log).

The three anomalies, in increasing subtlety:
- **Dirty read** — reading another transaction's uncommitted data.
- **Non-repeatable read** — reading the same *row* twice and getting different values, because another transaction committed an update between your reads.
- **Phantom read** — running the same *query* twice and getting different *rows*, because another transaction inserted matching ones.

The levels map onto them exactly, and this table is the interview answer:

| Level | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| Read Uncommitted | possible | possible | possible |
| Read Committed | prevented | possible | possible |
| Repeatable Read | prevented | prevented | possible |
| Serializable | prevented | prevented | prevented |

Higher isolation costs concurrency — that is the trade-off, and naming it is the point. Postgres defaults to Read Committed.

**Database deadlocks** happen when two transactions lock rows in opposite orders. The database detects the cycle and aborts one with a serialization failure. Your application must be prepared to **retry** — which is the same reliability thinking as the retry-with-backoff pattern in the SRE track.`,
      resources: [
        {
          title: "PostgreSQL — transaction isolation",
          url: "https://www.postgresql.org/docs/current/transaction-iso.html",
          kind: "docs",
          minutes: 35,
          whyThisOne: "Precise about which anomalies each level actually prevents in a real engine, not just in theory.",
          isPrimary: true,
        },
      ],
    },
  ],
};
