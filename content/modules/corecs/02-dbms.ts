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
      primer: `A **relational database** stores data in **tables**: rows are records, columns are fields. A \`students\` table might have columns \`id\`, \`name\`, \`email\`.

Every table needs a way to identify each row uniquely — a **key**. The **primary key** (often \`id\`) is the one you choose. A **foreign key** is a column that holds another table's key, and that is how tables link: \`enrolments.student_id\` points at \`students.id\`.

**Normalisation** means storing each fact exactly once. If a student's email is copied into every enrolment row, changing it means finding every copy — and missing one leaves the data contradicting itself. The normal forms (1NF, 2NF, 3NF) are step-by-step rules for splitting tables so that cannot happen.

An **ER diagram** is the drawing of these tables and how they relate, done before writing any SQL.

**You need already:** nothing — this is where databases begin.`,
      conceptMd: `**Keys**: a *super key* uniquely identifies a row; a *candidate key* is a minimal super key; the *primary key* is the candidate you chose; a *foreign key* references another table's primary key; a *composite key* spans multiple columns.

**Normalisation**, each form fixing one class of anomaly:
- **1NF** — atomic values, no repeating groups.
- **2NF** — 1NF plus no partial dependency on part of a composite key.
- **3NF** — 2NF plus no transitive dependency (a non-key column determining another non-key column).
- **BCNF** — a stricter 3NF where every determinant is a candidate key.

The anomalies are the *reason*: without normalisation, updating a supplier's address means updating many rows (update anomaly), you cannot record a supplier with no products (insert anomaly), and deleting the last product loses the supplier (delete anomaly).

Then the answer that shows judgement: **denormalisation is a legitimate performance decision.** Duplicating a column to avoid a join on a hot read path is fine *if* you know you are trading write complexity for read speed and you say so. Normalise by default, denormalise deliberately.`,
      interviewAngle:
        "Normalising a small schema on the spot is common. The judgement marks come from being " +
        "able to say when you would deliberately *not* normalise.",
      pitfalls: [
        "Reciting the normal forms without the anomalies. The anomalies are the reason the " +
          "forms exist.",
        "Treating denormalisation as a mistake. It is a legitimate trade of write complexity " +
          "for read speed — as long as you say that is what you are doing.",
        "Confusing candidate key with primary key. The primary key is the candidate you " +
          "chose; the others remain candidates.",
      ],
      recall: [
        {
          front: "Name the three anomalies normalisation exists to fix.",
          back:
            "Update: changing one fact means changing many rows. Insert: you cannot record a " +
            "supplier that has no products yet. Delete: removing the last product loses the " +
            "supplier entirely.",
        },
        {
          front: "1NF, 2NF, 3NF — one clause each.",
          back:
            "1NF: atomic values, no repeating groups. 2NF: 1NF plus no partial dependency on " +
            "part of a composite key. 3NF: 2NF plus no transitive dependency, where a non-key " +
            "column determines another non-key column.",
        },
        {
          front: "When is denormalisation the right call, and how do you justify it?",
          back:
            "When a hot read path is dominated by a join you can eliminate by duplicating a " +
            "column. Justify it by naming the trade explicitly: you are buying read speed with " +
            "write complexity and a consistency obligation. Normalise by default, denormalise " +
            "deliberately.",
        },
        {
          front: "Super key, candidate key, primary key — how do they relate?",
          back:
            "A super key identifies a row uniquely. A candidate key is a *minimal* super key. " +
            "The primary key is the candidate key you chose; the rest stay candidates.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Keys in the relational model",
          url: "https://www.geeksforgeeks.org/dbms/types-of-keys-in-relational-model-candidate-super-primary-alternate-and-foreign/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Each kind of key with a small table example — the vocabulary normalisation is built on.",
          steps: [
            "Read each key type and point to it in the example table.",
            "Then read *Normal Forms in DBMS* (next link), working each decomposition on paper.",
            "Normalise a table of your own — say, orders with the customer's details copied into each row — to 3NF.",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — Normal forms in DBMS",
          url: "https://www.geeksforgeeks.org/dbms/normal-forms-in-dbms/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "1NF to BCNF with worked decompositions in the format written tests use.",
        },
        {
          title: "GeeksforGeeks — Introduction of ER model",
          url: "https://www.geeksforgeeks.org/dbms/introduction-of-er-model/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Entities, attributes and relationships, and how to draw them — the diagram before the tables.",
        },
      ],
    },
    {
      slug: "corecs-dbms-sql",
      title: "Joins, grouping & window functions",
      objective:
        "Write every join type and a grouped aggregate correctly, and know when HAVING is required.",
      estMinutes: 90,
      primer: `**SQL** is the language for asking a database questions. The basic shape: \`SELECT columns FROM table WHERE condition\`.

Three ideas carry most interview questions:

- **JOIN** combines rows from two tables that match on a key — say, each order with its customer's name. An *inner* join keeps only matches; a *left* join keeps every row from the left table, with blanks where nothing matched.
- **GROUP BY** collapses rows into groups and computes one value per group with \`COUNT\`, \`SUM\`, \`AVG\`: "orders per customer". \`WHERE\` filters rows *before* grouping; \`HAVING\` filters groups *after*.
- **Window functions** compute across related rows without collapsing them — a rank or running total alongside each row.

SQL is learned by writing it. Aim for about fifty queries typed from scratch.

**You need already:** tables and keys from the last unit.`,
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
      interviewAngle:
        "SQL rounds are written from scratch, not recognised. `Second highest salary per " +
        "department` is the standard window-function question, and the elegant answer gets " +
        "noticed.",
      pitfalls: [
        "Putting an aggregate in WHERE. WHERE filters rows before grouping; aggregates only " +
          "exist after, which is what HAVING is for.",
        "Comparing with `= NULL`. Nothing equals NULL, not even NULL — use `IS NULL`.",
        "Using `NOT IN` against a subquery that can yield NULL. The whole result becomes " +
          "empty, which surprises almost everyone. Use `NOT EXISTS`.",
        "Reaching for `COUNT(col)` when you meant every row. It skips NULLs; `COUNT(*)` does " +
          "not.",
      ],
      recall: [
        {
          front: "WHERE versus HAVING — state the rule.",
          back:
            "WHERE filters rows *before* grouping; HAVING filters groups *after*. So an " +
            "aggregate can appear in HAVING and never in WHERE.",
        },
        {
          front:
            "Why does `NOT IN (SELECT ...)` return nothing when the subquery contains a NULL?",
          back:
            "The comparison becomes `x <> NULL` for that element, which is unknown rather than " +
            "true — so the overall condition can never be true for any row. `NOT EXISTS` does " +
            "not have this problem.",
        },
        {
          front: "Write the window function for `rank salaries within each department`.",
          back:
            "`ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC)` — it ranks " +
            "within groups without a self-join, which is the clean answer to " +
            "nth-highest-per-group questions.",
        },
        {
          front: "`COUNT(*)` versus `COUNT(col)` — what is the difference?",
          back:
            "`COUNT(*)` counts rows. `COUNT(col)` counts rows where that column is not NULL.",
        },
      ],
      resources: [
        {
          title: "PostgreSQL tutorial 2.6 — Joins between tables",
          url: "https://www.postgresql.org/docs/current/tutorial-join.html",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "The official tutorial, on the database you use in atlas, building joins up from a two-table example.",
          steps: [
            "Create the tutorial's `weather` and `cities` tables in your own Postgres and run every query.",
            "Continue to [2.7 Aggregate Functions](https://www.postgresql.org/docs/current/tutorial-agg.html) — GROUP BY and HAVING.",
            "Then [3.5 Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html).",
            "Then solve this unit's SQL problems without looking anything up.",
          ],
          isPrimary: true,
        },
        {
          title: "SQLBolt — Lesson 6: Multi-table queries with JOINs",
          url: "https://sqlbolt.com/lesson/select_queries_with_joins",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "Interactive exercises in the browser — type queries and see the result immediately. Lessons 6 to 12 cover this unit.",
        },
      ],
    },
    {
      slug: "corecs-dbms-indexes",
      title: "Indexes & query plans",
      objective:
        "Explain when a B-tree index helps and when it hurts, and read an EXPLAIN output.",
      estMinutes: 75,
      primer: `Without help, finding one row in a table of a million means reading all million. An **index** is a separate, sorted structure that lets the database jump straight to the rows it needs — like the index at the back of a book.

The standard kind is a **B-tree**: a balanced tree that finds any value in a few steps and also handles ranges ("price between 100 and 200") and sorting.

Indexes are not free. Every insert and update must also update every index, and they take disk space. So you index the columns you search, join and sort on — not everything.

\`EXPLAIN\` shows the plan the database chose for a query: whether it used an index or scanned the whole table. Reading it is how you find out *why* a query is slow instead of guessing.

**You need already:** SELECT and WHERE from the SQL unit.`,
      conceptMd: `A **B-tree index** is a balanced tree giving O(log n) lookup, and it supports range queries and ordered scans — which is why it is the default.

**When indexes help**: WHERE on a selective column, JOIN keys, ORDER BY, and covering queries where the index alone answers the query.

**When they hurt**: every INSERT, UPDATE and DELETE must maintain them; they consume space; and on a low-cardinality column (a boolean, say) the planner will ignore the index and scan anyway, because reading most of the table via random index lookups is slower than a sequential scan.

**Composite indexes obey a leftmost-prefix rule**: an index on \`(a, b, c)\` serves queries filtering on \`a\`, or \`a, b\`, or \`a, b, c\` — but not on \`b\` alone. Column order is a design decision, not an afterthought.

**\`EXPLAIN ANALYZE\`** is the tool. Learn to spot a \`Seq Scan\` on a large table where you expected an \`Index Scan\`, and to compare the planner's estimated rows against the actual — a large discrepancy means stale statistics, and \`ANALYZE\` fixes it.

The classic index-defeating mistake: wrapping the column in a function. \`WHERE LOWER(email) = '...'\` cannot use a plain index on \`email\`; you need an expression index on \`LOWER(email)\`.`,
      interviewAngle:
        "`Why is this query slow?` is the practical question, and reading EXPLAIN out loud — a " +
        "Seq Scan where you expected an Index Scan — is the practical answer.",
      pitfalls: [
        "Wrapping the indexed column in a function. `WHERE LOWER(email) = ...` cannot use a " +
          "plain index on `email`; you need an expression index.",
        "Indexing a low-cardinality column. The planner will scan anyway, because random " +
          "index lookups over most of the table are slower than a sequential scan.",
        "Treating composite-index column order as arbitrary. An index on `(a, b, c)` does not " +
          "serve a query filtering on `b` alone.",
        "Adding indexes without counting the write cost. Every INSERT, UPDATE and DELETE has " +
          "to maintain each one.",
      ],
      recall: [
        {
          front: "State the leftmost-prefix rule for composite indexes.",
          back:
            "An index on `(a, b, c)` serves queries filtering on `a`, on `a, b`, or on `a, b, " +
            "c` — but not on `b` alone or `c` alone. Column order is a design decision.",
        },
        {
          front: "Name two situations where an index makes things worse.",
          back:
            "Write-heavy tables, where every insert, update and delete must maintain the index; " +
            "and low-cardinality columns like a boolean, where the planner correctly ignores it " +
            "because a sequential scan beats scattered random lookups.",
        },
        {
          front: "What is the classic index-defeating mistake?",
          back:
            "Wrapping the column in a function in the predicate — `WHERE LOWER(email) = '...'`. " +
            "The index is on `email`, not on `LOWER(email)`, so it cannot be used. Create an " +
            "expression index or normalise the stored value.",
        },
        {
          front: "Reading `EXPLAIN ANALYZE`, what discrepancy points at stale statistics?",
          back:
            "A large gap between the planner's estimated row count and the actual row count. " +
            "`ANALYZE` refreshes the statistics the planner uses.",
        },
      ],
      resources: [
        {
          title: "Use The Index, Luke — Anatomy of an SQL index",
          url: "https://use-the-index-luke.com/sql/anatomy",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "The best free writing on indexes, starting from what an index physically is.",
          steps: [
            "Read this chapter's pages in order: the leaf nodes, [the B-tree](https://use-the-index-luke.com/sql/anatomy/the-tree), and slow indexes.",
            "Then read [Concatenated keys](https://use-the-index-luke.com/sql/where-clause/the-equals-operator/concatenated-keys) — why column order matters.",
            "Run `EXPLAIN` on a query of yours before and after adding an index (next link).",
          ],
          isPrimary: true,
        },
        {
          title: "PostgreSQL — Using EXPLAIN",
          url: "https://www.postgresql.org/docs/current/using-explain.html",
          kind: "docs",
          whyThisOne:
            "How to read a query plan. Run it against your own atlas queries.",
        },
      ],
    },
    {
      slug: "corecs-dbms-transactions",
      title: "Transactions, ACID & isolation levels",
      objective:
        "Name the anomaly each isolation level prevents, and explain what a deadlock looks like in a database.",
      estMinutes: 75,
      primer: `A **transaction** groups several changes so they happen **all together or not at all**. Moving money between accounts is two updates — take from one, add to the other — and the database must never stop halfway.

The guarantees a transaction gives are called **ACID**: *Atomicity* (all or nothing), *Consistency* (the rules you set still hold afterwards), *Isolation* (transactions running at the same time do not see each other's half-finished work), *Durability* (once it says committed, it survives a crash).

Isolation has levels, because perfect isolation is slow. Weaker levels allow specific **anomalies** — reading uncommitted data, a value changing between two reads, new rows appearing — and each level is defined by which of those it prevents.

**You need already:** SQL basics.`,
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

That table is the SQL standard's *minimum*, and it is the answer to draw — but say "per the standard", because Postgres is stricter. Its Repeatable Read is snapshot isolation: the whole transaction reads one snapshot, so phantoms cannot appear either. What it still allows is **write skew** — two transactions each read, each write something the other read, and both commit — which only Serializable prevents. (And Postgres's Read Uncommitted behaves as Read Committed.)

