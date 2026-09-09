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
      conceptMd: `Set up **g++** with the flags you will actually keep: \`-std=c++17 -O2 -Wall -Wextra\`. Warnings are free bug-finding; leave them on.

\`cin\`/\`cout\` are synchronised with C's \`stdio\` by default. \`ios_base::sync_with_stdio(false); cin.tie(nullptr);\` unties them and is worth roughly an order of magnitude on large inputs. Know *why* you are typing it — that is a real interview follow-up.

Two traps that cost people whole problems: **integer overflow** (use \`long long\` the moment a product can exceed ~2·10⁹) and **integer division** truncating toward zero.`,
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
      conceptMd: `\`vector\` doubles its capacity when it fills. Copying n elements every doubling averages to a **constant** per push — that is amortised analysis, and "why is push_back O(1)?" is a standard interview probe.

Learn the difference between \`size()\` and \`capacity()\`, \`resize()\` and \`reserve()\`.

The single most-missed C++ tell in interviews: **\`for (auto x : v)\` copies every element.** Write \`for (auto &x : v)\` to mutate, \`for (const auto &x : v)\` to read. Interviewers notice.`,
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

Method: count how many times the innermost statement runs as a function of n, then drop constants and lower-order terms. For recursion, write the recurrence and expand it two levels.

Know the constant-factor reality too — a \`map\` (red-black tree, O(log n)) versus an \`unordered_map\` (hash, O(1) average) is a real decision, and hash collisions make the worst case O(n).`,
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

The decision rule: if you ever need "the smallest key ≥ x", or you need to iterate in sorted order, you need the ordered one. Otherwise take the hash.

\`multiset\` keeps duplicates and is the quiet answer to a surprising number of sliding-window problems. Note \`erase(value)\` removes *every* copy — erase the iterator instead.`,
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
      conceptMd: `\`sort(v.begin(), v.end(), cmp)\` where \`cmp(a,b)\` returns **true if a must come before b**. It must be a strict weak ordering — returning \`true\` for equal elements is undefined behaviour and does crash in practice.

\`lower_bound\` gives the first element **not less than** x; \`upper_bound\` the first **greater than** x. The gap between them is the run of x's, which counts occurrences in O(log n).

Also worth having in hand: \`next_permutation\`, \`accumulate\`, \`__gcd\`, and \`max_element\`.`,
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
      conceptMd: `Every recursive function is two questions: **what is the smallest case I can answer outright**, and **how do I reduce toward it**. Write the base case first, always.

Drill the primitives until they are automatic: sum to n, factorial, reverse an array in place, check a palindrome, print 1..n without a loop.

Then draw the tree for \`fib(5)\`. Seeing the repeated subtrees is the whole motivation for memoisation later — you want that picture in your head before you reach dynamic programming.`,
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
