import type { Module } from "@/content/types";

export const arraysSorting: Module = {
  slug: "dsa-arrays-sorting",
  trackSlug: "dsa",
  phaseSlug: "foundations",
  order: 2,
  title: "Sorting & array patterns",
  summary:
    "The patterns that recur for the rest of the sheet: two pointers, prefix sums, Kadane's, partitioning. Write the sorts from scratch once — being able to code merge sort on a whiteboard is still asked.",
  prereqSlugs: ["dsa-cpp-stl"],
  units: [
    {
      slug: "dsa-arrays-sorts-from-scratch",
      title: "Merge sort & quick sort, written by hand",
      objective:
        "Code merge sort and quick sort from a blank file, and state each one's complexity and stability.",
      estMinutes: 90,
      conceptMd: `You will almost never implement these in a real job. You will be asked to write one on a whiteboard, so write each once, properly, from nothing.

**Merge sort** — divide in half, sort each half, merge. Always O(n log n), **stable**, needs O(n) extra space. The merge step is the part people fumble: two indices walking two sorted runs into a third buffer.

**Quick sort** — pick a pivot, partition, recurse on both sides. O(n log n) average but **O(n²) worst case** when the pivot is consistently bad (already-sorted input with a first-element pivot). In-place, not stable. Randomising the pivot is the standard fix, and "when does quicksort degrade?" is a common follow-up.

Know why \`std::sort\` is introsort: quicksort until the recursion gets too deep, then heapsort to guarantee the bound.`,
      resources: [
        {
          title: "Striver A2Z — Step 2: sorting techniques",
          url: "https://takeuforward.org/sorting/merge-sort-algorithm/",
          kind: "do",
          minutes: 60,
          whyThisOne: "Walks the merge step index by index, which is exactly where hand-written merge sort breaks.",
          isPrimary: true,
        },
        {
          title: "VisuAlgo — sorting visualiser",
          url: "https://visualgo.net/en/sorting",
          kind: "do",
          minutes: 15,
          whyThisOne: "Watch quicksort degrade on sorted input once and you will never forget the worst case.",
        },
      ],
    },
    {
      slug: "dsa-arrays-traversal",
      title: "Single-pass traversal patterns",
      objective:
        "Solve largest / second-largest / move-zeros / rotate in one pass, without a second sort.",
      estMinutes: 60,
      conceptMd: `The habit to build: **can I answer this in one pass with a couple of variables?** Sorting to find a maximum is the beginner tell.

Second largest is the canonical trap. Sorting is O(n log n); a single pass with two variables is O(n). The edge case that catches people is duplicates — \`[5,5,4]\` should give 4, so update \`second\` only when the candidate is strictly less than \`first\`.

Rotation by k has three approaches worth knowing: extra array O(n) space; one-by-one shifting O(n·k); and the **reversal trick** — reverse the whole array, reverse the first k, reverse the rest — which is O(n) time and O(1) space. That last one is what they want.`,
      resources: [
        {
          title: "Striver A2Z — Step 3.1: arrays easy",
          url: "https://takeuforward.org/arrays/find-the-largest-element-in-an-array/",
          kind: "do",
          minutes: 50,
          whyThisOne: "The easy tier exists to build speed. Move through it fast; do not linger.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-arrays-kadane",
      title: "Kadane's algorithm & running state",
      objective:
        "Derive Kadane's rather than memorising it, and adapt it to return the subarray itself.",
      estMinutes: 60,
      conceptMd: `Kadane's is one line of insight: **a running sum that has gone negative can never help a future subarray, so drop it and start fresh.**

\`\`\`cpp
long long best = LLONG_MIN, cur = 0;
for (int x : a) { cur += x; best = max(best, cur); if (cur < 0) cur = 0; }
\`\`\`

Two follow-ups you should be ready for. **All-negative input**: with \`best\` initialised to \`LLONG_MIN\` and the max taken *before* the reset, it correctly returns the least-negative element. **Return the subarray, not the sum**: track a start index that moves whenever you reset, and record start/end when \`best\` improves.

The same running-state shape appears in the stock-buying problems — carry the minimum seen so far and maximise the difference.`,
      resources: [
        {
          title: "Striver — Kadane's algorithm",
          url: "https://takeuforward.org/data-structure/kadanes-algorithm-maximum-subarray-sum-in-an-array/",
          kind: "watch",
          minutes: 25,
          whyThisOne: "Derives it from brute force in stages, so you can reconstruct it under pressure.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-arrays-partitioning",
      title: "Partitioning & the Dutch national flag",
      objective:
        "Partition an array around a pivot in place, and solve three-way sorting in a single pass.",
      estMinutes: 60,
      conceptMd: `Dutch national flag sorts three categories in one pass with three pointers — \`low\`, \`mid\`, \`high\` — and one invariant:

- everything before \`low\` is category 0
- everything from \`low\` to \`mid-1\` is category 1
- everything after \`high\` is category 2

Then: if \`a[mid] == 0\` swap with \`low\` and advance **both**; if \`== 1\` just advance \`mid\`; if \`== 2\` swap with \`high\` and decrement \`high\` **without advancing mid** — because the value swapped in from the back has not been examined yet. That last asymmetry is the whole problem, and it is where nearly everyone gets it wrong first time.

This is also quicksort's partition step, so the two units reinforce each other.`,
      resources: [
        {
          title: "Striver — sort an array of 0s, 1s and 2s",
          url: "https://takeuforward.org/data-structure/sort-an-array-of-0s-1s-and-2s/",
          kind: "watch",
          minutes: 25,
          whyThisOne: "Spells out the invariant, which is the only way this stays memorable.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-arrays-two-pointers",
      title: "Two pointers",
      objective:
        "Recognise when sorted input lets two converging pointers replace a nested loop.",
      estMinutes: 75,
      conceptMd: `The trigger: **the array is sorted (or you can sort it), and you are looking for a pair or a window satisfying a condition.**

Converging pointers work because sortedness makes the move decision unambiguous — if the current pair's sum is too small, only moving \`left\` right can increase it. That turns O(n²) into O(n).

Two shapes to keep separate:
- **Opposite ends**, converging — pair sums, container with most water, valid palindrome.
- **Same direction**, one fast one slow — remove duplicates in place, move zeros, cycle detection later in linked lists.

3Sum is the composition: sort, fix one element, then run a converging two-pointer on the rest. The fiddly part is skipping duplicates at all three levels, and interviewers do check.`,
      resources: [
        {
          title: "Striver A2Z — Step 3.3: arrays medium",
          url: "https://takeuforward.org/data-structure/2-sum-check-if-a-pair-with-given-sum-exists-in-array/",
          kind: "do",
          minutes: 60,
          whyThisOne: "Covers the family in sequence so the shared shape becomes obvious.",
          isPrimary: true,
        },
        {
          title: "NeetCode — Two pointers",
          url: "https://neetcode.io/courses/advanced-algorithms/3",
          kind: "watch",
          minutes: 20,
          whyThisOne: "Your second explanation when the duplicate-skipping in 3Sum stops making sense.",
        },
      ],
    },
    {
      slug: "dsa-arrays-prefix-sums",
      title: "Prefix sums & hashing on running totals",
      objective:
        "Answer range-sum queries in O(1) after O(n) preprocessing, and count subarrays with a target sum.",
      estMinutes: 75,
      conceptMd: `\`prefix[i]\` is the sum of everything before index i. Then any range sum is \`prefix[r+1] - prefix[l]\` in O(1). Build it once, answer many queries — that trade is the whole idea.

The version that actually shows up: **count subarrays summing to k**. Walk once keeping a running sum, and a map of *how many times each running sum has been seen*. At each step, the number of subarrays ending here with sum k is the count of \`running - k\` already in the map.

Seed the map with \`{0: 1}\` before the loop — that accounts for subarrays starting at index 0, and forgetting it is the standard bug.

The same trick with a map of remainders solves "subarrays divisible by k", and with a running +1/−1 it solves "longest subarray of equal 0s and 1s".`,
      resources: [
        {
          title: "Striver — longest subarray with sum k",
          url: "https://takeuforward.org/data-structure/longest-subarray-with-given-sum-k/",
          kind: "watch",
          minutes: 30,
          whyThisOne: "Shows the positives-only sliding window and the general hashmap version side by side.",
          isPrimary: true,
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-remove-duplicates-sorted", title: "Remove Duplicates from Sorted Array", platform: "leetcode", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/", difficulty: "easy", patternTag: "two-pointers", triggerHint: "In-place compaction of a sorted array.", approachHint: "Slow pointer marks the write position, fast pointer scans. Write only when a[fast] differs from a[slow].", estMinutes: 15, unitSlug: "dsa-arrays-two-pointers" },
    { slug: "lc-move-zeroes", title: "Move Zeroes", platform: "leetcode", url: "https://leetcode.com/problems/move-zeroes/", difficulty: "easy", patternTag: "two-pointers", triggerHint: "Partition in place while preserving relative order.", approachHint: "Write every non-zero to a slow index, then fill the tail with zeros.", estMinutes: 15, unitSlug: "dsa-arrays-two-pointers" },
    { slug: "lc-rotate-array", title: "Rotate Array", platform: "leetcode", url: "https://leetcode.com/problems/rotate-array/", difficulty: "medium", patternTag: "array-manipulation", triggerHint: "Cyclic shift with an O(1) space requirement.", approachHint: "Reverse the whole array, then reverse the first k, then reverse the rest. Remember k %= n.", estMinutes: 20, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-max-consecutive-ones", title: "Max Consecutive Ones", platform: "leetcode", url: "https://leetcode.com/problems/max-consecutive-ones/", difficulty: "easy", patternTag: "running-state", triggerHint: "Longest run of a repeated value.", approachHint: "One counter that increments on 1 and resets on 0, tracking the max.", estMinutes: 10, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-missing-number", title: "Missing Number", platform: "leetcode", url: "https://leetcode.com/problems/missing-number/", difficulty: "easy", patternTag: "xor", triggerHint: "One value absent from an otherwise complete range.", approachHint: "Sum formula works but can overflow. XOR of all indices and all values leaves the missing one — no overflow.", estMinutes: 15, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-single-number", title: "Single Number", platform: "leetcode", url: "https://leetcode.com/problems/single-number/", difficulty: "easy", patternTag: "xor", triggerHint: "Everything pairs up except one element.", approachHint: "XOR the whole array. Pairs cancel to 0 and the loner survives.", estMinutes: 10, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-maximum-subarray", title: "Maximum Subarray", platform: "leetcode", url: "https://leetcode.com/problems/maximum-subarray/", difficulty: "medium", patternTag: "kadane", triggerHint: "Best contiguous run, values may be negative.", approachHint: "Kadane's: carry a running sum, take the max before resetting it to 0 when it goes negative.", estMinutes: 20, unitSlug: "dsa-arrays-kadane" },
    { slug: "lc-best-time-buy-sell-stock", title: "Best Time to Buy and Sell Stock", platform: "leetcode", url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/", difficulty: "easy", patternTag: "kadane", triggerHint: "Maximum forward difference in a sequence.", approachHint: "Track the minimum seen so far; at each price, the best profit is price minus that minimum.", estMinutes: 15, unitSlug: "dsa-arrays-kadane" },
    { slug: "lc-sort-colors", title: "Sort Colors", platform: "leetcode", url: "https://leetcode.com/problems/sort-colors/", difficulty: "medium", patternTag: "dutch-national-flag", triggerHint: "Three distinct categories, one pass, in place.", approachHint: "low/mid/high pointers. On a 2, swap with high and do NOT advance mid — the incoming value is unexamined.", estMinutes: 25, unitSlug: "dsa-arrays-partitioning" },
    { slug: "lc-majority-element-ii", title: "Majority Element II", platform: "leetcode", url: "https://leetcode.com/problems/majority-element-ii/", difficulty: "medium", patternTag: "boyer-moore", triggerHint: "Elements appearing more than n/3 times — so at most two can qualify.", approachHint: "Extended Boyer–Moore with two candidates and two counts, then a verification pass.", estMinutes: 30, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-next-permutation", title: "Next Permutation", platform: "leetcode", url: "https://leetcode.com/problems/next-permutation/", difficulty: "medium", patternTag: "array-manipulation", triggerHint: "The lexicographically next arrangement, in place.", approachHint: "Scan from the right for the first a[i] < a[i+1]; swap it with the rightmost value greater than it; reverse the suffix.", estMinutes: 30, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-merge-sorted-array", title: "Merge Sorted Array", platform: "leetcode", url: "https://leetcode.com/problems/merge-sorted-array/", difficulty: "easy", patternTag: "merge", triggerHint: "Merging into a buffer that already has room at the end.", approachHint: "Fill from the back. Writing forwards would clobber unread elements of the first array.", estMinutes: 20, unitSlug: "dsa-arrays-sorts-from-scratch" },
    { slug: "lc-sort-an-array", title: "Sort an Array", platform: "leetcode", url: "https://leetcode.com/problems/sort-an-array/", difficulty: "medium", patternTag: "sorting", triggerHint: "You are explicitly not allowed to call the library sort.", approachHint: "Write merge sort end to end. This is the whiteboard exercise — do it without looking.", estMinutes: 35, unitSlug: "dsa-arrays-sorts-from-scratch" },
    { slug: "lc-find-duplicate-number", title: "Find the Duplicate Number", platform: "leetcode", url: "https://leetcode.com/problems/find-the-duplicate-number/", difficulty: "medium", patternTag: "cycle-detection", triggerHint: "Read-only array, O(1) space, values in 1..n.", approachHint: "Treat values as next-pointers and run Floyd's cycle detection. The cycle entrance is the duplicate.", estMinutes: 35, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-set-matrix-zeroes", title: "Set Matrix Zeroes", platform: "leetcode", url: "https://leetcode.com/problems/set-matrix-zeroes/", difficulty: "medium", patternTag: "matrix", triggerHint: "In-place marking where writes would corrupt later reads.", approachHint: "Use row 0 and column 0 as the marker storage, with one extra flag for column 0 itself.", estMinutes: 30, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-spiral-matrix", title: "Spiral Matrix", platform: "leetcode", url: "https://leetcode.com/problems/spiral-matrix/", difficulty: "medium", patternTag: "matrix", triggerHint: "Boundary-walking traversal.", approachHint: "Four bounds — top, bottom, left, right — shrunk after each edge. Guard against re-walking a single remaining row or column.", estMinutes: 30, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-pascals-triangle", title: "Pascal's Triangle", platform: "leetcode", url: "https://leetcode.com/problems/pascals-triangle/", difficulty: "easy", patternTag: "construction", triggerHint: "Each row built from the one above.", approachHint: "Row i starts and ends with 1; the interior is the pairwise sum of the previous row.", estMinutes: 15, unitSlug: "dsa-arrays-traversal" },
    { slug: "lc-merge-intervals", title: "Merge Intervals", platform: "leetcode", url: "https://leetcode.com/problems/merge-intervals/", difficulty: "medium", patternTag: "sorting", triggerHint: "Overlapping ranges to be collapsed.", approachHint: "Sort by start. Extend the last interval's end when the next start is <= it, otherwise push a new one.", estMinutes: 25, unitSlug: "dsa-arrays-sorts-from-scratch" },
    { slug: "lc-subarray-sum-equals-k", title: "Subarray Sum Equals K", platform: "leetcode", url: "https://leetcode.com/problems/subarray-sum-equals-k/", difficulty: "medium", patternTag: "prefix-sum-hashing", triggerHint: "Count subarrays with an exact sum, negatives allowed so sliding window fails.", approachHint: "Running sum plus a count map of sums seen. Add count[running - k]. Seed the map with {0: 1}.", estMinutes: 30, unitSlug: "dsa-arrays-prefix-sums" },
    { slug: "lc-two-sum-ii-sorted", title: "Two Sum II — Input Array Is Sorted", platform: "leetcode", url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/", difficulty: "medium", patternTag: "two-pointers", triggerHint: "Sorted input and a pair sum — the classic converging-pointer trigger.", approachHint: "Pointers at both ends. Sum too small, move left in; too large, move right in.", estMinutes: 15, unitSlug: "dsa-arrays-two-pointers" },
    { slug: "lc-container-with-most-water", title: "Container With Most Water", platform: "leetcode", url: "https://leetcode.com/problems/container-with-most-water/", difficulty: "medium", patternTag: "two-pointers", triggerHint: "Maximise an area defined by two indices.", approachHint: "Converge from the ends, always moving the shorter wall — moving the taller one can never help.", estMinutes: 25, unitSlug: "dsa-arrays-two-pointers" },
    { slug: "lc-3sum", title: "3Sum", platform: "leetcode", url: "https://leetcode.com/problems/3sum/", difficulty: "medium", patternTag: "two-pointers", triggerHint: "Triplets summing to a target, duplicates must not repeat in the output.", approachHint: "Sort, fix i, two-pointer the remainder. Skip duplicates at i and after each successful pair.", estMinutes: 40, unitSlug: "dsa-arrays-two-pointers" },
    { slug: "lc-longest-consecutive-sequence", title: "Longest Consecutive Sequence", platform: "leetcode", url: "https://leetcode.com/problems/longest-consecutive-sequence/", difficulty: "medium", patternTag: "hashing", triggerHint: "Consecutive run in unsorted data with an O(n) requirement.", approachHint: "Put everything in a set; start counting only at x where x-1 is absent. That guard is what keeps it O(n).", estMinutes: 30, unitSlug: "dsa-arrays-prefix-sums" },
  ],
};
