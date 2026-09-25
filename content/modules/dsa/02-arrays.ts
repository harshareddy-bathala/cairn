import type { Module } from "@/content/types";

export const arraysSorting: Module = {
  slug: "dsa-arrays-sorting",
  trackSlug: "dsa",
  phaseSlug: "foundations",
  order: 2,
  title: "Sorting & array patterns",
  summary:
    "The patterns that recur for the rest of the DSA track: two pointers, prefix sums, Kadane's, partitioning. Write the sorts from scratch once — being able to code merge sort on a whiteboard is still asked.",
  prereqSlugs: ["dsa-cpp-stl"],
  units: [
    {
      slug: "dsa-arrays-sorts-from-scratch",
      title: "Merge sort & quick sort, written by hand",
      objective:
        "Code merge sort and quick sort from a blank file, and state each one's complexity and stability.",
      estMinutes: 90,
      primer: `Sorting means putting items in order. \`std::sort\` does it for you, but interviews still ask you to write a sort by hand, and two of the classic ones teach ideas used everywhere else.

**Merge sort** splits the array in half, sorts each half (by calling itself — recursion from the last module), then *merges* the two sorted halves by repeatedly taking the smaller front item. It is always O(n log n).

**Quick sort** picks one value, the *pivot*, moves everything smaller to its left and everything bigger to its right, then sorts each side the same way. It is usually O(n log n), but a bad pivot choice makes it O(n²).

**You need already:** recursion (base case plus a smaller call) and vectors.`,
      conceptMd: `You will almost never implement these in a real job. You will be asked to write one on a whiteboard, so write each once, properly, from nothing.

**Merge sort** — divide in half, sort each half, merge. Always O(n log n), **stable**, needs O(n) extra space. The merge step is the part people fumble: two indices walking two sorted runs into a third buffer.

**Quick sort** — pick a pivot, partition, recurse on both sides. O(n log n) average but **O(n²) worst case** when the pivot is consistently bad (already-sorted input with a first-element pivot). In-place, not stable. Randomising the pivot is the standard fix, and "when does quicksort degrade?" is a common follow-up.

Know why \`std::sort\` is introsort: quicksort until the recursion gets too deep, then heapsort to guarantee the bound.`,
      interviewAngle:
        "`Write merge sort on the board` is still asked, and `when does quicksort degrade?` is " +
        "the follow-up that separates people who memorised it from people who understand the " +
        "pivot.",
      pitfalls: [
        "Fumbling the merge step. Two indices walk two sorted runs into a third buffer, and " +
          "the tail of whichever run is left over still has to be copied.",
        "Claiming quicksort is O(n log n) full stop. It is O(n^2) on a bad pivot — " +
          "already-sorted input with a first-element pivot is the standard example.",
        "Calling quicksort stable. It is not; merge sort is.",
      ],
      recall: [
        {
          front:
            "Merge sort and quick sort: which is stable, which is in place, and what is each " +
            "one's worst case?",
          back:
            "Merge sort is stable, needs O(n) extra space, and is O(n log n) always. Quick sort " +
            "is not stable, sorts in place, and is O(n log n) average but O(n^2) worst case.",
        },
        {
          front: "What input makes quicksort degrade to O(n^2), and what is the standard fix?",
          back:
            "Input where the pivot is consistently extreme — classically an already-sorted " +
            "array with a first-element pivot, giving partitions of size 0 and n-1. Randomise " +
            "the pivot (or use median-of-three).",
        },
        {
          front: "Why is `std::sort` called introsort?",
          back:
            "It runs quicksort until the recursion depth suggests a bad pivot sequence, then " +
            "switches to heapsort — which guarantees the O(n log n) bound that quicksort alone " +
            "cannot.",
        },
      ],
      resources: [
        {
          title: "Striver — Merge sort",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/merge-sort-algorithm",
          kind: "do",
          minutes: 40,
          whyThisOne:
            "Walks the merge step index by index, which is exactly where hand-written merge sort breaks.",
          steps: [
            "Watch the video at the top of the page, or read **Approach → Algorithm** if you prefer text.",
            "Follow the **Dry Run** on paper with the page's example array.",
            "Close the page and write merge sort from a blank file; run it on `[5, 2, 4, 1, 3]`.",
            "Answer the **Interview follow-up Questions** out loud (stability, extra space).",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Quick sort",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/quick-sort-algorithm",
          kind: "do",
          minutes: 40,
          whyThisOne:
            "The same page layout for quick sort: partitioning by hand, then the worst case and how to avoid it.",
          steps: [
            "Same routine: **Algorithm**, **Dry Run** on paper, write it cold, then the follow-up *How can worst-case time be reduced?*",
          ],
        },
        {
          title: "VisuAlgo — sorting visualiser",
          url: "https://visualgo.net/en/sorting",
          kind: "do",
          minutes: 10,
          whyThisOne:
            "Watch quick sort degrade on already-sorted input once and you will never forget the worst case.",
        },
      ],
    },
    {
      slug: "dsa-arrays-traversal",
      title: "Single-pass traversal patterns",
      objective:
        "Solve largest / second-largest / move-zeros / rotate in one pass, without a second sort.",
      estMinutes: 60,
      primer: `Many array questions look like they need sorting or two nested loops, but can be answered by walking the array **once** while remembering a few values.

For example, the largest element: keep a variable \`best\`, look at each element, and update \`best\` whenever you see something bigger. One pass, O(n), no sorting. The second largest is the same idea with two variables — and it has a trap with repeated values that this unit is about.

Rotating an array (shifting every element k places left) has a neat one-pass trick too: reverse parts of the array.

**You need already:** loops over a vector, and Big O.`,
      conceptMd: `The habit to build: **can I answer this in one pass with a couple of variables?** Sorting to find a maximum is the beginner tell.

Second largest is the canonical trap. Sorting is O(n log n); a single pass with two variables is O(n). The edge case that catches people is duplicates — \`[5,5,4]\` should give 4, so update \`second\` only when the candidate is strictly less than \`first\`.

Rotation by k has three approaches worth knowing: extra array O(n) space; one-by-one shifting O(n·k); and the **reversal trick** — reverse the whole array, reverse the first k, reverse the rest — which is O(n) time and O(1) space. That last one is what they want.`,
      interviewAngle:
        "Sorting to find a maximum is the beginner tell. The habit being tested is asking `can " +
        "one pass and two variables do this?` before reaching for a sort.",
      pitfalls: [
        "Second largest on `[5, 5, 4]`. Update `second` only when the candidate is strictly " +
          "less than `first`, or duplicates give you 5.",
        "Rotating by k without `k %= n`. When k exceeds n the shift runs off the end.",
        "Reaching for the sum formula on `missing number` when the range is large — it " +
          "overflows. XOR does not.",
      ],
      recall: [
        {
          front: "Rotate an array by k in O(n) time and O(1) space. What is the trick?",
          back:
            "Reverse the whole array, then reverse the first k, then reverse the rest. Remember " +
            "`k %= n` first.",
        },
        {
          front: "Why does second-largest break on `[5, 5, 4]` if written carelessly?",
          back:
            "Because a candidate equal to the current largest gets promoted into `second`. The " +
            "update has to be on strictly less than `first`.",
        },
        {
          front: "Two ways to find the one missing number in 0..n, and why one is safer.",
          back:
            "Sum of 0..n minus the actual sum, or XOR of all indices with all values. XOR " +
            "cannot overflow, so it is the safe answer for large n.",
        },
      ],
      resources: [
        {
          title: "Striver — Second largest element",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/second-largest-element",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "The canonical one-pass problem, shown as brute force, better and optimal so you see why the single pass wins.",
          steps: [
            "Read **Problem Statement** and the three examples; try it yourself first.",
            "Read **Brute Force**, **Better** and **Optimal** in order, following each **Dry Run**.",
            "Write the optimal version cold and test it on `[5, 5, 4]` — it must print 4.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Left rotate an array by k places",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/left-rotate-array-by-k-places",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "The three-reversal trick, with the reason it works.",
          steps: [
            "Jump to **Optimal Approach**, dry-run it on paper, then answer *Why do the three reversals produce the required rotation?*",
          ],
        },
        {
          title: "Striver — Move zeros to the end",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/move-zeros-to-the-end-of-an-array",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "A second one-pass drill, and the first taste of two pointers moving in the same direction.",
        },
      ],
    },
    {
      slug: "dsa-arrays-kadane",
      title: "Kadane's algorithm & running state",
      objective:
        "Derive Kadane's rather than memorising it, and adapt it to return the subarray itself.",
      estMinutes: 60,
      primer: `A **subarray** is a continuous stretch of an array: in \`[2, -3, 4, -1, 2]\`, \`[4, -1, 2]\` is one. The classic question: which subarray has the **largest sum**?

Checking every subarray is O(n²). **Kadane's algorithm** does it in one pass with one idea: walk left to right keeping a running sum; if that sum ever drops below zero, it can only drag down whatever comes next, so throw it away and start again from zero. Keep track of the best sum you have seen.

The same "carry one number forward and update it" shape solves the stock problem: remember the lowest price so far, and at each day check what selling today would earn.

**You need already:** one-pass traversal from the last unit.`,
      conceptMd: `Kadane's is one line of insight: **a running sum that has gone negative can never help a future subarray, so drop it and start fresh.**

\`\`\`cpp
long long best = LLONG_MIN, cur = 0;
for (int x : a) { cur += x; best = max(best, cur); if (cur < 0) cur = 0; }
\`\`\`

Two follow-ups you should be ready for. **All-negative input**: with \`best\` initialised to \`LLONG_MIN\` and the max taken *before* the reset, it correctly returns the least-negative element. **Return the subarray, not the sum**: track a start index that moves whenever you reset, and record start/end when \`best\` improves.

The same running-state shape appears in the stock-buying problems — carry the minimum seen so far and maximise the difference.`,
      interviewAngle:
        "Expect `now return the subarray, not just the sum` and `what if every number is " +
        "negative?` — the two follow-ups the one-liner does not answer on its own.",
      pitfalls: [
        "Initialising `best` to 0. On an all-negative array that returns 0, which is not a " +
          "subarray of anything.",
        "Resetting `cur` to 0 before taking the max. The max has to be taken first, or the " +
          "least-negative element is never seen.",
        "Summing into an `int` when the values and length allow the total to pass 2e9.",
      ],
      recall: [
        {
          front: "State Kadane's central insight in one sentence.",
          back:
            "A running sum that has gone negative can never help any future subarray, so drop " +
            "it and start fresh from zero.",
        },
        {
          front: "Why does Kadane's still work when every element is negative?",
          back:
            "Because `best` starts at negative infinity and the max is taken before the reset, " +
            "so the least-negative single element is recorded as the answer.",
        },
        {
          front: "How do you extend Kadane's to return the subarray itself?",
          back:
            "Keep a start index that moves to the next position whenever `cur` resets, and " +
            "record start and end whenever `best` improves.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Maximum subarray sum (Kadane's algorithm)",
          url: "https://www.geeksforgeeks.org/dsa/largest-sum-contiguous-subarray/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Starts from checking every subarray and arrives at Kadane's, with a step-by-step illustration.",
          steps: [
            "Read **[Naive Approach]** to see the O(n²) starting point.",
            "Read **[Expected Approach] Using Kadane's Algorithm** and step through its illustration.",
            "Write it yourself for `[-2, -3, 4, -1, -2, 1, 5, -3]` (answer 7), then for an all-negative array.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Best time to buy and sell stock",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/best-time-to-buy-and-sell-stock",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "The same running-state idea on a different problem — the transfer is the lesson.",
          steps: [
            "Try it first, then read **Optimal Approach** and its **Dry Run**.",
          ],
        },
        {
          title: "cp-algorithms — the subarray with the maximum sum",
          url: "https://cp-algorithms.com/others/maximum_average_segment.html",
          kind: "read",
          whyThisOne:
            "Optional, for later: derives Kadane's from prefix sums, so you can rebuild it instead of reciting it.",
        },
      ],
    },
    {
      slug: "dsa-arrays-partitioning",
      title: "Partitioning & the Dutch national flag",
      objective:
        "Partition an array around a pivot in place, and solve three-way sorting in a single pass.",
      estMinutes: 60,
      primer: `**Partitioning** means rearranging an array into groups — say, all the small values first and all the big ones after — *in place*, without a second array.

The classic version is an array of only 0s, 1s and 2s that must come out sorted. Counting them and rewriting works, but the interview answer is one pass with three markers: everything left of \`low\` is 0, everything right of \`high\` is 2, and \`mid\` walks through the unknown middle, swapping each value toward the side it belongs to. This is called the **Dutch national flag** algorithm (three colours, three bands).

It is also the heart of quick sort's partition step from the first unit.

**You need already:** swapping two elements, and loops with more than one index.`,
      conceptMd: `Dutch national flag sorts three categories in one pass with three pointers — \`low\`, \`mid\`, \`high\` — and one invariant:

- everything before \`low\` is category 0
- everything from \`low\` to \`mid-1\` is category 1
- everything after \`high\` is category 2

Then: if \`a[mid] == 0\` swap with \`low\` and advance **both**; if \`== 1\` just advance \`mid\`; if \`== 2\` swap with \`high\` and decrement \`high\` **without advancing mid** — because the value swapped in from the back has not been examined yet. That last asymmetry is the whole problem, and it is where nearly everyone gets it wrong first time.

This is also quicksort's partition step, so the two units reinforce each other.`,
      interviewAngle:
        "Sort Colors is asked precisely because the third branch is counter-intuitive. Being " +
        "able to state the invariant before you code it is the whole answer.",
      pitfalls: [
        "Advancing `mid` after swapping with `high`. The value that came from the back has " +
          "not been examined yet — this is the mistake nearly everyone makes first.",
        "Not advancing both `low` and `mid` after a swap on category 0. The value swapped in " +
          "from `low` is already known to be a 1.",
        "Writing the loop as `mid < high` instead of `mid <= high`, which leaves the final " +
          "element unexamined.",
      ],
      recall: [
        {
          front: "State the Dutch national flag invariant over `low`, `mid` and `high`.",
          back:
            "Everything before `low` is category 0, everything from `low` to `mid - 1` is " +
            "category 1, and everything after `high` is category 2. The region from `mid` to " +
            "`high` is unexamined.",
        },
        {
          front:
            "On `a[mid] == 2` you swap with `high` and decrement `high`. Why must `mid` stay " +
            "put?",
          back:
            "The value swapped in from the back has never been examined, so advancing `mid` " +
            "would skip it entirely.",
        },
        {
          front: "What other algorithm is this the same code as?",
          back: "Quicksort's partition step — which is why the two units reinforce each other.",
        },
      ],
      resources: [
        {
          title: "Striver — Sort an array of 0s, 1s and 2s",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/sort-array-0s-1s-2s",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "Goes from counting to the three-pointer version and spells out the rule that keeps it correct.",
          steps: [
            "Read **Brute Force** (sorting) and **Optimal Approach 1** (counting) quickly.",
            "Read **Optimal Approach 2** — the Dutch national flag — and do its **Dry Run** on paper.",
            "Answer *Why does the current position not move after swapping with the right boundary?* before reading the answer.",
          ],
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
      primer: `**Two pointers** means walking an array with two indices at once instead of one index inside another loop.

Example: in a *sorted* array, find two numbers that add up to a target. Put one pointer at the start and one at the end. If their sum is too small, move the left one right (to a bigger number); if too big, move the right one left. Each step rules out a whole row of pairs, so it takes O(n) instead of O(n²).

There are two common shapes: pointers starting at **opposite ends** and moving toward each other (pair sums, palindromes), and pointers moving **in the same direction** at different speeds (removing duplicates in place).

**You need already:** sorted arrays, one-pass traversal.`,
      conceptMd: `The trigger: **the array is sorted (or you can sort it), and you are looking for a pair or a window satisfying a condition.**

Converging pointers work because sortedness makes the move decision unambiguous — if the current pair's sum is too small, only moving \`left\` right can increase it. That turns O(n²) into O(n).

Two shapes to keep separate:
- **Opposite ends**, converging — pair sums, container with most water, valid palindrome.
- **Same direction**, one fast one slow — remove duplicates in place, move zeros, cycle detection later in linked lists.

3Sum is the composition: sort, fix one element, then run a converging two-pointer on the rest. The fiddly part is skipping duplicates at all three levels, and interviewers do check.`,
      interviewAngle:
        "3Sum is the composition question, and the duplicate-skipping is what gets checked. Say " +
        "`sorted input plus a pair condition` out loud — naming the trigger is half the signal.",
      pitfalls: [
        "Reaching for two pointers on unsorted input. Sortedness is what makes the move " +
          "decision unambiguous; without it, moving a pointer proves nothing.",
        "In 3Sum, skipping duplicates at only one of the three levels. The fixed element and " +
          "both pointers all need it.",
        "In container-with-most-water, moving the taller wall. The area is bounded by the " +
          "shorter one, so only moving the shorter one can help.",
      ],
      recall: [
        {
          front: "What is the trigger that tells you to reach for converging two pointers?",
          back:
            "The array is sorted, or can be sorted, and you are looking for a pair or window " +
            "satisfying a condition — which turns a nested loop into a single pass.",
        },
        {
          front: "Name the two two-pointer shapes and one problem for each.",
          back:
            "Opposite ends converging (pair sums, container with most water, valid palindrome), " +
            "and same direction fast/slow (remove duplicates in place, move zeros, cycle " +
            "detection).",
        },
        {
          front: "In container with most water, why do you always move the shorter wall?",
          back:
            "The area is limited by the shorter wall, so moving the taller one can only keep " +
            "the same height with a narrower width — it can never improve the answer.",
        },
        {
          front:
            "Why do two pointers fail on `count subarrays with sum k` when negatives are " +
            "allowed?",
          back:
            "A sliding window relies on the sum growing as the window grows. Negative values " +
            "break that monotonicity, so you need the prefix-sum plus hashmap approach instead.",
        },
      ],
      resources: [
        {
          title: "Striver — Two pointer: introduction",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/two-pointer-introduction",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Explains why the technique works before any hard problem, then shows each pointer pattern on a small example.",
          steps: [
            "Read **What Problem Does the Two Pointer Technique Solve?** and **The Core Requirement: Safe Elimination**.",
            "Read **Main Two Pointer Patterns** — opposite-direction and same-direction.",
            "Work **Checking Pair Sum in a Sorted Array** and **Reversing an Array** by hand.",
            "Read **Common Mistakes**.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Two sum II (sorted input)",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/two-sum-ii-input-array-is-sorted",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "The first problem to solve with converging pointers on your own.",
        },
        {
          title: "Striver — 3Sum",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/3sum",
          kind: "do",
          minutes: 40,
          whyThisOne:
            "Two pointers inside a loop, plus skipping duplicates — the part that trips everyone.",
          steps: [
            "Try it, then read each approach; spend your time on how duplicate triplets are skipped.",
          ],
        },
      ],
    },
    {
      slug: "dsa-arrays-prefix-sums",
      title: "Prefix sums & hashing on running totals",
      objective:
        "Answer range-sum queries in O(1) after O(n) preprocessing, and count subarrays with a target sum.",
      estMinutes: 75,
      primer: `Suppose you are asked many times: *what is the sum of the array from index l to r?* Adding the values each time is slow. Instead, build one helper array once: \`prefix[i]\` = the sum of the first i elements. Then any range sum is one subtraction: \`prefix[r+1] - prefix[l]\`.

That is a **prefix sum**: O(n) work once, then each question answered in O(1).

The harder use in this unit: *count the subarrays that add up to k.* Walk the array keeping a running total, and use a map to remember how many times each running total has appeared. If the total now is \`sum\`, every earlier point where the total was \`sum - k\` starts a subarray summing to k.

**You need already:** maps from the containers unit, and one-pass traversal.`,
      conceptMd: `\`prefix[i]\` is the sum of everything before index i. Then any range sum is \`prefix[r+1] - prefix[l]\` in O(1). Build it once, answer many queries — that trade is the whole idea.

The version that actually shows up: **count subarrays summing to k**. Walk once keeping a running sum, and a map of *how many times each running sum has been seen*. At each step, the number of subarrays ending here with sum k is the count of \`running - k\` already in the map.

Seed the map with \`{0: 1}\` before the loop — that accounts for subarrays starting at index 0, and forgetting it is the standard bug.

The same trick with a map of remainders solves "subarrays divisible by k", and with a running +1/−1 it solves "longest subarray of equal 0s and 1s".`,
      interviewAngle:
        "Subarray Sum Equals K is the one that gets asked, and the `{0: 1}` seed is the line " +
        "interviewers watch for. Being able to say why negatives rule out a sliding window is " +
        "the framing they want.",
      pitfalls: [
        "Forgetting to seed the count map with `{0: 1}`. Subarrays starting at index 0 are " +
          "then never counted — the standard bug.",
        "Storing whether a running sum was seen instead of how many times. You are counting " +
          "subarrays, so you need the count.",
        "Using a sliding window when the array can contain negatives. The window's sum is no " +
          "longer monotonic in its width.",
      ],
      recall: [
        {
          front:
            "Given `prefix[i]` = sum of everything before index i, what is the sum of the range " +
            "[l, r]?",
          back: "`prefix[r + 1] - prefix[l]`, in O(1) after O(n) preprocessing.",
        },
        {
          front:
            "In `count subarrays summing to k`, what do you look up in the map at each step, " +
            "and why?",
          back:
            "The count of `running - k`. Every earlier position with that running sum starts a " +
            "subarray that ends here with sum exactly k.",
        },
        {
          front: "Why must the count map be seeded with `{0: 1}`?",
          back:
            "It represents the empty prefix, so a subarray that starts at index 0 and sums to k " +
            "is counted. Without it every such subarray is missed.",
        },
        {
          front: "Name two other problems the same running-sum-plus-map trick solves.",
          back:
            "Subarrays divisible by k (map the remainder instead of the sum), and longest " +
            "subarray with equal 0s and 1s (map a running +1/-1 total).",
        },
      ],
      resources: [
        {
          title: "Striver — Prefix sum: introduction (range sum query)",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/prefix-sum-introduction-range-sum-query",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Builds the prefix array from scratch and explains why the range formula works, including the edge cases.",
          steps: [
            "Read **Why Is Prefix Sum Needed?** and **Constructing the Prefix Sum Array**.",
            "Read **Answering a Range Sum Query** and **Why Does the Range Sum Formula Work?**; check the formula on the example by hand.",
            "Read **Query Beginning at Index 0** — the case that causes off-by-one bugs.",
            "Skip **Two-Dimensional Prefix Sum** for now.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Subarray sum equals k",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/subarray-sum-equals-k",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "Prefix sums plus a hash map, built up from the brute force — including why the map has to start with {0: 1}.",
          steps: [
            "Read **Brute Force** and **Better**, then spend most of the time on **Optimal Approach** and its **Dry Run**.",
          ],
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
