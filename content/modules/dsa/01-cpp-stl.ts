import type { Module } from "@/content/types";

export const cppStl: Module = {
  slug: "dsa-cpp-stl",
  trackSlug: "dsa",
  phaseSlug: "foundations",
  order: 1,
  title: "C++ & STL for interviews",
  summary:
    "The tools you will use for every one of the next ~230 problems. Fluency here is not optional — fumbling a map lookup in round 2 reads as inexperience.",
  units: [
    {
      slug: "dsa-cpp-stl-toolchain",
      title: "Toolchain & fast I/O",
      objective:
        "Compile and run C++ from your own terminal with warnings on, and know why competitive I/O is written the way it is.",
      estMinutes: 45,
      conceptMd: `Set up **g++** with the flags you will actually keep:

\`\`\`bash
g++ -std=c++17 -O2 -Wall -Wextra -o sol sol.cpp && ./sol < in.txt
\`\`\`

\`-Wall -Wextra\` is free bug-finding — an unused variable is usually a line you meant to use. While you are still learning, add \`-fsanitize=address,undefined\` for local runs: it turns a silent out-of-bounds write into a message naming the exact line. Drop it when you submit, because it is slow.

**Fast I/O.** \`cin\`/\`cout\` are synchronised with C's \`stdio\` so the two can be mixed freely. You are not mixing them, so untie them:

\`\`\`cpp
ios_base::sync_with_stdio(false);
cin.tie(nullptr);
\`\`\`

That is worth roughly an order of magnitude on large inputs. Know *why* — "it stops flushing cout before every cin read" is the follow-up answer. Never use it alongside \`scanf\`/\`printf\` in the same program.

**Overflow is the bug that costs whole problems.** \`int\` tops out near 2.1·10⁹:

\`\`\`cpp
int a = 100000, b = 100000;
long long bad  = a * b;              // overflows first, then widens: 1410065408
long long good = 1LL * a * b;        // widen first: 10000000000
\`\`\`

The rule: the moment a product, sum, or prefix sum can pass ~2·10⁹, make one operand \`long long\`. Constraints like *n ≤ 10⁵, a[i] ≤ 10⁹* are the tell — their product does not fit.

**Integer division truncates toward zero**, so \`-7 / 2 == -3\` and \`-7 % 2 == -1\`. For a ceiling on non-negative numbers use \`(a + b - 1) / b\`, not \`ceil(a / b)\` — the division has already truncated before \`ceil\` ever sees it.`,
      resources: [
        {
          title: "Striver A2Z — Step 1: Learn the basics",
          url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2",
          kind: "do",
          minutes: 40,
          whyThisOne:
            "Your one sheet, followed in order. Everything else in this app hangs off its sequence.",
          isPrimary: true,
        },
        {
          title: "cppreference — Standard library headers",
          url: "https://en.cppreference.com/w/cpp/header",
          kind: "docs",
          whyThisOne:
            "The reference to build the habit on. Slower than a tutorial at first, correct forever after.",
        },
      ],
    },
    {
      slug: "dsa-cpp-stl-vector-string",
      title: "vector & string fluency",
      objective:
        "Use vector and string without thinking, and explain why push_back is amortised O(1).",
      estMinutes: 60,
      conceptMd: `\`vector\` doubles its capacity when it fills. Copying n elements every doubling averages to a **constant** per push — that is amortised analysis, and "why is push_back O(1)?" is a standard interview probe. The answer they want: *n pushes cost n + n/2 + n/4 + … < 2n copies total, so O(1) each on average, with one O(n) spike at each reallocation.*

| | does what | when |
|---|---|---|
| \`size()\` | elements present | always |
| \`capacity()\` | slots allocated | ≥ size |
| \`resize(n)\` | changes size, value-initialises | you want n real elements |
| \`reserve(n)\` | changes capacity only | you know the count up front |

Calling \`reserve\` before a known number of pushes removes every reallocation. It does **not** change \`size()\`, so \`v.reserve(10); v[0] = 1;\` is undefined behaviour — reserve gives you room, not elements.

**Reallocation invalidates everything.** Pointers, references and iterators into a vector are dead after a push that grows it:

\`\`\`cpp
int &first = v[0];
v.push_back(9);      // may reallocate
first = 5;           // undefined behaviour
\`\`\`

**The copy that hides in a loop:** \`for (auto x : v)\` copies every element. Write \`for (auto &x : v)\` to mutate, \`for (const auto &x : v)\` to read. On a \`vector<string>\` that is a real cost, not a style note.

**2D vectors** are built by nesting the fill constructor — \`vector<vector<int>> g(rows, vector<int>(cols, 0));\`. Read it inside out: the inner vector is the row that gets copied \`rows\` times.

**string** is a vector of \`char\` with extra methods. \`s.substr(i, len)\` takes a *length*, not an end index, and \`s.find(t)\` returns \`string::npos\` — not \`-1\` — when it fails. Compare against \`string::npos\` explicitly. Building a string with \`+=\` in a loop is fine; building it with \`s = s + c\` is quadratic.`,
      resources: [
        {
          title: "Striver A2Z — C++ STL playlist",
          url: "https://takeuforward.org/c/c-stl-tutorial-most-frequent-used-stl-containers/",
          kind: "watch",
          minutes: 55,
          whyThisOne: "One pass over every container you will actually use, in the sheet's own order.",
          isPrimary: true,
        },
        {
          title: "cppreference — std::vector",
          url: "https://en.cppreference.com/w/cpp/container/vector",
          kind: "docs",
          whyThisOne: "Read the complexity column. That column is what gets asked about.",
        },
      ],
    },
    {
      slug: "dsa-cpp-stl-complexity",
      title: "Complexity, derived not recited",
      objective:
        "Derive time and space complexity from your own code, including amortised and log-factor cases.",
      estMinutes: 60,
      conceptMd: `Anyone can recite "binary search is O(log n)". The skill being tested is **deriving** it from a loop you just wrote, under pressure.

**Method.** Count how many times the innermost statement runs as a function of n, drop constants and lower-order terms. For recursion, write the recurrence and expand it two levels until the pattern shows.

\`\`\`cpp
for (int i = 0; i < n; i++)          // n times
  for (int j = i + 1; j < n; j++)    // n-1, n-2, ... 1
    check(i, j);                     // total n(n-1)/2  ->  O(n^2)
\`\`\`

The giveaway that a loop is logarithmic is a variable that is *multiplied or divided* rather than incremented: \`for (int i = 1; i < n; i *= 2)\` runs log₂n times.

| shape | complexity | typical n at 1s |
|---|---|---|
| nested loops over pairs | O(n²) | ~10⁴ |
| sort, or a loop with a log inside | O(n log n) | ~10⁶ |
| single pass, hash lookups | O(n) | ~10⁷ |
| halving the search space | O(log n) | any |

Read the constraints backwards: *n ≤ 10⁵* rules out O(n²) and points at O(n log n). That inference is worth saying out loud before you start coding.

**Space counts the recursion stack.** A recursion of depth n costs O(n) space even with no allocations — which is why the iterative version of a linked-list reversal is O(1) and the recursive one is O(n).

**Amortised is not average.** Amortised means *worst case, spread across a sequence of operations* — \`push_back\` is genuinely O(1) amortised. Average means *over a distribution of inputs* — \`unordered_map\` lookup is O(1) average but O(n) worst case, because every key can collide into one bucket. Interviewers do probe that difference, and the honest answer to "is unordered_map O(1)?" is "on average, yes; adversarial keys make it O(n)".`,
      resources: [
        {
          title: "Striver — Time and space complexity",
          url: "https://takeuforward.org/data-structure/time-and-space-complexity-of-an-algorithm/",
          kind: "read",
          minutes: 25,
          whyThisOne: "Short, derivation-first, and matched to the sheet you are solving.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-cpp-stl-containers",
      title: "Ordered vs unordered containers",
      objective:
        "Choose between map/unordered_map and set/multiset for a stated reason, not by habit.",
      estMinutes: 60,
      conceptMd: `\`map\` and \`set\` are balanced binary search trees: **ordered**, O(log n), and they support \`lower_bound\`. \`unordered_map\` and \`unordered_set\` are hash tables: O(1) average, no order, no \`lower_bound\`.

| | order | lookup | has lower_bound |
|---|---|---|---|
| \`map\` / \`set\` | sorted by key | O(log n) | yes |
| \`unordered_map\` / \`unordered_set\` | none | O(1) average, O(n) worst | no |
| \`multiset\` | sorted, keeps duplicates | O(log n) | yes |

**The decision rule.** If you ever need "the smallest key ≥ x", or you need to iterate in sorted order, take the ordered one. Otherwise take the hash. Say the reason out loud in an interview — choosing \`map\` by habit when order is never used is a small tell.

**The bug that catches everyone:** \`operator[]\` on a map *inserts* a default-constructed value when the key is missing.

\`\`\`cpp
if (freq[c] > 0) { }        // INSERTS c with value 0
if (freq.count(c)) { }      // asks without inserting
auto it = freq.find(c);     // asks, and keeps the position
\`\`\`

That silent insert turns "count the distinct characters" into a wrong answer. Use \`count\` or \`find\` to *ask*, and \`[]\` only when inserting-if-absent is what you want — which is exactly why \`freq[c]++\` is the right idiom for building a frequency map.

**\`multiset\` keeps duplicates** and is the quiet answer to a surprising number of sliding-window problems, because it gives you a running min and max in O(log n). Note that \`ms.erase(value)\` removes *every* copy — to remove one, erase an iterator:

\`\`\`cpp
ms.erase(ms.find(value));   // removes exactly one
\`\`\`

**When the key is not a built-in type**, \`unordered_map\` needs a hash and has none for \`pair\` — either write one, or use \`map<pair<int,int>, T>\`, which only needs \`<\` and already has it.`,
      resources: [
        {
          title: "Striver A2Z — Step 1.3: hashing",
          url: "https://takeuforward.org/data-structure/hashing-maps-time-complexity-collisions-division-rule-of-hashing-strivers-a2z-dsa-course/",
          kind: "read",
          minutes: 30,
          whyThisOne: "Covers collisions and the division rule, which is where the follow-up questions go.",
          isPrimary: true,
        },
        {
          title: "cppreference — Containers library",
          url: "https://en.cppreference.com/w/cpp/container",
          kind: "docs",
          whyThisOne: "The comparison table settles ordered-vs-unordered arguments in ten seconds.",
        },
      ],
    },
    {
      slug: "dsa-cpp-stl-sort-search",
      title: "sort, comparators & binary-search helpers",
      objective:
        "Sort by any rule you can state, and use lower_bound / upper_bound correctly on the first attempt.",
      estMinutes: 60,
      conceptMd: `\`sort(v.begin(), v.end(), cmp)\` where \`cmp(a, b)\` returns **true if a must come before b**.

\`\`\`cpp
// by second descending, then first ascending
sort(v.begin(), v.end(), [](const auto &a, const auto &b) {
  if (a.second != b.second) return a.second > b.second;
  return a.first < b.first;
});
\`\`\`

It must be a **strict weak ordering**: \`cmp(a, a)\` has to be false. Writing \`>=\` instead of \`>\` is undefined behaviour and really does segfault, because the implementation runs off the end of the range looking for a pivot that never satisfies the comparison. If you need equal elements to keep their original relative order, that is \`stable_sort\`, not a cleverer comparator.

**lower_bound / upper_bound**, on a *sorted* range:

\`\`\`cpp
vector<int> v = {1, 2, 2, 2, 5};
lower_bound(v.begin(), v.end(), 2);   // -> index 1, first NOT LESS than 2
upper_bound(v.begin(), v.end(), 2);   // -> index 4, first GREATER than 2
\`\`\`

The gap between them is the run of 2s, so \`upper_bound(..) - lower_bound(..)\` counts occurrences in O(log n) — and \`equal_range\` returns both at once. When the value is absent, \`lower_bound\` returns the position where it *would* be inserted, which is precisely the answer to "search insert position".

**They are O(log n) only on random-access iterators.** On a \`set\`, the free function \`std::lower_bound\` degrades to O(n) because it has to walk; use the member \`s.lower_bound(x)\`, which uses the tree.

Also worth having in hand: \`next_permutation\`, \`accumulate\` (pass \`0LL\` as the init value or the sum overflows at \`int\`), \`__gcd\`, \`max_element\`, and the erase-remove idiom \`v.erase(remove(v.begin(), v.end(), x), v.end())\` — \`remove\` alone only shuffles elements and returns the new logical end, it never shortens the vector.`,
      resources: [
        {
          title: "Striver — sorting and comparators in STL",
          url: "https://takeuforward.org/c/c-stl-tutorial-most-frequent-used-stl-containers/",
          kind: "watch",
          minutes: 30,
          whyThisOne: "The comparator section is the part people get wrong under time pressure.",
          isPrimary: true,
        },
        {
          title: "cppreference — std::lower_bound",
          url: "https://en.cppreference.com/w/cpp/algorithm/lower_bound",
          kind: "docs",
          whyThisOne: "The off-by-one between lower and upper bound is worth reading once, precisely.",
        },
      ],
    },
    {
      slug: "dsa-cpp-stl-recursion-basics",
      title: "Recursion primitives",
      objective:
        "Write base case and recursive step without hesitating, and trace a recursion tree on paper.",
      estMinutes: 60,
      conceptMd: `Every recursive function is two questions: **what is the smallest case I can answer outright**, and **how do I reduce toward it**. Write the base case first, always — a missing base case is not a wrong answer, it is a stack overflow.

\`\`\`cpp
int sumTo(int n) {
  if (n == 0) return 0;        // base: answered outright
  return n + sumTo(n - 1);     // step: strictly smaller argument
}
\`\`\`

Check the step really does shrink. \`sumTo(n - 1)\` terminates; \`sumTo(n / 2)\` on \`n = 1\` does not, because \`1 / 2 == 0\` only if your base case covers 0.

**Drill the primitives** until they are automatic: sum to n, factorial, reverse an array in place, check a palindrome, print 1..n without a loop. Each is five lines, and having them cold means the recursion is never the hard part of a harder problem.

**Then draw the tree for \`fib(5)\`:**

\`\`\`text
                fib(5)
          fib(4)      fib(3)
      fib(3)  fib(2)  fib(2) fib(1)
  fib(2) fib(1)
\`\`\`

\`fib(3)\` is computed twice, \`fib(2)\` three times. That repetition is the entire motivation for memoisation — and the reason the naive version is O(2ⁿ) while the memoised one is O(n). You want this picture in your head before you reach dynamic programming, because every DP problem is this observation applied to a bigger tree.

**Depth is space.** Each call holds a frame, so a recursion of depth n costs O(n) stack. The default stack is around 1 MB — roughly 10⁴–10⁵ frames — so a recursion over n = 10⁶ will crash where the equivalent loop is fine. That trade, not elegance, is why some solutions are written iteratively.`,
      resources: [
        {
          title: "Striver A2Z — Step 1.4: basic recursion",
          url: "https://takeuforward.org/recursion/introduction-to-recursion-understand-recursion-by-print-something-n-times/",
          kind: "do",
          minutes: 45,
          whyThisOne: "Builds the pick/not-pick template you will reuse for the rest of the sheet.",
          isPrimary: true,
        },
        {
          title: "NeetCode — Recursion explained",
          url: "https://neetcode.io/courses/dsa-for-beginners/8",
          kind: "watch",
          minutes: 20,
          whyThisOne: "Your designated second explanation, for when Striver's framing does not land.",
        },
      ],
    },
  ],
  problems: [
    {
      slug: "lc-two-sum",
      title: "Two Sum",
      platform: "leetcode",
      url: "https://leetcode.com/problems/two-sum/",
      difficulty: "easy",
      patternTag: "hashing",
      triggerHint: "You need to find a partner value for each element in one pass.",
      approachHint:
        "Walk the array once, keeping value → index in a hash map. At each x, look up target − x before inserting x.",
      estMinutes: 15,
      unitSlug: "dsa-cpp-stl-containers",
    },
    {
      slug: "lc-contains-duplicate",
      title: "Contains Duplicate",
      platform: "leetcode",
      url: "https://leetcode.com/problems/contains-duplicate/",
      difficulty: "easy",
      patternTag: "hashing",
      triggerHint: "A membership question with no ordering requirement.",
      approachHint: "Insert into an unordered_set; the first insert that fails is your answer.",
      estMinutes: 10,
      unitSlug: "dsa-cpp-stl-containers",
    },
    {
      slug: "lc-valid-anagram",
      title: "Valid Anagram",
      platform: "leetcode",
      url: "https://leetcode.com/problems/valid-anagram/",
      difficulty: "easy",
      patternTag: "frequency-map",
      triggerHint: "Two strings, same multiset of characters.",
      approachHint:
        "A 26-length int array beats a hash map here. Increment for s, decrement for t, then assert all zeros.",
      estMinutes: 15,
      unitSlug: "dsa-cpp-stl-containers",
    },
    {
      slug: "lc-majority-element",
      title: "Majority Element",
      platform: "leetcode",
      url: "https://leetcode.com/problems/majority-element/",
      difficulty: "easy",
      patternTag: "frequency-map",
      triggerHint: "An element appearing more than n/2 times.",
      approachHint:
        "Frequency map is the O(n) space answer. Then do it again with Boyer–Moore voting for O(1) space — that second version is the one they want.",
      estMinutes: 20,
      unitSlug: "dsa-cpp-stl-containers",
    },
    {
      slug: "lc-first-unique-char",
      title: "First Unique Character in a String",
      platform: "leetcode",
      url: "https://leetcode.com/problems/first-unique-character-in-a-string/",
      difficulty: "easy",
      patternTag: "frequency-map",
      triggerHint: "Counting, then a second pass to find the first of something.",
      approachHint: "Two passes over a 26-length count array — count first, then scan for the first count of 1.",
      estMinutes: 15,
      unitSlug: "dsa-cpp-stl-containers",
    },
    {
      slug: "lc-sort-array-by-parity",
      title: "Sort Array By Parity",
      platform: "leetcode",
      url: "https://leetcode.com/problems/sort-array-by-parity/",
      difficulty: "easy",
      patternTag: "custom-comparator",
      triggerHint: "Reordering by a rule you can state as a comparison.",
      approachHint:
        "Solve it once with a comparator passed to sort, then again with two pointers in O(n) and no sort at all.",
      estMinutes: 15,
      unitSlug: "dsa-cpp-stl-sort-search",
    },
    {
      slug: "lc-kth-largest-in-array",
      title: "Kth Largest Element in an Array",
      platform: "leetcode",
      url: "https://leetcode.com/problems/kth-largest-element-in-an-array/",
      difficulty: "medium",
      patternTag: "sorting",
      triggerHint: "You need order statistics, not the full sorted order.",
      approachHint:
        "Sort is the throwaway answer. Reach for a size-k min-heap (priority_queue with greater<int>) — O(n log k).",
      estMinutes: 25,
      unitSlug: "dsa-cpp-stl-sort-search",
    },
    {
      slug: "lc-search-insert-position",
      title: "Search Insert Position",
      platform: "leetcode",
      url: "https://leetcode.com/problems/search-insert-position/",
      difficulty: "easy",
      patternTag: "binary-search",
      triggerHint: "A sorted array and a question about where something belongs.",
      approachHint: "This is lower_bound. Write it by hand once, then confirm against std::lower_bound.",
      estMinutes: 15,
      unitSlug: "dsa-cpp-stl-sort-search",
    },
    {
      slug: "lc-fibonacci-number",
      title: "Fibonacci Number",
      platform: "leetcode",
      url: "https://leetcode.com/problems/fibonacci-number/",
      difficulty: "easy",
      patternTag: "recursion",
      triggerHint: "A definition that refers to itself.",
      approachHint:
        "Write the naive recursion and draw its tree. Then memoise. That ladder is the one you will climb for every DP problem later.",
      estMinutes: 15,
      unitSlug: "dsa-cpp-stl-recursion-basics",
    },
    {
      slug: "lc-reverse-string",
      title: "Reverse String",
      platform: "leetcode",
      url: "https://leetcode.com/problems/reverse-string/",
      difficulty: "easy",
      patternTag: "recursion",
      triggerHint: "In-place transformation reducible to a smaller version of itself.",
      approachHint: "Swap ends and recurse inward; base case is left >= right. Then rewrite it iteratively.",
      estMinutes: 10,
      unitSlug: "dsa-cpp-stl-recursion-basics",
    },
    {
      slug: "lc-power-of-two",
      title: "Power of Two",
      platform: "leetcode",
      url: "https://leetcode.com/problems/power-of-two/",
      difficulty: "easy",
      patternTag: "bit-manipulation",
      triggerHint: "A question about a number's binary shape.",
      approachHint: "A power of two has exactly one set bit, so n > 0 && (n & (n - 1)) == 0.",
      estMinutes: 10,
      unitSlug: "dsa-cpp-stl-recursion-basics",
    },
    {
      slug: "lc-count-primes",
      title: "Count Primes",
      platform: "leetcode",
      url: "https://leetcode.com/problems/count-primes/",
      difficulty: "medium",
      patternTag: "number-theory",
      triggerHint: "Counting primes below a large n — trial division will time out.",
      approachHint:
        "Sieve of Eratosthenes. Start crossing off at i*i, and only iterate i while i*i < n.",
      estMinutes: 25,
      unitSlug: "dsa-cpp-stl-toolchain",
    },
  ],
};
