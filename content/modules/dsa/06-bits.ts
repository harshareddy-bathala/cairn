import type { Module } from "@/content/types";

export const bitManipulation: Module = {
  slug: "dsa-bit-manipulation",
  trackSlug: "dsa",
  phaseSlug: "foundations",
  order: 6,
  title: "Bit manipulation",
  summary:
    "A small module with an outsized return. Two days here and a whole class of problems becomes trivial — plus it is the substrate for bitmask DP later.",
  prereqSlugs: ["dsa-cpp-stl"],
  units: [
    {
      slug: "dsa-bits-operations",
      title: "The five operations & the standard idioms",
      objective:
        "Set, clear, toggle and test the ith bit from memory, and count set bits three ways.",
      estMinutes: 60,
      primer: `Computers store every integer in **binary** — base 2, only 0s and 1s. 13 is \`1101\`: 8 + 4 + 0 + 1. Each 0 or 1 is a **bit**, numbered from the right starting at 0.

**Bitwise operators** work on those bits directly, one position at a time: \`&\` (AND — 1 only if both are 1), \`|\` (OR — 1 if either is), \`^\` (XOR — 1 if they differ), \`~\` (NOT — flip every bit), and the shifts \`<<\` and \`>>\`, which slide the bits left or right. \`1 << i\` is a number with only bit i set.

With those you can check, set, clear or flip any single bit in one step — faster and shorter than arithmetic, and the basis of a whole family of interview tricks.

**You need already:** nothing beyond integers. Converting a few small numbers to binary by hand helps.`,
      conceptMd: `Six idioms carry almost everything:

\`\`\`cpp
n & (1 << i)          // test bit i
n | (1 << i)          // set bit i
n & ~(1 << i)         // clear bit i
n ^ (1 << i)          // toggle bit i
n & (n - 1)           // clear the LOWEST set bit
n & (-n)              // isolate the lowest set bit
\`\`\`

\`n & (n - 1)\` is the one that pays off. Subtracting 1 flips the lowest set bit to 0 and everything below it to 1; ANDing therefore removes exactly that bit. So **counting set bits** is a loop that runs once per set bit rather than once per bit position — Brian Kernighan's algorithm. And \`n > 0 && (n & (n - 1)) == 0\` tests for a power of two — the \`n > 0\` is not decoration: 0 has no set bits and passes the AND, and for \`INT_MIN\` the \`n - 1\` overflows.

Two traps: shifting by the type's width or more is undefined behaviour, and \`1 << 31\` lands in the sign bit of an \`int\` — it comes out as \`INT_MIN\`, a negative mask (and in C, or C++ before C++14, it is undefined outright). Use \`1LL << i\` when i can reach 31 or more.`,
      interviewAngle:
        "Rarely a whole question, frequently the follow-up that turns an O(n) answer into an " +
        "O(1) one. `n & (n - 1)` is the single most useful thing in this module.",
      pitfalls: [
        "Writing `1 << i` when i can reach 31 or more. At 31 it lands in the sign bit and " +
          "comes out negative; past that it is undefined. Use `1LL << i`.",
        "Shifting by more than the type's width. That is undefined behaviour, not a zero.",
        "Counting set bits by looping over all 32 positions when the input is sparse. " +
          "Kernighan's loop runs once per set bit.",
      ],
      recall: [
        {
          front: "What does `n & (n - 1)` do, and why?",
          back:
            "It clears the lowest set bit. Subtracting 1 flips that bit to 0 and sets " +
            "everything below it to 1, so the AND removes exactly that one bit.",
        },
        {
          front: "How do you test whether n is a power of two in O(1)?",
          back:
            "`n > 0 && (n & (n - 1)) == 0` — a power of two has exactly one set bit, so " +
            "clearing the lowest one leaves zero.",
        },
        {
          front: "Write the four single-bit idioms for bit i.",
          back:
            "Test `n & (1 << i)`, set `n | (1 << i)`, clear `n & ~(1 << i)`, toggle `n ^ (1 << " +
            "i)`.",
        },
        {
          front: "What does `n & (-n)` give you?",
          back:
            "The lowest set bit, isolated — everything else zeroed. Useful for partitioning on " +
            "a differing bit.",
        },
      ],
      resources: [
        {
          title: "Striver — Bit basics and operators",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/bit-basics-and-operators",
          kind: "read",
          minutes: 35,
          whyThisOne:
            "Starts from binary numbers themselves, then each operator with its truth table and an example.",
          steps: [
            "Read **Understanding Binary Numbers**, then do **Decimal to Binary** and **Binary to Decimal** for 13 and 22 by hand.",
            "Read **Truth Table for Bitwise Operators** and **Core Bitwise Operators** one operator at a time.",
            "For each operator, predict `12 op 10` on paper before checking.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Bit counting tricks",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/bit-counting-tricks",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Counting set bits two ways, and why `n & (n - 1)` clears the lowest set bit.",
          steps: [
            "Read **Approach 2 — Brian Kernighan's Algorithm** and **Why Does N & (N - 1) Clear the Lowest Set Bit?**",
          ],
        },
      ],
    },
    {
      slug: "dsa-bits-xor",
      title: "XOR tricks",
      objective:
        "Use XOR's self-inverse property to find loners without extra space.",
      estMinutes: 60,
      primer: `**XOR** (\`^\`) gives 1 where two bits differ and 0 where they match. Three facts make it useful:

- \`x ^ x = 0\` — anything XORed with itself vanishes.
- \`x ^ 0 = x\` — XOR with zero changes nothing.
- The order does not matter: \`a ^ b ^ a\` is the same as \`a ^ a ^ b\`, which is \`b\`.

So if every number in an array appears twice except one, XOR them all together: the pairs cancel and the loner is left. No map, no sorting, O(1) extra space.

The harder version has **two** loners. XOR of everything gives \`a ^ b\`; any 1 bit in that result is a position where \`a\` and \`b\` differ, so it splits the array into two groups with one loner each.

**You need already:** the bit basics unit.`,
      conceptMd: `Three properties do all the work: \`x ^ x = 0\`, \`x ^ 0 = x\`, and XOR is commutative and associative — **so order does not matter and pairs annihilate.**

That immediately gives: single number in an array of pairs (XOR everything), missing number in 0..n (XOR all indices and all values), and swapping without a temporary.

The harder one, worth doing once: **two numbers appear once, everything else twice.** XOR everything to get \`a ^ b\`. Isolate any set bit of that result with \`d = x & (-x)\` — a set bit means a and b differ there. Partition the array on that bit and XOR each half separately. That partitioning insight is a genuine interview differentiator.`,
      interviewAngle:
        "Single Number III is the differentiator here. The partition-on-a-differing-bit step is " +
        "hard to invent cold, which is exactly why it gets asked.",
      pitfalls: [
        "Reaching for XOR on Single Number II, where elements repeat three times. XOR only " +
          "cancels pairs — that variant needs per-position counts mod 3.",
        "Trying to isolate a differing bit before XORing everything. You need `a ^ b` first; " +
          "any set bit in it is a position where a and b differ.",
        "Forgetting that prefix XOR works exactly like prefix sums because XOR is its own " +
          "inverse.",
      ],
      recall: [
        {
          front: "Which three properties of XOR make the loner tricks work?",
          back:
            "`x ^ x = 0`, `x ^ 0 = x`, and it is commutative and associative — so order is " +
            "irrelevant and every pair annihilates.",
        },
        {
          front: "Two numbers appear once and everything else twice. Walk the algorithm.",
          back:
            "XOR everything to get `a ^ b`. Isolate any set bit with `d = x & (-x)` — a set bit " +
            "means a and b differ there. Partition the array on that bit and XOR each half " +
            "separately; each half now contains one loner and pairs.",
        },
        {
          front: "Why does XOR fail on Single Number II, where elements repeat three times?",
          back:
            "XOR cancels in pairs, and three copies leave one behind uncancelled. Instead count " +
            "set bits per position across all numbers and take each count mod 3.",
        },
        {
          front: "How do you answer many range-XOR queries in O(1) each?",
          back:
            "Prefix XOR: `range(l, r) = pre[r + 1] ^ pre[l]`. It mirrors prefix sums because " +
            "XOR is its own inverse.",
        },
      ],
      resources: [
        {
          title: "Striver — XOR basics",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/xor-basics",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Each XOR property with a small example — the properties are the whole technique.",
          steps: [
            "Read **What Is XOR?** and the **XOR Truth Table**.",
            "Read **Core Properties of XOR**, 1 to 6, and check each with two small numbers.",
            "Read **Important XOR Identities**.",
            "Then solve *Single Number III* (next link).",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Single number III",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/single-number-iii",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "Splitting the array on a bit where the two answers differ — hard to invent, easy to keep once seen.",
          steps: [
            "Try it; then read **Optimal Approach** and its **Dry Run**.",
          ],
        },
      ],
    },
    {
      slug: "dsa-bits-subsets",
      title: "Bitmask subset generation",
      objective:
        "Enumerate all subsets with a mask loop, and see why this is the substrate for bitmask DP.",
      estMinutes: 45,
      primer: `In the recursion module you generated subsets with take-or-leave recursion. Bits give a second way with no recursion at all.

For n elements, write each number from 0 to 2ⁿ − 1 in binary using n bits. Read each bit as a yes/no: bit i is 1 means "element i is in the subset". With 3 elements, 5 = \`101\` means {element 0, element 2}. Counting from 0 to 7 therefore lists all 8 subsets, each exactly once.

This only works while 2ⁿ is small (n up to about 20), but it is short, fast, and the foundation of "bitmask DP" later in the course.

**You need already:** bit basics (\`1 << i\`, \`&\`), and the subsets unit from the recursion module.`,
      conceptMd: `For \`n <= 20\` or so, every subset can be enumerated without recursion at all:

\`\`\`cpp
for (int mask = 0; mask < (1 << n); mask++)
    for (int i = 0; i < n; i++)
        if (mask & (1 << i)) /* element i is in this subset */;
\`\`\`

Each integer from 0 to 2ⁿ−1 *is* a subset. This is often cleaner than recursion, and it is the representation bitmask DP is built on — where the state is "which subset of items have I used", as in travelling-salesman-style problems in phase 3.

Also worth knowing: \`__builtin_popcount(mask)\` counts set bits in one instruction, and \`for (int s = mask; s; s = (s-1) & mask)\` enumerates every submask of a mask.`,
      interviewAngle:
        "The mask loop is the representation bitmask DP is built on. Knowing that `each integer " +
        "from 0 to 2^n - 1 is a subset` is what makes phase 3 DP states readable.",
      pitfalls: [
        "Reaching for a mask loop when n is large. The enumeration is 2^n, so it is only " +
          "viable for n up to about 20.",
        "Writing `mask <= (1 << n)` instead of `<`. That enumerates one subset too many.",
        "Hand-rolling a popcount loop when `__builtin_popcount` exists.",
      ],
      recall: [
        {
          front: "What is the correspondence that makes the mask loop work?",
          back:
            "Each integer from 0 to 2^n - 1 *is* a subset: bit i set means element i is " +
            "included. So iterating the integers enumerates every subset once.",
        },
        {
          front:
            "Roughly what is the largest n for which enumerating all masks is viable, and why?",
          back:
            "About 20. The loop is 2^n iterations, so 2^20 is a million and still fast, while " +
            "2^30 is a billion and is not.",
        },
        {
          front: "How do you enumerate every submask of a mask?",
          back:
            "`for (int s = mask; s; s = (s - 1) & mask)` — and remember it omits the empty " +
            "submask, which you handle separately if needed.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Power set",
          url: "https://www.geeksforgeeks.org/dsa/power-set/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Lists all subsets with the counting loop and connects it to the binary numbers directly.",
          steps: [
            "Read **Approach: By Using Binary Representation of Numbers from 0 to 2^n - 1**.",
            "By hand, write masks 0 to 7 for `[a, b, c]` and the subset each one means.",
            "Skip the *Previous Permutation* approach.",
          ],
          isPrimary: true,
        },
        {
          title: "cp-algorithms — Enumerating submasks",
          url: "https://cp-algorithms.com/algebra/all-submasks.html",
          kind: "read",
          whyThisOne:
            "Optional, for later: why `(s - 1) & mask` visits every submask, and why doing it for every mask costs 3ⁿ.",
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-number-of-1-bits", title: "Number of 1 Bits", platform: "leetcode", url: "https://leetcode.com/problems/number-of-1-bits/", difficulty: "easy", patternTag: "bit-manipulation", triggerHint: "Population count.", approachHint: "Loop n &= (n-1) and count iterations — runs once per set bit, not once per position.", estMinutes: 10, unitSlug: "dsa-bits-operations" },
    { slug: "lc-counting-bits", title: "Counting Bits", platform: "leetcode", url: "https://leetcode.com/problems/counting-bits/", difficulty: "easy", patternTag: "bit-manipulation", triggerHint: "Popcount for every number up to n — an O(n) requirement hints at reuse.", approachHint: "dp[i] = dp[i >> 1] + (i & 1). Your first genuine DP recurrence.", estMinutes: 20, unitSlug: "dsa-bits-operations" },
    { slug: "lc-reverse-bits", title: "Reverse Bits", platform: "leetcode", url: "https://leetcode.com/problems/reverse-bits/", difficulty: "easy", patternTag: "bit-manipulation", triggerHint: "Reverse the bit order of a fixed-width integer.", approachHint: "Shift the result left, OR in the low bit of n, shift n right. Exactly 32 iterations.", estMinutes: 15, unitSlug: "dsa-bits-operations" },
    { slug: "lc-single-number-ii", title: "Single Number II", platform: "leetcode", url: "https://leetcode.com/problems/single-number-ii/", difficulty: "medium", patternTag: "bit-manipulation", triggerHint: "Everything appears three times except one — XOR alone will not cancel.", approachHint: "Count set bits per position across all numbers; each position's count mod 3 rebuilds the answer.", estMinutes: 30, unitSlug: "dsa-bits-xor" },
    { slug: "lc-single-number-iii", title: "Single Number III", platform: "leetcode", url: "https://leetcode.com/problems/single-number-iii/", difficulty: "medium", patternTag: "xor", triggerHint: "Two loners among pairs.", approachHint: "XOR everything to get a^b, isolate a differing bit with x & (-x), partition on it and XOR each half.", estMinutes: 35, unitSlug: "dsa-bits-xor" },
    { slug: "lc-subsets-bitmask", title: "Subsets (bitmask version)", platform: "leetcode", url: "https://leetcode.com/problems/subsets/", difficulty: "medium", patternTag: "bitmask", triggerHint: "You already solved this recursively — now do it with a mask loop.", approachHint: "for mask in 0..2^n-1, include element i when mask & (1<<i). Compare against your recursive solution.", estMinutes: 20, unitSlug: "dsa-bits-subsets" },
    { slug: "lc-xor-queries-subarray", title: "XOR Queries of a Subarray", platform: "leetcode", url: "https://leetcode.com/problems/xor-queries-of-a-subarray/", difficulty: "medium", patternTag: "prefix-xor", triggerHint: "Many range queries over XOR.", approachHint: "Prefix XOR. Range [l,r] = pre[r+1] ^ pre[l], exactly like prefix sums since XOR is its own inverse.", estMinutes: 20, unitSlug: "dsa-bits-xor" },
    { slug: "lc-divide-two-integers", title: "Divide Two Integers", platform: "leetcode", url: "https://leetcode.com/problems/divide-two-integers/", difficulty: "medium", patternTag: "bit-manipulation", triggerHint: "Division without using division or multiplication.", approachHint: "Repeatedly subtract the largest doubled shift of the divisor. Watch the INT_MIN / -1 overflow case.", estMinutes: 40, isMust: false, unitSlug: "dsa-bits-operations" },
  ],
};
