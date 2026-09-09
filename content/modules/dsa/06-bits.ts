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
      conceptMd: `Six idioms carry almost everything:

\`\`\`cpp
n & (1 << i)          // test bit i
n | (1 << i)          // set bit i
n & ~(1 << i)         // clear bit i
n ^ (1 << i)          // toggle bit i
n & (n - 1)           // clear the LOWEST set bit
n & (-n)              // isolate the lowest set bit
\`\`\`

\`n & (n - 1)\` is the one that pays off. Subtracting 1 flips the lowest set bit to 0 and everything below it to 1; ANDing therefore removes exactly that bit. So **counting set bits** is a loop that runs once per set bit rather than once per bit position — Brian Kernighan's algorithm. And \`n && !(n & (n-1))\` tests for a power of two.

Two traps: shifting by more than the type's width is undefined behaviour, and \`1 << 31\` overflows a signed int — use \`1LL << i\` when i can reach 31 or more.`,
      resources: [
        {
          title: "Striver A2Z — Step 8: bit manipulation",
          url: "https://takeuforward.org/bit-manipulation/introduction-to-bit-manipulation",
          kind: "do",
          minutes: 45,
          whyThisOne: "Compact and complete for interview purposes; no need to go further than this.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-bits-xor",
      title: "XOR tricks",
      objective:
        "Use XOR's self-inverse property to find loners without extra space.",
      estMinutes: 60,
      conceptMd: `Three properties do all the work: \`x ^ x = 0\`, \`x ^ 0 = x\`, and XOR is commutative and associative — **so order does not matter and pairs annihilate.**

That immediately gives: single number in an array of pairs (XOR everything), missing number in 0..n (XOR all indices and all values), and swapping without a temporary.

The harder one, worth doing once: **two numbers appear once, everything else twice.** XOR everything to get \`a ^ b\`. Isolate any set bit of that result with \`d = x & (-x)\` — a set bit means a and b differ there. Partition the array on that bit and XOR each half separately. That partitioning insight is a genuine interview differentiator.`,
      resources: [
        {
          title: "Striver — single number II & III",
          url: "https://takeuforward.org/arrays/find-the-number-that-appears-once-and-the-other-numbers-twice/",
          kind: "watch",
          minutes: 30,
          whyThisOne: "The partition-on-a-differing-bit idea is hard to invent cold and easy to keep once seen.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-bits-subsets",
      title: "Bitmask subset generation",
      objective:
        "Enumerate all subsets with a mask loop, and see why this is the substrate for bitmask DP.",
      estMinutes: 45,
      conceptMd: `For \`n <= 20\` or so, every subset can be enumerated without recursion at all:

\`\`\`cpp
for (int mask = 0; mask < (1 << n); mask++)
    for (int i = 0; i < n; i++)
        if (mask & (1 << i)) /* element i is in this subset */;
\`\`\`

Each integer from 0 to 2ⁿ−1 *is* a subset. This is often cleaner than recursion, and it is the representation bitmask DP is built on — where the state is "which subset of items have I used", as in travelling-salesman-style problems in phase 3.

Also worth knowing: \`__builtin_popcount(mask)\` counts set bits in one instruction, and \`for (int s = mask; s; s = (s-1) & mask)\` enumerates every submask of a mask.`,
      resources: [
        {
          title: "Striver — power set using bit manipulation",
          url: "https://takeuforward.org/data-structure/power-set-print-all-the-possible-subsequences-of-the-string/",
          kind: "watch",
          minutes: 20,
          whyThisOne: "Connects the mask loop to the recursive version you already wrote, so both stay available.",
          isPrimary: true,
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
