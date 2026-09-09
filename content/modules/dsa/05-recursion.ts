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
      conceptMd: `Almost every recursive combinatorial problem is the same two-branch decision: **include the current element, or do not.**

\`\`\`cpp
void solve(int i, vector<int>& cur) {
    if (i == n) { record(cur); return; }
    cur.push_back(a[i]); solve(i + 1, cur); cur.pop_back();  // pick
    solve(i + 1, cur);                                       // not pick
}
\`\`\`

The \`pop_back\` **is** the backtracking. You mutate on the way down and undo on the way up, so a single shared buffer serves the whole tree instead of copying at every node.

Draw the tree for \`n = 3\` once, by hand. Every leaf is one subset, there are 2ⁿ of them, and the depth is n — which is exactly the O(2ⁿ) time and O(n) stack space you will be asked to state.`,
      resources: [
        {
          title: "Striver — recursion playlist (subsequences)",
          url: "https://takeuforward.org/data-structure/print-all-subsequences-of-an-array/",
          kind: "watch",
          minutes: 45,
          whyThisOne: "Builds the template incrementally and draws the tree, which is the part that has to stick.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-rec-subsets",
      title: "Subsets, combinations & handling duplicates",
      objective:
        "Generate subsets and combination sums, including the variants where duplicates must not repeat.",
      estMinutes: 90,
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
      resources: [
        {
          title: "Striver A2Z — Step 9: recursion (subsets, combinations)",
          url: "https://takeuforward.org/data-structure/combination-sum-1/",
          kind: "do",
          minutes: 75,
          whyThisOne: "The whole family in order, so the duplicate-skipping guard is introduced where it makes sense.",
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
      conceptMd: `Two standard approaches, and you should be able to produce either.

**Swap-based**: for each index \`i\` from the current position, swap it in, recurse, swap back. No extra storage, but it emits permutations in a non-lexicographic order.

**Used-array**: keep \`vector<bool> used(n)\` and pick any unused element at each level. O(n) extra space, but it naturally produces lexicographic order when the input is sorted, and it extends more cleanly to the duplicates variant.

For permutations II, sort and skip \`if (i > 0 && a[i] == a[i-1] && !used[i-1]) continue;\`. The \`!used[i-1]\` condition is subtle: it enforces that equal elements are always consumed left to right, which fixes one canonical ordering per multiset.`,
      resources: [
        {
          title: "Striver — permutations of an array",
          url: "https://takeuforward.org/data-structure/print-all-permutations-of-a-string-array/",
          kind: "watch",
          minutes: 35,
          whyThisOne: "Shows both approaches back to back, which is exactly the comparison an interviewer probes.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-rec-constraints",
      title: "Constraint backtracking: N-Queens & rat in a maze",
      objective:
        "Prune a search tree with a validity check, and explain why pruning changes the practical runtime.",
      estMinutes: 90,
      conceptMd: `Backtracking becomes genuinely useful when you **prune** — abandon a branch the moment it cannot lead to a solution. The brute-force tree for 8 queens is astronomically large; with pruning it is trivial for a computer.

For N-Queens, place one queen per row and keep three boolean arrays: \`col[]\`, \`diag1[row + col]\`, \`diag2[row - col + n - 1]\`. That makes the validity check O(1) instead of rescanning the board — and deriving those two diagonal index formulas yourself is the part worth doing on paper.

The universal shape: **choose → explore → un-choose.** Forgetting the un-choose is a common backtracking bug, and it produces answers that are subtly, confusingly wrong rather than crashing.`,
      resources: [
        {
          title: "Striver — N-Queens",
          url: "https://takeuforward.org/data-structure/n-queen-problem-return-all-distinct-solutions-to-the-n-queens-puzzle/",
          kind: "watch",
          minutes: 40,
          whyThisOne: "Derives the diagonal hashing rather than asserting it, so you can rebuild it under pressure.",
          isPrimary: true,
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
