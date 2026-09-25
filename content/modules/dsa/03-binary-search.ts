import type { Module } from "@/content/types";

export const binarySearch: Module = {
  slug: "dsa-binary-search",
  trackSlug: "dsa",
  phaseSlug: "foundations",
  order: 3,
  title: "Binary search (and on the answer)",
  summary:
    "Half of this is searching a sorted array. The other half — binary search on the answer space — collapses a large family of medium problems into one template, and it appears in problems that are never filed under the name.",
  prereqSlugs: ["dsa-arrays-sorting"],
  units: [
    {
      slug: "dsa-bs-invariant",
      title: "The invariant, written once and reused forever",
      objective:
        "Write binary search without off-by-one errors by stating the loop invariant before the loop.",
      estMinutes: 60,
      primer: `**Binary search** finds a value in a *sorted* array by halving. Look at the middle element. If it is the value, done. If the value you want is bigger, it can only be in the right half, so throw away the left half; if smaller, throw away the right. Repeat.

Each step halves what is left, so 1,000,000 elements take about 20 steps — O(log n) instead of O(n).

The idea is easy; the code is where people slip: \`<\` or \`<=\` in the loop, \`mid - 1\` or \`mid\`. This unit picks one way of writing it — the search range is \`[lo, hi]\`, both ends included — and uses it everywhere, so you stop guessing.

**You need already:** arrays and loops. Nothing else.`,
      conceptMd: `Most binary search bugs are not logic errors, they are **boundary conventions applied inconsistently**. Pick one convention and never mix them.

Use the closed interval \`[lo, hi]\`:

\`\`\`cpp
int lo = 0, hi = n - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;   // never (lo + hi) / 2 — that overflows
    if (a[mid] == target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
}
return -1;
\`\`\`

Three rules that make it reliable: the condition is \`<=\` because \`lo == hi\` is still an unexamined element; \`mid\` is computed as \`lo + (hi - lo) / 2\` to avoid integer overflow; and every branch **must** exclude \`mid\`, or the loop can spin forever.

When the loop exits, \`lo\` is the insertion point — which is precisely \`lower_bound\`. That fact is worth internalising, because it is the answer to a whole family of problems.`,
      interviewAngle:
        "Writing binary search without an off-by-one, first try, under observation. Stating " +
        "your boundary convention before the loop is what makes that possible.",
      pitfalls: [
        "Computing `mid` as `(lo + hi) / 2`. It overflows once `lo + hi` passes INT_MAX — the " +
          "bug that sat in the JDK for nine years.",
        "Writing `while (lo < hi)` with the closed-interval convention. When `lo == hi` there " +
          "is still an unexamined element, so the condition is `<=`.",
        "A branch that keeps `mid` in the range — `hi = mid` instead of `hi = mid - 1` in the " +
          "closed convention. That is an infinite loop, not a wrong answer.",
        "Mixing conventions between problems. Pick the closed interval and hold it.",
      ],
      recall: [
        {
          front:
            "In the closed-interval `[lo, hi]` convention, why is the loop condition `<=` and " +
            "not `<`?",
          back:
            "When `lo == hi` the range still holds exactly one unexamined element. Stopping at " +
            "`<` skips it.",
        },
        {
          front: "Why is `mid = lo + (hi - lo) / 2` rather than `(lo + hi) / 2`?",
          back:
            "`lo + hi` can exceed INT_MAX and overflow to a negative index. The subtraction " +
            "form never leaves the valid range.",
        },
        {
          front: "When the closed-interval loop exits without a match, what does `lo` hold?",
          back:
            "The insertion point — the index where the target would go to keep the array " +
            "sorted. That is exactly `lower_bound`.",
        },
        {
          front: "What must every branch do to `mid`, and what happens if one does not?",
          back:
            "Every branch must exclude `mid` from the next range. A branch that keeps it spins " +
            "forever.",
        },
      ],
      resources: [
        {
          title: "Striver — Binary search: introduction",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/binary-search-introduction",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Explains the halving idea first, then writes plain search, lower bound and upper bound in one consistent style.",
          steps: [
            "Read **What is Binary Search?** and **How Binary Search Works**.",
            "Work **Search X in a Sorted Array** — follow the **Dry Run** on paper.",
            "Read **Lower Bound** and **Upper Bound** and note how they differ from plain search.",
            "Close the page and write plain binary search from memory.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Binary search: search a sorted array",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/binary-search-algorithm",
          kind: "do",
          minutes: 15,
          whyThisOne:
            "The first problem to solve alone, with two follow-ups interviewers really ask.",
          steps: [
            "Solve it, then answer *Why write low + (high - low) / 2 instead of (low + high) / 2?*",
          ],
        },
      ],
    },
    {
      slug: "dsa-bs-occurrences",
      title: "First, last & counting occurrences",
      objective:
        "Find the first and last index of a repeated value, and count occurrences in O(log n).",
      estMinutes: 60,
      primer: `Plain binary search stops at the first match it finds. But in \`[1, 2, 2, 2, 3]\`, "where is 2?" has three right answers — and questions usually want the **first** one, the **last** one, or **how many**.

The change is small: when you find a match, do not stop. Write it down as the best answer so far, and keep searching the side where a better one could be — left for the first occurrence, right for the last. The count is then \`last − first + 1\`.

**You need already:** the plain binary search from the last unit, written from memory.`,
      conceptMd: `The move that unlocks this family: **on a match, do not return — keep searching the side that could hold a better answer.**

For the first occurrence, record \`mid\` as a candidate and then set \`hi = mid - 1\` to keep looking left. For the last occurrence, record and set \`lo = mid + 1\`.

Count is then \`last - first + 1\`, or equivalently \`upper_bound − lower_bound\`. Write it both ways once so the equivalence is obvious.

The same "record and keep going" shape solves *kth missing positive* and *floor/ceil in a sorted array*, so it is worth the drill.

The template, with the candidate made explicit:

\`\`\`cpp
int firstOccurrence(vector<int> &a, int x) {
  int lo = 0, hi = a.size() - 1, ans = -1;
  while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;      // not (lo + hi) / 2 — that can overflow
    if (a[mid] == x) { ans = mid; hi = mid - 1; }   // record, keep going LEFT
    else if (a[mid] < x) lo = mid + 1;
    else hi = mid - 1;
  }
  return ans;
}
\`\`\`

For the last occurrence, change exactly one line: \`lo = mid + 1\` in the match branch. Everything else is identical, which is the point — one template, one edit.

\`mid = lo + (hi - lo) / 2\` rather than \`(lo + hi) / 2\` matters once \`lo + hi\` can exceed \`INT_MAX\`. It is a famous bug — it sat in the JDK's binary search for nine years — and mentioning why you wrote it that way costs you one sentence.`,
      interviewAngle:
        "The follow-up to plain binary search is almost always `now find the first one`. The " +
        "record-and-keep-going move is the answer, and it generalises further than it looks.",
      pitfalls: [
        "Returning on the first match. For a first or last occurrence you must record the " +
          "candidate and keep searching the side that could hold a better one.",
        "Searching the wrong side. First occurrence keeps going left (`hi = mid - 1`); last " +
          "occurrence keeps going right (`lo = mid + 1`).",
        "Forgetting that `last - first + 1` is undefined when the value is absent — check the " +
          "sentinel first.",
      ],
      recall: [
        {
          front:
            "What is the one move that turns plain binary search into first-occurrence search?",
          back:
            "On a match, do not return: record `mid` as a candidate and keep searching the side " +
            "that could hold a better answer — left for first, right for last.",
        },
        {
          front: "Give two ways to count occurrences of x in a sorted array in O(log n).",
          back:
            "`last - first + 1` from two boundary searches, or `upper_bound(x) - " +
            "lower_bound(x)`. Writing both once makes the equivalence obvious.",
        },
        {
          front: "Which other problems use the same record-and-continue shape?",
          back:
            "Kth missing positive, and floor/ceil in a sorted array — which is why the template " +
            "is worth drilling rather than memorising per problem.",
        },
      ],
      resources: [
        {
          title: "Striver — First, last occurrences and count",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/first-last-occurrences-and-count-in-an-array",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Shows the record-and-keep-going change explicitly, for first, last and count, on one page.",
          steps: [
            "Read **How Occurrence-Based Binary Search Works**.",
            "Work **First Occurrence** and **Last Occurrence**, following each **Dry Run**.",
            "Read **Count Occurrences** — it is the two combined.",
          ],
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-bs-rotated",
      title: "Rotated & partially sorted arrays",
      objective:
        "Search a rotated sorted array, with and without duplicates, and explain why duplicates break the O(log n) guarantee.",
      estMinutes: 75,
      primer: `Take a sorted array and move a chunk from the front to the back: \`[1,2,3,4,5,6,7]\` becomes \`[4,5,6,7,1,2,3]\`. That is a **rotated sorted array**. It is no longer sorted, so plain binary search fails — but it is *almost* sorted.

The key fact: cut it anywhere in the middle and **at least one half is still properly sorted**. At each step, check which half that is, ask whether the target falls inside that sorted half's range, and throw away the other half. Still O(log n).

Duplicates spoil the "which half is sorted" check in some cases, which is the harder variant.

**You need already:** binary search with the \`[lo, hi]\` style from the first unit.`,
      conceptMd: `A rotated sorted array has one pivot, which means **at least one half of any split is properly sorted**. Identify which half that is, decide whether the target lies inside it, and discard the other half.

\`\`\`
if (a[lo] <= a[mid])        // left half sorted
    target in [a[lo], a[mid]) ? hi = mid-1 : lo = mid+1;
else                        // right half sorted
    target in (a[mid], a[hi]] ? lo = mid+1 : hi = mid-1;
\`\`\`

**With duplicates** the comparison \`a[lo] <= a[mid]\` stops being decisive — consider \`[3,1,3,3,3]\`, where you cannot tell which side is sorted. The standard patch is: when \`a[lo] == a[mid] == a[hi]\`, shrink both ends by one. That degrades the worst case to O(n), and being able to say so out loud is the point of the exercise.

Finding the minimum is the same skill: the unsorted half always contains the pivot.`,
      interviewAngle:
        "The duplicates variant exists to see whether you will claim O(log n) when it is not " +
        "true. Volunteering `this degrades to O(n) with duplicates` is the answer they are " +
        "listening for.",
      pitfalls: [
        "Testing whether the target is greater than `a[mid]` instead of whether it lies " +
          "inside the sorted half. The half's bounds are what you compare against.",
        "Carrying the no-duplicates solution over to the duplicates variant. When `a[lo] == " +
          "a[mid] == a[hi]` neither half is provably sorted.",
        "Claiming the duplicates version is still O(log n). Shrinking both ends by one is " +
          "O(n) in the worst case, and saying so is part of the answer.",
      ],
      recall: [
        {
          front: "In a rotated sorted array, what is always true about any split at `mid`?",
          back:
            "At least one of the two halves is properly sorted, because there is only one " +
            "pivot. Identify which, test whether the target lies inside it, and discard the " +
            "other half.",
        },
        {
          front: "Why does `a[lo] <= a[mid]` stop being decisive when duplicates are allowed?",
          back:
            "On input like `[3, 1, 3, 3, 3]` the comparison holds while the left half is not " +
            "sorted, so it no longer identifies the sorted side.",
        },
        {
          front: "What is the standard patch for the duplicates case, and what does it cost?",
          back:
            "When `a[lo] == a[mid] == a[hi]`, shrink both ends by one. That degrades the worst " +
            "case to O(n).",
        },
        {
          front: "How do you find the minimum of a rotated sorted array?",
          back:
            "The pivot always lies in the unsorted half — compare `a[mid]` with `a[hi]`: if " +
            "`a[mid] > a[hi]` the minimum is strictly right of mid, otherwise it is at mid or " +
            "left.",
        },
      ],
      resources: [
        {
          title: "Striver — Search in rotated sorted array I",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/search-in-rotated-sorted-array",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "Which half is sorted, decided at every step — the one idea the whole family turns on.",
          steps: [
            "Read the examples and try it for 10 minutes.",
            "Read **Optimal Approach** and follow the **Dry Run** on paper.",
            "Answer *Why can't we simply compare the target with nums[mid] like normal binary search?* out loud.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Search in rotated sorted array II (duplicates)",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/search-in-rotated-sorted-array-ii",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "What duplicates break, and why the guarantee drops to O(n) in the worst case.",
        },
        {
          title: "Striver — Find the minimum in a rotated sorted array",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/find-minimum-in-rotated-sorted-array",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "The same sorted-half test, used to find the rotation point instead of a target.",
        },
      ],
    },
    {
      slug: "dsa-bs-answer-space",
      title: "Binary search on the answer",
      objective:
        "Recognise the monotonic-predicate shape and solve Koko / bouquets / ship-packages / allocate-books with one template.",
      estMinutes: 90,
      primer: `Sometimes you binary search not an array but **the answer itself**.

Example: Koko eats bananas from piles at a speed of k bananas per hour and must finish within h hours. What is the smallest k that works? You could try k = 1, 2, 3, … and check each. But notice: if speed 10 is fast enough, speed 11 certainly is. "Works / does not work" flips exactly once as k grows. Anything with that shape can be binary searched: guess a middle k, check it, and throw away half of the possible answers.

So the recipe is: (1) find the range the answer lies in, (2) write a \`check(x)\` that says whether x works, (3) binary search for the first x where \`check\` is true.

**You need already:** first-occurrence binary search from the earlier unit.`,
      conceptMd: `**The array is not what you search — you search the space of possible answers.**

The trigger, and it is remarkably consistent: *"find the minimum X such that some condition holds"* (or the maximum). The unlock is that the condition is **monotonic** — if a capacity of 10 works, so does 11. That monotonicity is exactly what binary search needs.

The template:

\`\`\`cpp
int lo = <smallest conceivable answer>, hi = <largest>;
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (feasible(mid)) hi = mid;      // mid might be the answer, keep it
    else               lo = mid + 1;  // mid is too small, discard it
}
return lo;
\`\`\`

The whole job is writing \`feasible(mid)\` and choosing the bounds. For Koko: \`feasible(speed)\` sums \`ceil(pile / speed)\` and compares to h; \`lo = 1\`, \`hi = max(piles)\`. For ship-packages: \`feasible(capacity)\` greedily counts days; \`lo = max(weights)\` — you must fit the heaviest single item — and \`hi = sum(weights)\`.

Getting \`lo\` wrong is the classic error. Ask yourself what the smallest answer that is even *possible* is, not the smallest number.

Allocate books, split array, minimum days for bouquets, smallest divisor and painter's partition are all the same problem wearing different clothes. Solve two carefully and the rest become mechanical.`,
      interviewAngle:
        "This family is most of the medium binary-search questions, and they are never filed " +
        "under the name. Recognising `minimum X such that a condition holds` out loud is most " +
        "of the work.",
      pitfalls: [
        "Setting `lo` to 1 by reflex. Ask what the smallest answer that is even possible is — " +
          "for ship-packages it is `max(weights)`, because the heaviest item has to fit.",
        "Writing a `feasible` predicate that is not monotonic. If a larger value can be " +
          "infeasible when a smaller one worked, binary search does not apply at all.",
        "Overflowing inside `feasible`. Sums over the whole array usually need `long long`.",
        "Forgetting the flipped update on maximise-the-minimum problems like aggressive cows " +
          "— the feasible branch moves `lo`, not `hi`.",
      ],
      recall: [
        {
          front:
            "What is the phrase in a problem statement that signals binary search on the " +
            "answer?",
          back:
            "`Find the minimum (or maximum) X such that some condition holds` — where the " +
            "condition is monotonic in X, so once it holds it keeps holding.",
        },
        {
          front:
            "Why does monotonicity of `feasible` matter, and not just that the answers are " +
            "numbers?",
          back:
            "Binary search needs to discard half the space from one test. Only monotonicity " +
            "guarantees that if `feasible(mid)` is true, everything above mid is feasible too.",
        },
        {
          front:
            "For `Capacity to Ship Packages Within D Days`, what are the search bounds and why?",
          back:
            "`lo = max(weights)`, because a capacity below the heaviest single package can " +
            "never ship anything; `hi = sum(weights)`, which trivially ships in one day.",
        },
        {
          front: "Name three problems that are this same template in different clothes.",
          back:
            "Koko eating bananas, split array largest sum, and allocate books / painter's " +
            "partition — plus minimum days for bouquets and smallest divisor.",
        },
      ],
      resources: [
        {
          title: "Striver — Koko eating bananas",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/koko-eating-bananas",
          kind: "do",
          minutes: 40,
          whyThisOne:
            "The first answer-space problem, from trying every speed to binary searching the speeds.",
          steps: [
            "Read **Brute Force** — trying every speed — and make sure it makes sense.",
            "Read **Optimal Approach** and its **Dry Run**; write down the range, the check and the loop separately.",
            "Answer the follow-ups on why the search runs from 1 to the largest pile.",
            "Then solve *Capacity to Ship Packages* from this unit's practice list with the same three parts.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Capacity to ship packages within D days",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/capacity-to-ship-packages-within-d-days",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "The same template on a problem that does not look like it — seeing that is the skill.",
          steps: [
            "Solve it before reading; then compare your `check` with the page's.",
          ],
        },
      ],
    },
    {
      slug: "dsa-bs-matrix",
      title: "Binary search in 2D",
      objective:
        "Search a row-sorted matrix by flattening indices, and handle the staircase variant.",
      estMinutes: 60,
      primer: `A matrix is a grid: rows and columns, \`a[row][col]\`. Two kinds of "sorted matrix" appear in interviews, and they need different methods.

1. **Fully sorted**: each row is sorted, and each row starts after the previous row ends. Read row by row it is just one long sorted array — so binary search it as one, converting a position \`i\` into \`row = i / cols\`, \`col = i % cols\`.
2. **Rows and columns sorted separately**: you cannot flatten it. Start at the top-right corner instead: if the value there is too big, move left; if too small, move down. Each step removes a row or a column.

**You need already:** binary search, and 2D vectors from the C++ module.`,
      conceptMd: `Two different matrix problems that look alike and are not.

**Fully sorted** (each row sorted, and every row starts after the previous ends): treat it as one flat array of length \`m*n\` and binary search it, mapping \`idx → (idx / n, idx % n)\`. O(log mn).

**Row- and column-sorted only** (a "staircase" matrix — LeetCode 240): flattening is invalid. Instead start at the **top-right corner**. If the value is too large, move left; too small, move down. Each step eliminates a whole row or column, giving O(m + n). Starting at any other corner does not work, which is worth understanding rather than memorising.

The staircase walk, which is the half people get wrong:

\`\`\`cpp
int r = 0, c = n - 1;                  // start TOP-RIGHT
while (r < m && c >= 0) {
  if (mat[r][c] == target) return true;
  if (mat[r][c] > target) c--;         // too big: this whole column is too big
  else r++;                            // too small: this whole row is too small
}
return false;
\`\`\`

**Why the top-right corner.** At that cell the two directions disagree: moving left strictly decreases, moving down strictly increases. So whichever comparison you get, exactly one direction is eliminated — a whole row or a whole column at a time. The bottom-left corner works for the same reason. The top-left does not: both moves increase, so a mismatch tells you nothing about which way to go.

Deciding which of the two problems you are looking at takes one question: *does every row start after the previous row ends?* If yes, flatten. If not, walk the staircase.`,
      interviewAngle:
        "Two matrix problems that look identical and are not. The question to ask before coding " +
        "— `does every row start after the previous one ends?` — is the answer.",
      pitfalls: [
        "Flattening a staircase matrix. If rows do not chain end to end, the flat array is " +
          "not sorted and binary search is simply wrong.",
        "Starting the staircase walk at the top-left. Both moves increase from there, so a " +
          "mismatch tells you nothing.",
        "Mapping the flat index with the wrong dimension. It is `(idx / n, idx % n)` where n " +
          "is the number of columns.",
      ],
      recall: [
        {
          front:
            "What single question separates `Search a 2D Matrix` from `Search a 2D Matrix II`?",
          back:
            "Does every row start after the previous row ends? If yes, flatten and binary " +
            "search in O(log mn). If only rows and columns are individually sorted, walk the " +
            "staircase in O(m + n).",
        },
        {
          front: "Why must the staircase walk start at the top-right (or bottom-left) corner?",
          back:
            "At that corner the two available moves disagree — left strictly decreases, down " +
            "strictly increases — so any comparison eliminates a whole row or column. At the " +
            "top-left both moves increase, so nothing is eliminated.",
        },
        {
          front: "How do you map a flat index back to a cell in an m by n matrix?",
          back: "Row is `idx / n`, column is `idx % n`, where n is the number of columns.",
        },
      ],
      resources: [
        {
          title: "Striver — Search in a sorted 2D matrix",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/search-in-sorted-2d-matrix",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "The flatten-and-search version, including why the row/column conversion is correct.",
          steps: [
            "Read **Optimal Approach** and do the **Dry Run**.",
            "Answer *Why is row = mid / cols and col = mid % cols used?* before reading the answer.",
            "Then open the next link for the second kind of matrix.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Search in a row- and column-wise sorted matrix",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/search-in-a-row-and-column-wise-sorted-matrix",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "The staircase version, where flattening is wrong — the distinction is the whole trap.",
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-binary-search", title: "Binary Search", platform: "leetcode", url: "https://leetcode.com/problems/binary-search/", difficulty: "easy", patternTag: "binary-search", triggerHint: "Sorted array, find an exact value.", approachHint: "The base template. Fix your boundary convention here and keep it for every problem below.", estMinutes: 10, unitSlug: "dsa-bs-invariant" },
    { slug: "lc-find-first-last-position", title: "Find First and Last Position of Element", platform: "leetcode", url: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/", difficulty: "medium", patternTag: "binary-search", triggerHint: "Repeated values, need the boundaries of the run.", approachHint: "Two searches. On a match, record and keep searching left (first) or right (last).", estMinutes: 25, unitSlug: "dsa-bs-occurrences" },
    { slug: "lc-kth-missing-positive", title: "Kth Missing Positive Number", platform: "leetcode", url: "https://leetcode.com/problems/kth-missing-positive-number/", difficulty: "easy", patternTag: "binary-search", triggerHint: "Counting absences in a sorted array — sounds linear, is logarithmic.", approachHint: "Missing count before index i is a[i] - (i+1). Binary search for where that count reaches k.", estMinutes: 30, unitSlug: "dsa-bs-occurrences" },
    { slug: "lc-search-rotated", title: "Search in Rotated Sorted Array", platform: "leetcode", url: "https://leetcode.com/problems/search-in-rotated-sorted-array/", difficulty: "medium", patternTag: "binary-search-rotated", triggerHint: "Sorted then rotated, no duplicates.", approachHint: "One half is always sorted. Identify it, test whether the target lies within it, discard the other half.", estMinutes: 30, unitSlug: "dsa-bs-rotated" },
    { slug: "lc-search-rotated-ii", title: "Search in Rotated Sorted Array II", platform: "leetcode", url: "https://leetcode.com/problems/search-in-rotated-sorted-array-ii/", difficulty: "medium", patternTag: "binary-search-rotated", triggerHint: "Same as above but duplicates are allowed.", approachHint: "When a[lo] == a[mid] == a[hi] you cannot tell which half is sorted — shrink both ends by one. Worst case becomes O(n); say so.", estMinutes: 30, unitSlug: "dsa-bs-rotated" },
    { slug: "lc-find-min-rotated", title: "Find Minimum in Rotated Sorted Array", platform: "leetcode", url: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/", difficulty: "medium", patternTag: "binary-search-rotated", triggerHint: "Locate the pivot itself.", approachHint: "Compare a[mid] with a[hi]. If a[mid] > a[hi] the pivot is to the right, else it is at mid or left.", estMinutes: 25, unitSlug: "dsa-bs-rotated" },
    { slug: "lc-single-element-sorted", title: "Single Element in a Sorted Array", platform: "leetcode", url: "https://leetcode.com/problems/single-element-in-a-sorted-array/", difficulty: "medium", patternTag: "binary-search", triggerHint: "Everything is in pairs except one, and O(log n) is demanded.", approachHint: "Before the loner, pairs start at even indices; after it, at odd. Binary search on that parity change.", estMinutes: 30, unitSlug: "dsa-bs-occurrences" },
    { slug: "lc-find-peak-element", title: "Find Peak Element", platform: "leetcode", url: "https://leetcode.com/problems/find-peak-element/", difficulty: "medium", patternTag: "binary-search", triggerHint: "Unsorted array, but O(log n) is required — the giveaway that a local property is enough.", approachHint: "If a[mid] < a[mid+1] a peak must exist to the right, else at mid or left. Uphill always leads to one.", estMinutes: 25, unitSlug: "dsa-bs-invariant" },
    { slug: "lc-sqrtx", title: "Sqrt(x)", platform: "leetcode", url: "https://leetcode.com/problems/sqrtx/", difficulty: "easy", patternTag: "binary-search-answer", triggerHint: "Largest integer whose square does not exceed x.", approachHint: "Binary search 0..x on the predicate mid*mid <= x. Use long long for the product.", estMinutes: 15, unitSlug: "dsa-bs-answer-space" },
    { slug: "lc-koko-eating-bananas", title: "Koko Eating Bananas", platform: "leetcode", url: "https://leetcode.com/problems/koko-eating-bananas/", difficulty: "medium", patternTag: "binary-search-answer", triggerHint: "Minimum speed such that the work finishes in time — a monotonic predicate.", approachHint: "feasible(speed) = sum of ceil(pile/speed) <= h. Search lo=1, hi=max(piles).", estMinutes: 30, unitSlug: "dsa-bs-answer-space" },
    { slug: "lc-min-days-bouquets", title: "Minimum Number of Days to Make m Bouquets", platform: "leetcode", url: "https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/", difficulty: "medium", patternTag: "binary-search-answer", triggerHint: "Minimum day such that enough adjacent groups have bloomed.", approachHint: "feasible(day) scans once counting runs of bloomed flowers. Answer -1 if m*k > n; check that first.", estMinutes: 35, unitSlug: "dsa-bs-answer-space" },
    { slug: "lc-ship-packages", title: "Capacity to Ship Packages Within D Days", platform: "leetcode", url: "https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/", difficulty: "medium", patternTag: "binary-search-answer", triggerHint: "Minimum capacity meeting a deadline.", approachHint: "feasible(cap) greedily counts days. lo = max(weights) — the heaviest item must fit — hi = sum(weights).", estMinutes: 30, unitSlug: "dsa-bs-answer-space" },
    { slug: "lc-smallest-divisor", title: "Find the Smallest Divisor Given a Threshold", platform: "leetcode", url: "https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/", difficulty: "medium", patternTag: "binary-search-answer", triggerHint: "Smallest divisor keeping a sum under a limit.", approachHint: "Same shape as Koko. feasible(d) = sum of ceil(a[i]/d) <= threshold.", estMinutes: 25, unitSlug: "dsa-bs-answer-space" },
    { slug: "lc-split-array-largest-sum", title: "Split Array Largest Sum", platform: "leetcode", url: "https://leetcode.com/problems/split-array-largest-sum/", difficulty: "hard", patternTag: "binary-search-answer", triggerHint: "Minimise the maximum subarray sum across k splits.", approachHint: "Identical to allocate-books and painter's partition. feasible(limit) counts greedy splits; lo = max(a), hi = sum(a).", estMinutes: 40, unitSlug: "dsa-bs-answer-space" },
    { slug: "lc-search-2d-matrix", title: "Search a 2D Matrix", platform: "leetcode", url: "https://leetcode.com/problems/search-a-2d-matrix/", difficulty: "medium", patternTag: "binary-search-2d", triggerHint: "Fully sorted matrix — rows chain end to end.", approachHint: "Treat it as one flat array of length m*n; map idx to (idx/n, idx%n).", estMinutes: 20, unitSlug: "dsa-bs-matrix" },
    { slug: "lc-search-2d-matrix-ii", title: "Search a 2D Matrix II", platform: "leetcode", url: "https://leetcode.com/problems/search-a-2d-matrix-ii/", difficulty: "medium", patternTag: "binary-search-2d", triggerHint: "Rows and columns sorted, but rows do not chain — flattening is invalid.", approachHint: "Start top-right. Too big, move left; too small, move down. O(m+n).", estMinutes: 25, unitSlug: "dsa-bs-matrix" },
    { slug: "lc-median-two-sorted", title: "Median of Two Sorted Arrays", platform: "leetcode", url: "https://leetcode.com/problems/median-of-two-sorted-arrays/", difficulty: "hard", patternTag: "binary-search", triggerHint: "O(log(m+n)) demanded across two sorted arrays.", approachHint: "Binary search the partition point of the shorter array so that left halves total half the elements and maxLeft <= minRight. Stretch goal — attempt it, do not grind it.", estMinutes: 50, isMust: false, unitSlug: "dsa-bs-answer-space" },
    { slug: "gfg-aggressive-cows", title: "Aggressive Cows", platform: "gfg", url: "https://www.geeksforgeeks.org/problems/aggressive-cows/1", difficulty: "medium", patternTag: "binary-search-answer", triggerHint: "Maximise the minimum distance — the mirror image of the minimise-maximum family.", approachHint: "Sort, then binary search the distance. feasible(d) greedily places cows at least d apart and checks the count. Note the flipped bound update.", estMinutes: 35, unitSlug: "dsa-bs-answer-space" },
  ],
};