Higher isolation costs concurrency — that is the trade-off, and naming it is the point. Postgres defaults to Read Committed.

**Database deadlocks** happen when two transactions lock rows in opposite orders. The database detects the cycle and aborts one with a **deadlock error** (Postgres SQLSTATE \`40P01\`). It is a different error from a **serialization failure** (\`40001\`), which Repeatable Read and Serializable raise when concurrent transactions conflict — but the response to both is the same. Your application must be prepared to **retry** — which is the same reliability thinking as the retry-with-backoff pattern in the SRE track.`,
      interviewAngle:
        "The isolation-level table is the answer, and being able to draw it beats describing " +
        "it. The deadlock-retry point connects it to real production work.",
      pitfalls: [
        "Confusing non-repeatable read with phantom read. One is the same *row* changing " +
          "value; the other is the same *query* returning different *rows*.",
        "Assuming Serializable is free. Higher isolation costs concurrency — naming that " +
          "trade is the point of the question.",
        "Not retrying on a deadlock (`40P01`) or a serialization failure (`40001`). Either way " +
          "the database aborted your transaction on purpose and expects the application to run " +
          "it again.",
        "Drawing the standard's table and calling it Postgres. Postgres's Repeatable Read is " +
          "a snapshot and already prevents phantoms; the anomaly left for Serializable is " +
          "write skew.",
      ],
      recall: [
        {
          front: "Define the three read anomalies, in increasing subtlety.",
          back:
            "Dirty read: you see another transaction's uncommitted data. Non-repeatable read: " +
            "you read the same row twice and get different values, because someone committed an " +
            "update between. Phantom read: you run the same query twice and get different rows, " +
            "because someone inserted matching ones.",
        },
        {
          front: "Which anomaly does Read Committed still allow?",
          back:
            "Both non-repeatable reads and phantom reads. It only prevents dirty reads — and it " +
            "is Postgres's default.",
        },
        {
          front: "Which anomaly survives Repeatable Read?",
          back:
            "Per the SQL standard, phantom reads: the rows you read are stable, but new matching " +
            "rows can appear. Postgres goes further — its Repeatable Read is a snapshot, so no " +
            "phantoms either; what survives is write skew, which only Serializable stops.",
        },
        {
          front: "A database deadlock — what causes it and whose job is the fix?",
          back:
            "Two transactions locking rows in opposite orders. The database detects the cycle " +
            "and aborts one with a deadlock error (Postgres `40P01`); the application is " +
            "responsible for catching that and retrying.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — ACID properties in DBMS",
          url: "https://www.geeksforgeeks.org/dbms/acid-properties-in-dbms/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Each property with a bank-transfer example of what goes wrong without it.",
          steps: [
            "Read the four properties, writing one failure example for each in your own words.",
            "Then read *Transaction Isolation Levels* (next link) and make a table: level → anomalies it prevents.",
            "Check your table against the PostgreSQL page (last link) — Postgres differs from the textbook in one place.",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — Transaction isolation levels",
          url: "https://www.geeksforgeeks.org/dbms/transaction-isolation-levels-dbms/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Dirty reads, non-repeatable reads and phantoms, and which level prevents which.",
        },
        {
          title: "PostgreSQL — Transaction isolation",
          url: "https://www.postgresql.org/docs/current/transaction-iso.html",
          kind: "docs",
          whyThisOne:
            "What each level does in a real engine. Its table is the authority when a textbook disagrees.",
        },
      ],
    },
  ],
};
