import type { Module } from "@/content/types";

const TUF = "https://takeuforward.org/blogs/data-structure-and-algorithm";

export const greedy: Module = {
  slug: "dsa-greedy",
  trackSlug: "dsa",
  phaseSlug: "depth",
  order: 5,
  title: "Greedy algorithms",
  summary:
    "Take the locally best choice and never look back. It is the fastest kind of algorithm to write and the easiest to get wrong, so this module is about the proof as much as the code: the exchange argument that shows a greedy choice is safe, and the counterexamples that show when it is not — which is where dynamic programming begins.",
  prereqSlugs: ["dsa-arrays-sorting"],
  units: [
    {
      slug: "dsa-greedy-intervals",
      title: "The exchange argument & intervals",
      objective:
        "Justify a greedy choice with an exchange argument, and solve interval scheduling, merging and arrow problems by sorting on the right key.",
      estMinutes: 85,
      conceptMd: `A greedy algorithm is correct only if **some optimal solution agrees with its first choice**. The standard proof is the **exchange argument**: take any optimal solution that disagrees with greedy, swap in greedy's choice, and show the result is no worse. Repeat, and the optimum becomes greedy's answer.

**Interval scheduling** — keep as many non-overlapping intervals as possible (or, equivalently, remove as few as possible):

1. Sort by **end time**.
2. Take an interval if it starts at or after the end of the last one you took.

Why end time? Whatever the optimum picks first, the interval that ends earliest leaves at least as much room for the rest — swap it in and nothing breaks. That one sentence is the exchange argument.

\`\`\`cpp
sort(iv.begin(), iv.end(), [](auto &a, auto &b) { return a[1] < b[1]; });
int kept = 0, lastEnd = INT_MIN;
for (auto &v : iv)
  if (v[0] >= lastEnd) { kept++; lastEnd = v[1]; }
return iv.size() - kept;   // Non-overlapping Intervals: how many to remove
\`\`\`

The tempting alternatives fail: sorting by start (one long early interval blocks many short ones) or by length (a short interval can straddle two compatible ones).

**The same sort, different questions:**

| Problem | Sort by | Greedy step |
|---|---|---|
| Max non-overlapping / min removals | end | take if start ≥ last end |
| Min arrows to burst balloons | end | new arrow only when a balloon starts after the current arrow |
| Merge / insert intervals | start | extend the current block while the next start ≤ its end |
| Minimum meeting rooms / platforms | start and end separately | sweep: +1 at a start, −1 at an end, track the max |

Get the boundary right: whether touching intervals ([1,2] and [2,3]) overlap differs between problems — read the statement.`,
      interviewAngle:
        "Interval problems are asked constantly, and the follow-up is always \"why sort by end?\". " +
        "Being able to state the exchange argument in two sentences is what separates a memorised " +
        "solution from an understood one.",
      pitfalls: [
        "Sorting by start time for interval scheduling — a single long early interval defeats it.",
        "Getting the touching-endpoint case wrong: ≥ versus > changes the answer.",
        "Merging intervals without sorting by start first.",
        "Writing a greedy and calling it correct because it passes the examples, with no argument.",
      ],
      recall: [
        {
          front: "What is the exchange argument for a greedy algorithm?",
          back:
            "Take any optimal solution that differs from greedy's first choice, swap greedy's choice in, " +
            "and show it is no worse — so some optimal solution agrees with greedy.",
        },
        {
          front: "To keep the most non-overlapping intervals, what do you sort by, and why not by start?",
          back:
            "By end time: the earliest-ending interval leaves the most room. Sorting by start lets one " +
            "long early interval block many short ones.",
        },
        {
          front: "How do you count the minimum number of meeting rooms needed?",
          back: "Sweep sorted start and end times: +1 at a start, −1 at an end; the maximum running count is the answer.",
        },
      ],
      resources: [
        {
          title: "Jeff Erickson — Algorithms, chapter 4: greedy",
          url: "https://jeffe.cs.illinois.edu/teaching/algorithms/book/04-greedy.pdf",
          kind: "read",
          minutes: 40,
          whyThisOne: "The clearest treatment of the exchange argument, with interval scheduling as the worked example.",
          isPrimary: true,
        },
        {
          title: "Striver — non-overlapping intervals",
          url: `${TUF}/non-overlapping-intervals`,
          kind: "read",
          minutes: 15,
          whyThisOne: "The sort-by-end greedy applied to the interview version of the problem.",
        },
        {
          title: "Striver — minimum platforms for a railway station",
          url: `${TUF}/minimum-platforms-required-for-a-railway-station`,
          kind: "read",
          minutes: 15,
          whyThisOne: "The start/end sweep, which is the meeting-rooms problem under another name.",
        },
      ],
    },
    {
      slug: "dsa-greedy-classic",
      title: "Classic greedy",
      objective:
        "Solve reachability, matching and circular-tour problems greedily, and recognise the two-pass pattern for constraints from both sides.",
      estMinutes: 80,
      conceptMd: `Most classic greedy problems fall into a few shapes.

**Sort both sides and match.** Assign Cookies: sort children by greed and cookies by size; give each child the smallest cookie that satisfies them. A bigger cookie spent on a small greed is never better. Two pointers, O(n log n).

**Track the reach.** Jump Game: walk left to right keeping \`reach = max(reach, i + nums[i])\`; if \`i > reach\` you are stuck. Jump Game II (fewest jumps) is BFS by layers without a queue: all indices reachable with j jumps form one window; the next window ends at the farthest reach from the current one.

\`\`\`cpp
int jumps = 0, curEnd = 0, farthest = 0;
for (int i = 0; i + 1 < n; i++) {
  farthest = max(farthest, i + nums[i]);
  if (i == curEnd) { jumps++; curEnd = farthest; }   // this window is used up
}
\`\`\`

**Reset on failure.** Gas Station: if the total gas is less than the total cost, no start works. Otherwise, run a tank from index 0; whenever it goes negative at i, no start from the current candidate up to i can work either, so the candidate becomes i + 1 and the tank resets. One pass, O(n).

**Two passes for two-sided constraints.** Candy: each child with a higher rating than a neighbour gets more candy than that neighbour. One left-to-right pass satisfies the left neighbour, one right-to-left pass satisfies the right; take the max of the two at each index. When a constraint looks at both sides, split it into one pass per side.

**Simulate with the cheapest change.** Lemonade Change: when giving change for $20, prefer a $10 + $5 over three $5s — $5 bills are the more flexible ones to keep.`,
      interviewAngle:
        "Jump Game II and Gas Station are asked for their one-line insight: the BFS window and the " +
        "\"reset the start after a deficit\" argument. Candy is the standard hard greedy, and the " +
        "two-pass split is the answer.",
      pitfalls: [
        "Solving Jump Game with DP or BFS over indices — O(n²) where a single reach variable does it in O(n).",
        "In Gas Station, trying every starting index: O(n²).",
        "In Candy, a single pass that satisfies only one neighbour.",
        "Iterating Jump Game II up to the last index, and counting one extra jump at the end.",
      ],
      recall: [
        {
          front: "Gas Station: after the tank goes negative at index i, why can the start jump to i + 1?",
          back:
            "Every start between the current candidate and i reached that point with a tank no larger " +
            "than the candidate's, so all of them fail at i too.",
        },
        {
          front: "How is Jump Game II a BFS without a queue?",
          back:
            "Indices reachable in j jumps form a window; the next window ends at the farthest reach " +
            "from this one. Count a jump each time you pass the current window's end.",
        },
        {
          front: "How does Candy satisfy a constraint on both neighbours?",
          back: "Two passes — left-to-right for the left neighbour, right-to-left for the right — and take the max at each index.",
        },
      ],
      resources: [
        {
          title: "Striver — jump game II",
          url: `${TUF}/jump-game-ii-minimum-jumps`,
          kind: "read",
          minutes: 20,
          whyThisOne: "Recursion to DP to the greedy window, so you see what greedy saves.",
          isPrimary: true,
        },
        {
          title: "Striver — candy",
          url: `${TUF}/candy-distribution-problem`,
          kind: "read",
          minutes: 20,
          whyThisOne: "The two-pass version, then the one-pass slope version for the follow-up.",
        },
        {
          title: "USACO Guide — greedy with sorting",
          url: "https://usaco.guide/silver/greedy-sorting",
          kind: "read",
          minutes: 25,
          whyThisOne: "More sort-then-greedy problems, each with the reason the greedy is safe.",
        },
      ],
    },
    {
      slug: "dsa-greedy-limits",
      title: "When greedy fails",
      objective:
        "Break a plausible greedy with a counterexample, and recognise when a problem needs dynamic programming instead.",
      estMinutes: 60,
      conceptMd: `The fastest way to test a greedy idea is to **hunt for a counterexample** on small inputs before writing any code.

**Coin change.** With coins {1, 5, 10, 25}, taking the largest coin that fits is optimal. With coins {1, 3, 4} and amount 6, greedy takes 4 + 1 + 1 (three coins) but 3 + 3 uses two. Greedy is safe only for "canonical" coin systems, and an interview problem never promises that — so Coin Change is a **DP** problem:

\`\`\`cpp
vector<int> dp(amount + 1, INT_MAX);   // dp[a] = fewest coins that make a
dp[0] = 0;
for (int a = 1; a <= amount; a++)
  for (int c : coins)
    if (c <= a && dp[a - c] != INT_MAX) dp[a] = min(dp[a], dp[a - c] + 1);
\`\`\`

**0/1 knapsack** fails for the same reason: the best value-per-weight item can waste capacity. **Fractional** knapsack, where items can be split, is greedy — you are never stuck with the wasted space.

**The signal.** Greedy works when a choice never closes off a better future (the exchange argument goes through). When today's choice changes what is possible later in a way you cannot bound — capacity left over, a coin that "almost" fits — you need to try the options, and **overlapping subproblems** make that DP.

Some problems look like DP and are greedy. **Partition Labels** — split a string into as many parts as possible so each letter appears in only one part — needs just each letter's last index: extend the current part to the furthest last-occurrence seen so far, and cut when \`i\` reaches it. Recognising that the greedy is safe here (you can never cut earlier) is the skill.

Greedy and DP are two answers to the same question — "is the local choice safe?" — and the next phase's DP module starts from here.`,
      interviewAngle:
        "Interviewers deliberately pick problems where greedy is tempting. Saying \"greedy would take " +
        "the largest coin, but {1, 3, 4} with 6 breaks it, so this is DP\" is a strong answer on its " +
        "own, even before any code.",
      pitfalls: [
        "Answering Coin Change greedily because it works for Indian or US currency.",
        "Assuming a greedy is right because you could not immediately think of a counterexample.",
        "Confusing fractional knapsack (greedy) with 0/1 knapsack (DP).",
        "Reaching for DP on Partition Labels when last-index greedy is O(n).",
      ],
      recall: [
        {
          front: "Give a counterexample to greedy for the fewest-coins problem.",
          back: "Coins {1, 3, 4}, amount 6: greedy gives 4+1+1 (three coins); 3+3 uses two.",
        },
        {
          front: "Why is fractional knapsack greedy but 0/1 knapsack DP?",
          back:
            "When items can be split, taking the best value-per-weight never wastes capacity. When " +
            "they cannot, the best ratio item can leave space nothing else fills.",
        },
        {
          front: "How does Partition Labels decide where to cut?",
          back: "Track the furthest last-occurrence of any letter seen in the current part; cut when the index reaches it.",
        },
      ],
      resources: [
        {
          title: "Striver — minimum number of coins",
          url: `${TUF}/minimum-number-of-coins`,
          kind: "read",
          minutes: 15,
          whyThisOne: "The greedy that works for canonical coins, and the reason it does not in general.",
          isPrimary: true,
        },
        {
          title: "USACO Guide — introduction to greedy",
          url: "https://usaco.guide/bronze/intro-greedy",
          kind: "read",
          minutes: 20,
          whyThisOne: "Short, with explicit examples of greedy ideas that fail and how to find the counterexample.",
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-non-overlapping-intervals", title: "Non-overlapping Intervals", platform: "leetcode", url: "https://leetcode.com/problems/non-overlapping-intervals/", difficulty: "medium", patternTag: "greedy-intervals", triggerHint: "Remove the fewest intervals so none overlap.", approachHint: "Sort by end; keep an interval if it starts at or after the last kept end. Answer = n − kept.", estMinutes: 20, unitSlug: "dsa-greedy-intervals" },
    { slug: "lc-min-arrows-balloons", title: "Minimum Number of Arrows to Burst Balloons", platform: "leetcode", url: "https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/", difficulty: "medium", patternTag: "greedy-intervals", triggerHint: "The fewest points that stab every interval.", approachHint: "Sort by end; shoot at the first end; a new arrow only when a balloon starts after it. Touching counts as burst.", estMinutes: 20, unitSlug: "dsa-greedy-intervals" },
    { slug: "lc-insert-interval", title: "Insert Interval", platform: "leetcode", url: "https://leetcode.com/problems/insert-interval/", difficulty: "medium", patternTag: "greedy-intervals", triggerHint: "Sorted disjoint intervals plus one new one.", approachHint: "Three phases: copy those ending before it, merge those overlapping it, copy the rest.", estMinutes: 20, unitSlug: "dsa-greedy-intervals" },
    { slug: "lc-max-pair-chain", title: "Maximum Length of Pair Chain", platform: "leetcode", url: "https://leetcode.com/problems/maximum-length-of-pair-chain/", difficulty: "medium", patternTag: "greedy-intervals", triggerHint: "The longest chain where each pair starts after the last ends.", approachHint: "This is interval scheduling: sort by the second element and take greedily.", estMinutes: 15, unitSlug: "dsa-greedy-intervals" },
    { slug: "lc-assign-cookies", title: "Assign Cookies", platform: "leetcode", url: "https://leetcode.com/problems/assign-cookies/", difficulty: "easy", patternTag: "greedy", triggerHint: "Match two sorted lists so as many as possible are satisfied.", approachHint: "Sort both; give each child the smallest cookie that satisfies them, with two pointers.", estMinutes: 10, unitSlug: "dsa-greedy-classic" },
    { slug: "lc-lemonade-change", title: "Lemonade Change", platform: "leetcode", url: "https://leetcode.com/problems/lemonade-change/", difficulty: "easy", patternTag: "greedy", triggerHint: "Give change as you go, with limited bills.", approachHint: "Count $5 and $10 bills; for $20 prefer 10+5 over 5+5+5.", estMinutes: 10, unitSlug: "dsa-greedy-classic" },
    { slug: "lc-jump-game", title: "Jump Game", platform: "leetcode", url: "https://leetcode.com/problems/jump-game/", difficulty: "medium", patternTag: "greedy", triggerHint: "Can you reach the end at all.", approachHint: "Keep the farthest reachable index; fail if i ever passes it.", estMinutes: 15, unitSlug: "dsa-greedy-classic" },
    { slug: "lc-jump-game-ii", title: "Jump Game II", platform: "leetcode", url: "https://leetcode.com/problems/jump-game-ii/", difficulty: "medium", patternTag: "greedy", triggerHint: "The fewest jumps to the end.", approachHint: "BFS by windows: when i reaches the current window's end, jump and extend it to the farthest reach.", estMinutes: 20, unitSlug: "dsa-greedy-classic" },
    { slug: "lc-gas-station", title: "Gas Station", platform: "leetcode", url: "https://leetcode.com/problems/gas-station/", difficulty: "medium", patternTag: "greedy", triggerHint: "A circular tour and a starting point to find.", approachHint: "If total gas < total cost, return -1. Otherwise reset the start to i+1 whenever the tank goes negative.", estMinutes: 25, unitSlug: "dsa-greedy-classic" },
    { slug: "lc-candy", title: "Candy", platform: "leetcode", url: "https://leetcode.com/problems/candy/", difficulty: "hard", patternTag: "greedy", triggerHint: "A constraint against both neighbours.", approachHint: "Left-to-right pass, right-to-left pass, take the max at each index.", estMinutes: 30, unitSlug: "dsa-greedy-classic" },
    { slug: "lc-coin-change", title: "Coin Change", platform: "leetcode", url: "https://leetcode.com/problems/coin-change/", difficulty: "medium", patternTag: "dp", triggerHint: "Fewest coins — and greedy looks like it should work.", approachHint: "Find the greedy counterexample first, then dp[a] = min over coins of dp[a − c] + 1.", estMinutes: 30, unitSlug: "dsa-greedy-limits" },
    { slug: "lc-partition-labels", title: "Partition Labels", platform: "leetcode", url: "https://leetcode.com/problems/partition-labels/", difficulty: "medium", patternTag: "greedy", triggerHint: "Cut a string so each letter lives in one part.", approachHint: "Record each letter's last index; extend the part's end to the max last index seen; cut when i reaches it.", estMinutes: 20, unitSlug: "dsa-greedy-limits" },
  ],
};
