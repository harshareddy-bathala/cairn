import type { Module } from "@/content/types";

export const recursionBacktracking: Module = {
  slug: "dsa-recursion-backtracking",
  trackSlug: "dsa",
  phaseSlug: "foundations",
  order: 5,
  title: "Recursion & backtracking",
  summary:
    "The pick / not-pick template you will reuse for subsets, permutations, and every dynamic programming problem in phase 3. Learning it properly here saves weeks later.",
  prereqSlugs: ["dsa-cpp-stl"],
  units: [
    {
      slug: "dsa-rec-tree",
      title: "Recursion trees & the pick / not-pick template",
      objective:
        "Draw the recursion tree for a subset problem and write the two-branch template from memory.",
      estMinutes: 75,
      primer: `List every **subset** of \`[1, 2, 3]\`: [], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]. How do you generate them all without missing or repeating any?

Walk through the elements one at a time and, for each, make one choice: **take it or leave it**. Two choices for each of 3 elements gives 2 × 2 × 2 = 8 subsets. Recursion expresses this directly: a function looks at element \`i\`, calls itself once *with* the element added and once *without* it, and when it has run past the last element it records what it collected.

Drawing those calls as a tree — each call branching into "take" and "leave" — is the **recursion tree**. Being able to draw it is how you design and debug every problem in this module.

**You need already:** the recursion basics unit — base case and smaller call.`,
      conceptMd: `Almost every recursive combinatorial problem is the same two-branch decision: **include the current element, or do not.**

\`\`\`cpp
void solve(int i, vector<int>& cur) {
    if (i == n) { record(cur); return; }
    cur.push_back(a[i]); solve(i + 1, cur); cur.pop_back();  // pick
    solve(i + 1, cur);                                       // not pick
}
\`\`\`

The \`pop_back\` **is** the backtracking. You mutate on the way down and undo on the way up, so a single shared buffer serves the whole tree instead of copying at every node.

Draw the tree for \`n = 3\` once, by hand. Every leaf is one subset, there are 2ⁿ of them, and the depth is n. Copying each subset out costs up to n, so the honest answer is **O(n · 2ⁿ) time and O(n) stack** — 2ⁿ leaves times the copy, plus the depth.`,
      interviewAngle:
        "This template is the ancestor of every DP question in phase 3. Being asked to state " +
        "the complexity of your own recursion — and answering `2^n leaves, each copied out in " +
        "O(n), so O(n * 2^n) time and O(n) stack` — is the routine follow-up.",
      pitfalls: [
        "Forgetting the `pop_back`. The undo *is* the backtracking; without it the shared " +
          "buffer leaks state into sibling branches and the answers are quietly wrong rather " +
          "than crashing.",
        "Copying the buffer at every node instead of mutating and undoing. That is a whole " +
          "extra factor of n for nothing.",
        "Answering `exponential` when asked the complexity. The expected answer names the " +
          "leaf count and the depth.",
      ],
      recall: [
        {
          front: "What single decision is almost every recursive combinatorial problem made of?",
          back:
            "Include the current element, or do not — the pick / not-pick two-branch template.",
        },
        {
          front: "Which line in the template *is* the backtracking, and what does it buy you?",
          back:
            "The `pop_back` after the pick branch. Mutating on the way down and undoing on the " +
            "way up lets one shared buffer serve the whole tree instead of copying at every " +
            "node.",
        },
        {
          front:
            "For subsets of an array of n elements, state the time and space complexity and " +
            "where each comes from.",
          back:
            "O(2^n * n) time — 2^n leaves, each subset copied out in O(n) — and O(n) extra " +
            "stack from the recursion depth.",
        },
      ],
      resources: [
        {
          title: "USACO Guide — Complete search with recursion",
          url: "https://usaco.guide/bronze/complete-rec",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Introduces generating subsets with the take-or-leave recursion, in C++, on a real problem.",
          steps: [
            "Read **Subsets** and **Solution – Apple Division → Generating Subsets Recursively**.",
            "Draw the recursion tree for `[1, 2, 3]` on paper and check you get 8 leaves.",
            "Skip *Generating Subsets with Bitmasks* — it comes back in the bits module.",
            "Leave **Permutations** and **Backtracking** for later units.",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — Subsets of a given array",
          url: "https://www.geeksforgeeks.org/dsa/backtracking-to-find-all-subsets/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The same take-or-leave idea written with backtracking — the `pop_back` that undoes each choice.",
          steps: [
            "Read **Using Recursion** and trace the `pop_back` on a 2-element array.",
          ],
        },
      ],
    },
    {
      slug: "dsa-rec-subsets",
      title: "Subsets, combinations & handling duplicates",
      objective:
        "Generate subsets and combination sums, including the variants where duplicates must not repeat.",
      estMinutes: 90,
      primer: `Once take-or-leave is familiar, the variants are small changes to the same function.

**Combination sum**: pick numbers that add up to a target, where a number may be used again and again. The change: after taking an element, stay on the same element instead of moving to the next.

**Duplicates**: with \`[1, 2, 2]\`, naive generation outputs \`[1, 2]\` twice. The fix is to **sort** first, so equal values sit next to each other, and then, at any one level of the recursion, skip a value that equals the one just tried. Removing duplicates afterwards with a \`set\` also works, but interviewers read it as not understanding the tree.

**You need already:** the take-or-leave template from the last unit, written from memory.`,
      conceptMd: `Once the template is automatic, the variations are small edits.

**Combination sum** (unlimited reuse): on the pick branch, recurse with \`i\` again rather than \`i + 1\`.

**Combination sum II** (each element once, no duplicate combinations): sort first, then inside the loop skip \`if (j > i && a[j] == a[j-1]) continue;\`. The \`j > i\` guard is essential — it allows a duplicate value at the *first* position of this level while forbidding it as a sibling.

That skip-duplicates-at-the-same-level idea recurs throughout backtracking — in subsets II and permutations II it is the same line of code.

The template everything else is an edit of:

\`\`\`cpp
void go(int i, vector<int> &a, vector<int> &cur, vector<vector<int>> &out) {
  if (i == (int)a.size()) { out.push_back(cur); return; }
  cur.push_back(a[i]); go(i + 1, a, cur, out);   // pick
  cur.pop_back();      go(i + 1, a, cur, out);   // not pick
}
\`\`\`

There are 2^n subsets and each is copied on the way out, so this is O(2^n * n) time and O(n) extra stack — worth stating before you are asked, because "exponential" alone is not the answer.

**Subsets II** (the input has duplicates, the output must not): sort, then use the loop form and skip a value that already appeared *at this level*:

\`\`\`cpp
for (int j = i; j < (int)a.size(); j++) {
  if (j > i && a[j] == a[j - 1]) continue;   // sibling duplicate, skip
  cur.push_back(a[j]); go(j + 1, ...); cur.pop_back();
}
\`\`\`

The \`j > i\` guard is doing precise work: it permits a repeated value *deeper* in the tree (where it means "use it twice") while forbidding it *beside* itself (where it would produce an identical subset).`,
      interviewAngle:
        "Combination Sum and Subsets II are asked back to back precisely because the difference " +
        "between them is two characters. Explaining what the `j > i` guard does is the question " +
        "inside the question.",
      pitfalls: [
        "Forgetting to sort before skipping duplicates. The skip compares adjacent values, so " +
          "it only works on sorted input.",
        "Writing the guard as `j > 0` instead of `j > i`. That also forbids the value at the " +
          "first position of the level, losing valid combinations.",
        "Recursing with `i + 1` on the pick branch of Combination Sum, where reuse is " +
          "unlimited — it should recurse with `i`.",
        "Not pruning when the remaining target goes negative. Correct without it, much slower.",
      ],
      recall: [
        {
          front:
            "Combination Sum allows unlimited reuse. What is the one-character change from the " +
            "standard template?",
          back:
            "On the pick branch, recurse with `i` rather than `i + 1`, so the same element can " +
            "be chosen again.",
        },
        {
          front:
            "What exactly does the `j > i` in `if (j > i && a[j] == a[j-1]) continue;` " +
            "accomplish?",
          back:
            "It forbids a repeated value as a *sibling* at the same level (which would produce " +
            "an identical subset) while still permitting the same value *deeper* in the tree, " +
            "where it legitimately means using it twice.",
        },
        {
          front: "Why must the array be sorted before that duplicate skip works?",
          back:
            "The skip compares `a[j]` against its immediate predecessor, so equal values have " +
            "to be adjacent for the test to catch them.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Find all unique subsets",
          url: "https://www.geeksforgeeks.org/dsa/find-all-unique-subsets-of-a-given-set/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Sort, then skip a repeated value at the same level — the duplicate guard this unit is built around.",
          steps: [
            "Read **[Approach - 1] Using Backtracking** and trace it on `[1, 2, 2]`.",
            "Find the line that skips duplicates and explain in one sentence why it is safe.",
            "Skim approach 2 (using a set) to see the lazy fix you should *not* give in an interview.",
          ],
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-rec-permutations",
      title: "Permutations",
      objective:
        "Generate permutations both by swapping and by a used-array, and state the trade-off.",
      estMinutes: 60,
      primer: `A **permutation** is an ordering. \`[1, 2, 3]\` has 6: 123, 132, 213, 231, 312, 321 — in general n! of them.

This is recursion again, but the choice at each step is different. For subsets it was "take or leave this element"; for permutations it is "**which element goes in the next position?**" — any one not yet used.

Two ways to write it: keep a \`used[]\` array and try every unused element in the next position; or **swap** each candidate into the current position, recurse, then swap it back. The swap back is the backtracking step — it restores the array for the next choice.

**You need already:** the subsets units.`,
      conceptMd: `Two standard approaches, and you should be able to produce either.

**Swap-based**: for each index \`i\` from the current position, swap it in, recurse, swap back. No extra storage, but it emits permutations in a non-lexicographic order.

**Used-array**: keep \`vector<bool> used(n)\` and pick any unused element at each level. O(n) extra space, but it naturally produces lexicographic order when the input is sorted, and it extends more cleanly to the duplicates variant.

For permutations II, sort and skip \`if (i > 0 && a[i] == a[i-1] && !used[i-1]) continue;\`. The \`!used[i-1]\` condition is subtle: it enforces that equal elements are always consumed left to right, which fixes one canonical ordering per multiset.`,
      interviewAngle:
        "`Give me another way` is the standard second half of this question. Having both the " +
        "swap and used-array versions, and a reason to pick one, is the answer.",
      pitfalls: [
        "Claiming the swap-based version emits lexicographic order. It does not; the " +
          "used-array version on sorted input does.",
        "Forgetting to swap back after the recursive call. Same class of bug as a missing " +
          "`pop_back`.",
        "Dropping the `!used[i-1]` condition in Permutations II. Without it the duplicate " +
          "skip either over-prunes or does nothing.",
      ],
      recall: [
        {
          front: "Swap-based versus used-array permutations — what is the trade-off?",
          back:
            "Swap-based needs no extra storage but emits a non-lexicographic order. The " +
            "used-array version costs O(n) extra space but produces lexicographic order on " +
            "sorted input and extends more cleanly to duplicates.",
        },
        {
          front:
            "In Permutations II the skip is `if (i > 0 && a[i] == a[i-1] && !used[i-1]) " +
            "continue;`. What is `!used[i-1]` doing?",
          back:
            "It forces equal elements to be consumed strictly left to right, which fixes one " +
            "canonical ordering per multiset and so emits each distinct permutation exactly " +
            "once.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Permutations of a given string",
          url: "https://www.geeksforgeeks.org/dsa/write-a-c-program-to-print-all-permutations-of-a-given-string/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The swap-based version, with the swap back that makes it backtracking.",
          steps: [
            "Read **[Approach] Recursion and Swapping**.",
            "Trace it on `\"abc\"` and write out all 6 results in the order it produces them.",
          ],
          isPrimary: true,
        },
        {
          title: "USACO Guide — Complete search: permutations",
          url: "https://usaco.guide/bronze/complete-rec",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The used-array version and `next_permutation` — the other half of the comparison.",
          steps: [
            "Read **Permutations** → *Lexicographical Order* and *Generating Permutations Recursively*.",
          ],
        },
      ],
    },
    {
      slug: "dsa-rec-constraints",
      title: "Constraint backtracking: N-Queens & rat in a maze",
      objective:
        "Prune a search tree with a validity check, and explain why pruning changes the practical runtime.",
      estMinutes: 90,
      primer: `**Backtracking** is trying options one at a time and **giving up on a path the moment it cannot work**, then going back to try the next option.

N-Queens: place n queens on an n×n board so that no two attack each other. Place one queen per row. In each row, try each column; if the square is attacked, skip it; if safe, place the queen and move to the next row. If a row has no safe square, go back to the previous row and move that queen. Skipping impossible choices early — **pruning** — is what makes this fast enough in practice.

The same shape solves mazes (try each direction, step back from dead ends) and word search in a grid.

**You need already:** the recursion units, and 2D vectors.`,
      conceptMd: `Backtracking becomes genuinely useful when you **prune** — abandon a branch the moment it cannot lead to a solution. The brute-force tree for 8 queens is astronomically large; with pruning it is trivial for a computer.

For N-Queens, place one queen per row and keep three boolean arrays: \`col[]\`, \`diag1[row + col]\`, \`diag2[row - col + n - 1]\`. That makes the validity check O(1) instead of rescanning the board — and deriving those two diagonal index formulas yourself is the part worth doing on paper.

The universal shape: **choose → explore → un-choose.** Forgetting the un-choose is a common backtracking bug, and it produces answers that are subtly, confusingly wrong rather than crashing.`,
      interviewAngle:
        "N-Queens is asked to see whether you prune, and whether you can derive the diagonal " +
        "indices rather than recite them. Pruning is the entire difference between a toy and a " +
        "working solution.",
      pitfalls: [
        "Rescanning the board to check validity. Three boolean arrays make the check O(1); " +
          "the scan makes it O(n) per placement for no reason.",
        "Getting the second diagonal index wrong. It is `row - col + n - 1` — the shift is " +
          "what keeps it non-negative.",
        "Forgetting the un-choose step. Choose, explore, un-choose: a missing un-choose " +
          "produces subtly wrong answers rather than a crash.",
      ],
      recall: [
        {
          front:
            "State the universal backtracking shape in three words, and name the step people " +
            "forget.",
          back:
            "Choose, explore, un-choose. The un-choose is the one that gets forgotten, and it " +
            "corrupts sibling branches instead of crashing.",
        },
        {
          front:
            "For N-Queens, what three arrays make the validity check O(1), and how are the " +
            "diagonals indexed?",
          back:
            "`col[col]`, `diag1[row + col]` for one diagonal direction, and `diag2[row - col + " +
            "n - 1]` for the other — the `+ n - 1` shift keeps the index non-negative.",
        },
        {
          front:
            "Why does pruning matter so much here when it does not change the worst-case " +
            "complexity?",
          back:
            "It abandons a branch the moment it cannot lead to a solution, so the tree actually " +
            "explored is a tiny fraction of the theoretical one. The bound is unchanged; the " +
            "practical runtime goes from impossible to instant.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — N Queen problem",
          url: "https://www.geeksforgeeks.org/dsa/n-queen-problem-backtracking-3/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Goes from scanning the board for attacks to O(1) lookups — the step that makes pruning cheap enough to matter.",
          steps: [
            "Read **[Naive Approach] Using Backtracking**; solve n = 4 on paper first.",
            "Read **[Expected Approach 1] Backtracking with Hashing** — the column and diagonal arrays.",
            "Skip the bit-masking approach for now.",
          ],
          isPrimary: true,
        },
        {
          title: "USACO Guide — Backtracking: Chessboard & Queens",
          url: "https://usaco.guide/bronze/complete-rec",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The same idea in compact C++ on a real judge problem.",
          steps: [
            "Read **Backtracking** → *Solution – Chessboard & Queens*.",
          ],
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-subsets", title: "Subsets", platform: "leetcode", url: "https://leetcode.com/problems/subsets/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Every possible selection from a set.", approachHint: "The pick / not-pick template. Record at every node, or at the leaves — know why both work.", estMinutes: 20, unitSlug: "dsa-rec-tree" },
    { slug: "lc-subsets-ii", title: "Subsets II", platform: "leetcode", url: "https://leetcode.com/problems/subsets-ii/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Subsets with duplicate input values, no repeated output.", approachHint: "Sort, then skip j > i && a[j] == a[j-1] at each level. The j > i guard is the whole trick.", estMinutes: 30, unitSlug: "dsa-rec-subsets" },
    { slug: "lc-combination-sum", title: "Combination Sum", platform: "leetcode", url: "https://leetcode.com/problems/combination-sum/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Reach a target with unlimited reuse of each candidate.", approachHint: "On the pick branch recurse with i, not i+1. Prune when the remainder goes negative.", estMinutes: 30, unitSlug: "dsa-rec-subsets" },
    { slug: "lc-combination-sum-ii", title: "Combination Sum II", platform: "leetcode", url: "https://leetcode.com/problems/combination-sum-ii/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Each element used once, duplicates present in the input.", approachHint: "Sort, loop from index i, skip duplicates with the j > i guard, recurse with j+1.", estMinutes: 30, unitSlug: "dsa-rec-subsets" },
    { slug: "lc-permutations", title: "Permutations", platform: "leetcode", url: "https://leetcode.com/problems/permutations/", difficulty: "medium", patternTag: "backtracking", triggerHint: "All orderings of distinct elements.", approachHint: "Swap-in / recurse / swap-back, or a used[] array. Write it both ways once.", estMinutes: 25, unitSlug: "dsa-rec-permutations" },
    { slug: "lc-permutations-ii", title: "Permutations II", platform: "leetcode", url: "https://leetcode.com/problems/permutations-ii/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Orderings with duplicate elements, output must be unique.", approachHint: "Sort and use the used[] version. Skip a[i]==a[i-1] && !used[i-1] to fix one canonical order per multiset.", estMinutes: 35, unitSlug: "dsa-rec-permutations" },
    { slug: "lc-letter-combinations", title: "Letter Combinations of a Phone Number", platform: "leetcode", url: "https://leetcode.com/problems/letter-combinations-of-a-phone-number/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Cartesian product across positions.", approachHint: "One recursion level per digit, looping over that digit's letters. Handle empty input explicitly.", estMinutes: 25, unitSlug: "dsa-rec-tree" },
    { slug: "lc-generate-parentheses", title: "Generate Parentheses", platform: "leetcode", url: "https://leetcode.com/problems/generate-parentheses/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Build valid strings under a running constraint.", approachHint: "Track open and close counts. Add '(' while open < n; add ')' only while close < open. That inequality is the pruning.", estMinutes: 25, unitSlug: "dsa-rec-constraints" },
    { slug: "lc-palindrome-partitioning", title: "Palindrome Partitioning", platform: "leetcode", url: "https://leetcode.com/problems/palindrome-partitioning/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Split a string every way such that each piece satisfies a property.", approachHint: "At each index try every prefix; recurse only when that prefix is a palindrome. That check is the prune.", estMinutes: 35, unitSlug: "dsa-rec-constraints" },
    { slug: "lc-n-queens", title: "N-Queens", platform: "leetcode", url: "https://leetcode.com/problems/n-queens/", difficulty: "hard", patternTag: "backtracking", triggerHint: "Place items under mutual-exclusion constraints.", approachHint: "One queen per row; col[], diag1[r+c], diag2[r-c+n-1] make validity O(1). Derive the diagonal indices yourself.", estMinutes: 45, unitSlug: "dsa-rec-constraints" },
    { slug: "gfg-rat-in-a-maze", title: "Rat in a Maze", platform: "gfg", url: "https://www.geeksforgeeks.org/problems/rat-in-a-maze-problem/1", difficulty: "medium", patternTag: "backtracking", triggerHint: "Enumerate all paths through a grid with blocked cells.", approachHint: "Mark visited on the way in, unmark on the way out. Try directions in D-L-R-U order for lexicographic output.", estMinutes: 35, unitSlug: "dsa-rec-constraints" },
    { slug: "lc-word-search", title: "Word Search", platform: "leetcode", url: "https://leetcode.com/problems/word-search/", difficulty: "medium", patternTag: "backtracking", triggerHint: "Path search in a grid matching a sequence.", approachHint: "DFS from every cell, temporarily overwrite the visited cell, restore it on the way out.", estMinutes: 35, unitSlug: "dsa-rec-constraints" },
  ],
};
