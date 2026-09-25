import type { Question } from "./types";

/**
 * Phase 2 Core CS checkpoints: databases in depth, and the revision-sheet
 * round — the questions a campus interviewer asks in the first ten minutes.
 * Answer positions are balanced per module.
 */
export const corecsDepthQuestions: Question[] = [
  // --- Databases in depth --------------------------------------------------
  {
    id: "dbd-1",
    moduleSlug: "corecs-db-depth",
    prompt: "In an EXPLAIN ANALYZE plan, an Index Scan shows `actual time=0.02..0.03 rows=1 loops=40000`. What does that mean?",
    options: [
      "The index was scanned once and returned 40,000 rows, one per loop of the parent",
      "The statement was retried 40,000 times after lock timeouts before it succeeded",
      "The node ran 40,000 times, so its real cost is its per-loop time multiplied by 40,000",
      "The planner estimated 40,000 rows but found only one, so its statistics are stale",
    ],
    answer: 2,
    why: "loops counts executions — typically the inner side of a nested loop. Times are per loop, so a cheap-looking node can dominate the query.",
  },
  {
    id: "dbd-2",
    moduleSlug: "corecs-db-depth",
    prompt: "Which index best serves `WHERE owner_id = $1 AND created_at > $2 ORDER BY created_at`?",
    options: [
      "(owner_id, created_at)",
      "(created_at, owner_id)",
      "Two separate indexes, one on owner_id and one on created_at",
      "An index on created_at only, since it is used twice",
    ],
    answer: 0,
    why: "Equality column first, then the range and sort column: the index jumps to one owner and reads its rows already in date order. Reversed, it scans every owner's rows in the range.",
  },
  {
    id: "dbd-3",
    moduleSlug: "corecs-db-depth",
    prompt: "A page lists 100 links and shows each owner's email via a lazy-loaded relationship. How many queries run?",
    options: [
      "1, because the ORM joins related tables automatically",
      "101 — one for the list and one per link for its owner",
      "2 — one for links and one batched query for all owners",
      "100, one per link, with the list itself cached",
    ],
    answer: 1,
    why: "That is N+1. selectinload makes it 2 queries whatever N is; joinedload makes it 1 with a JOIN.",
  },
  {
    id: "dbd-4",
    moduleSlug: "corecs-db-depth",
    prompt: "Why does `SELECT ... WHERE DENSE_RANK() OVER (...) <= 3` fail?",
    options: [
      "DENSE_RANK returns a bigint, which cannot be compared with an integer literal",
      "Window functions require a GROUP BY on the partition columns in the same query",
      "Only ROW_NUMBER is allowed in a filter, because RANK values can repeat",
      "Window functions are computed after WHERE, so rank in a subquery or CTE and filter outside it",
    ],
    answer: 3,
    why: "WHERE filters rows before windows exist. Compute the rank in an inner query, then filter on it in the outer one.",
  },
  {
    id: "dbd-5",
    moduleSlug: "corecs-db-depth",
    prompt: "Two doctors are on call; each transaction checks \"is someone else on call?\" and then takes itself off. Both commit, and nobody is on call. Which Postgres level prevents this?",
    options: [
      "Read Committed, the default",
      "Repeatable Read, because it uses a snapshot",
      "Serializable",
      "Read Uncommitted",
    ],
    answer: 2,
    why: "This is write skew: each transaction writes a different row, so snapshot isolation (Repeatable Read) sees no conflict. Serializable detects it — or lock the rows you check with SELECT … FOR UPDATE.",
  },
  {
    id: "dbd-6",
    moduleSlug: "corecs-db-depth",
    prompt: "Your app runs transactions at Serializable. Under load, some fail with SQLSTATE 40001. What should the app do?",
    options: [
      "Lower the isolation level to Read Committed",
      "Retry the whole transaction, with backoff",
      "Retry only the statement that failed",
      "Show the error to the user and ask them to try again",
    ],
    answer: 1,
    why: "40001 is a serialization failure, and it is expected at this level. The transaction's reads may be stale, so the whole transaction must rerun — the application is required to retry.",
  },

  // --- Revision sheets -----------------------------------------------------
  {
    id: "rev-1",
    moduleSlug: "corecs-revision-sheets",
    prompt: "What does fork() return in the child process?",
    options: [
      "The parent's PID",
      "0",
      "The child's own PID",
      "1, the PID of init",
    ],
    answer: 1,
    why: "The child gets 0 and the parent gets the child's PID (−1 on failure) — which is how the same code knows which process it is running in.",
  },
  {
    id: "rev-2",
    moduleSlug: "corecs-revision-sheets",
    prompt: "A process has exited but its parent has not called wait(). What is it?",
    options: [
      "An orphan process",
      "A daemon process",
      "A stopped process",
      "A zombie process",
    ],
    answer: 3,
    why: "Its entry stays in the process table until the parent reaps it. An orphan is the opposite case — the parent died first, and init adopts it.",
  },
  {
    id: "rev-3",
    moduleSlug: "corecs-revision-sheets",
    prompt: "In what order are these SQL clauses logically evaluated?",
    options: [
      "FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY",
      "SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY",
      "FROM → GROUP BY → WHERE → HAVING → SELECT → ORDER BY",
      "FROM → WHERE → SELECT → GROUP BY → HAVING → ORDER BY",
    ],
    answer: 0,
    why: "Which is why WHERE cannot use aggregates (they come later, in HAVING) and a SELECT alias works in ORDER BY but not in WHERE.",
  },
  {
    id: "rev-4",
    moduleSlug: "corecs-revision-sheets",
    prompt: "A table has composite key (student_id, course_id), and student_name depends only on student_id. Which normal form does it violate?",
    options: [
      "1NF",
      "3NF, but not 2NF",
      "2NF",
      "BCNF only",
    ],
    answer: 2,
    why: "A non-key attribute depending on part of a composite key is a partial dependency — exactly what 2NF forbids. Move student_name to a students table.",
  },
  {
    id: "rev-5",
    moduleSlug: "corecs-revision-sheets",
    prompt: "What are the steps of DHCP, in order?",
    options: [
      "Request, Offer, Discover, Acknowledge",
      "Discover, Request, Offer, Acknowledge",
      "Offer, Discover, Acknowledge, Request",
      "Discover, Offer, Request, Acknowledge",
    ],
    answer: 3,
    why: "DORA: the client broadcasts Discover, servers Offer an address, the client Requests one, and the chosen server Acknowledges.",
  },
  {
    id: "rev-6",
    moduleSlug: "corecs-revision-sheets",
    prompt: "What does TCP congestion control protect, as opposed to flow control?",
    options: [
      "The network — it limits sending to avoid overloading routers and links",
      "The receiver — it stops the sender overflowing its buffer",
      "The sender — it limits memory used for retransmissions",
      "The application — it limits the size of each write",
    ],
    answer: 0,
    why: "Flow control uses the receiver's advertised window to protect the receiver. Congestion control (slow start, congestion avoidance) protects the network in between.",
  },
  {
    id: "rev-7",
    moduleSlug: "corecs-revision-sheets",
    prompt: "Which is run-time polymorphism in C++?",
    options: [
      "Two functions with the same name and different parameters",
      "A function template instantiated for int and double",
      "A derived class overriding a virtual function, called through a base pointer",
      "Operator overloading for a user-defined type",
    ],
    answer: 2,
    why: "Overriding a virtual function is dispatched through the vtable at run time. Overloading, templates and operator overloading are all resolved by the compiler.",
  },
  {
    id: "rev-8",
    moduleSlug: "corecs-revision-sheets",
    prompt: "Class D inherits from B and C, which both inherit from A. How do you make D contain a single A?",
    options: [
      "Make A's constructor private",
      "Have B and C inherit A with virtual inheritance",
      "Declare A's methods pure virtual",
      "Inherit D from A directly as well",
    ],
    answer: 1,
    why: "That is the diamond problem. `class B : virtual public A` (and the same for C) makes B and C share one A subobject inside D.",
  },
];
