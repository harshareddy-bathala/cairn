import type { Module } from "@/content/types";

export const heapsTries: Module = {
  slug: "dsa-heaps-tries",
  trackSlug: "dsa",
  phaseSlug: "depth",
  order: 4,
  title: "Heaps & tries",
  summary:
    "Two structures that answer one kind of question fast. A heap answers \"what is the smallest (or largest) right now?\" in O(log n) per change, which powers top-k, k-way merge and running medians. A trie answers \"which stored words start with this?\" in time proportional to the word, not the dictionary.",
  prereqSlugs: ["dsa-binary-trees"],
  units: [
    {
      slug: "dsa-heap-basics",
      title: "The heap & priority_queue",
      objective:
        "Explain the array-backed binary heap, use std::priority_queue as a max- and min-heap, and solve kth-largest with a size-k heap.",
      estMinutes: 70,
      primer: `A **heap** is a structure that always knows its smallest (or largest) item. You can add items and remove the top one in O(log n), and look at the top in O(1).

It is a binary tree kept in a plain array: the children of position i sit at 2i+1 and 2i+2, so no pointers are needed. The only rule is that every parent is smaller than its children (a *min-heap*) — or larger, for a *max-heap*. Adding an item puts it at the end and lets it rise while it beats its parent; removing the top moves the last item up and lets it sink.

In C++ this is \`priority_queue\`, which is a **max**-heap by default; a min-heap needs \`priority_queue<int, vector<int>, greater<int>>\`.

**You need already:** binary trees, and arrays.`,
      conceptMd: `A **binary heap** is a complete binary tree stored in an array, with one rule: every parent is ≤ its children (min-heap) or ≥ them (max-heap). Nothing is said about siblings, so a heap is *not* sorted — only the root is known.

In a 0-indexed array, node \`i\` has children \`2i+1\` and \`2i+2\` and parent \`(i-1)/2\`. No pointers, and the tree is always balanced, so its height is ⌊log₂ n⌋.

| Operation | How | Cost |
|---|---|---|
| top | read index 0 | O(1) |
| push | append, then **sift up** while smaller than the parent | O(log n) |
| pop | move the last element to the root, then **sift down** to the smaller child | O(log n) |
| build from n items | sift down every non-leaf, bottom-up | **O(n)** |

The O(n) build surprises people: most nodes are near the bottom and sift down only a step or two.

**In C++**, \`std::priority_queue\` is a **max-heap** by default:

\`\`\`cpp
priority_queue<int> maxh;                              // largest on top
priority_queue<int, vector<int>, greater<int>> minh;   // smallest on top
// pairs compare lexicographically: {dist, node} orders by dist first
priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
\`\`\`

There is no decrease-key and no way to erase an arbitrary element; the usual workaround is to push the new value and skip stale entries when they surface (**lazy deletion**).

**Kth largest — the size-k min-heap.** Keep the k largest seen so far in a *min*-heap. When it exceeds k, pop the smallest. At the end the top is the kth largest. O(n log k) time, O(k) space, and it works on a stream. (Quickselect is O(n) on average but O(n²) worst case and needs the whole array.)`,
      interviewAngle:
        "Kth Largest is the gateway question: sorting is the answer that ends the interview early. " +
        "Saying \"size-k min-heap, O(n log k)\" and explaining why it is a min-heap for the largest " +
        "is what they are listening for.",
      pitfalls: [
        "Forgetting that priority_queue is a max-heap by default and getting the order reversed.",
        "Using a max-heap of all n elements for kth largest — O(n log n), no better than sorting.",
        "Assuming a heap's array is sorted; only the root is guaranteed.",
        "Writing a comparator for priority_queue that is inverted relative to sort's.",
      ],
      recall: [
        {
          front: "In an array-backed binary heap, where are the children and parent of index i?",
          back: "Children at 2i+1 and 2i+2, parent at (i-1)/2, for 0-indexed arrays.",
        },
        {
          front: "Why does finding the kth largest use a min-heap of size k?",
          back:
            "The heap holds the k largest seen so far; its top is the smallest of those, which is the " +
            "one to evict when something larger arrives — and at the end it is the kth largest.",
        },
        {
          front: "How do you declare a min-heap of ints with std::priority_queue?",
          back: "priority_queue<int, vector<int>, greater<int>> — the default is a max-heap.",
        },
        {
          front: "What is the cost of building a heap from n items, and why isn't it n log n?",
          back: "O(n): sifting down bottom-up, most nodes are near the leaves and move only a level or two.",
        },
      ],
      resources: [
        {
          title: "Striver — Introduction to heap",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/introduction-to-heap",
          kind: "read",
          minutes: 35,
          whyThisOne:
            "What a heap is, how it sits in an array, and sift up / sift down with a dry run — before using the library.",
          steps: [
            "Read **What is a Heap?** and **Array Representation of a Binary Heap**.",
            "Read **Min Heap and Max Heap**.",
            "Work **Heapify** — sift up, sift down — and redo **Dry Run of Max Heapify Down** on paper.",
            "Then use `priority_queue` to solve *Kth Largest Element* from the practice list.",
          ],
          isPrimary: true,
        },
        {
          title: "VisuAlgo — Binary heap",
          url: "https://visualgo.net/en/heap",
          kind: "do",
          minutes: 10,
          whyThisOne:
            "Watch insert and extract move items on the tree and the array side by side.",
        },
        {
          title: "cppreference — std::priority_queue",
          url: "https://en.cppreference.com/cpp/container/priority_queue",
          kind: "docs",
          whyThisOne:
            "The template parameters and the comparator direction, which everyone gets backwards once.",
        },
      ],
    },
    {
      slug: "dsa-heap-topk",
      title: "Top-k & k-way merge",
      objective:
        "Recognise top-k and k-way merge problems and solve them with a bounded heap in O(n log k).",
      estMinutes: 80,
      primer: `"Find the k largest items" — sorting everything costs O(n log n). A heap of size k does it in O(n log k).

Keep a **min-heap holding at most k items**. For each new item, push it; if the heap grows past k, pop the smallest. At the end the heap holds exactly the k largest — every item that was popped had k bigger ones above it. It feels backwards (a *min*-heap for the *largest*), and that is the point to remember.

**Merging k sorted lists** uses a heap differently: put the front item of every list in a heap, repeatedly take the smallest, and push the next item from the list it came from.

**You need already:** \`priority_queue\` from the last unit.`,
      conceptMd: `**Top-k** problems ask for the k best items by some score: most frequent, closest, largest. The recipe is always the same — a heap of size k ordered so that the *worst of the best* is on top, and evicted when something better arrives:

\`\`\`cpp
// k most frequent: min-heap on count, size k
unordered_map<int,int> cnt; for (int x : nums) cnt[x]++;
priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;   // {count, value}
for (auto [v, c] : cnt) {
  pq.push({c, v});
  if ((int)pq.size() > k) pq.pop();
}
\`\`\`

O(n log k). When the score range is small (a frequency is at most n), **bucket sort** gets O(n): bucket i holds the values that occur i times; read buckets from high to low.

**K-way merge.** To merge k sorted lists, keep one "front" element from each list in a min-heap. Pop the smallest, output it, push the next element from the same list. The heap never holds more than k items, so merging N total elements costs **O(N log k)** — better than merging pairwise one list at a time, which is O(N·k).

The same shape solves "kth smallest in a sorted matrix" (each row is a list) and "smallest range covering k lists".

**Task Scheduler** is a greedy problem wearing a heap: always run the most frequent remaining task, and a cooldown window forces idle slots. The heap simulation works, but the closed form — \`max(n_tasks, (maxFreq - 1) * (cooldown + 1) + countOfMaxFreq)\` — is the answer interviewers hope to hear you derive.`,
      interviewAngle:
        "Merge k Sorted Lists is one of the most-asked hard problems. The heap solution with the " +
        "O(N log k) argument, contrasted with sequential merging's O(N·k), is the whole answer.",
      pitfalls: [
        "Keeping the heap ordered the wrong way for top-k, so the best items are the ones evicted.",
        "Pushing every element into one big heap: O(N log N) instead of O(N log k).",
        "In k-way merge, forgetting to push the next node from the list you just popped from.",
        "Comparing ListNode pointers in the heap instead of their values.",
      ],
      recall: [
        {
          front: "What is the cost of merging k sorted lists with N elements in total using a heap?",
          back: "O(N log k): the heap holds one front element per list, and each element is pushed and popped once.",
        },
        {
          front: "For the k most frequent elements, which way is the size-k heap ordered, and why?",
          back: "A min-heap on count — its top is the least frequent of the current k, the one to evict.",
        },
        {
          front: "When can top-k frequent be done in O(n) instead of O(n log k)?",
          back: "When the score range is bounded, as frequencies are by n: bucket by frequency and read from the top.",
        },
      ],
      resources: [
        {
          title: "Striver — Top k frequent elements",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/top-k-frequent-elements",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "Counting with a map, then a size-k heap — and the bucket version that beats it.",
          steps: [
            "Read the problem and examples, and try it yourself for 10–15 minutes.",
            "Read the approaches in order — brute force first — following each **Dry Run** on paper.",
            "Explain why a *min*-heap finds the *largest* k.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Merge k sorted lists",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/merge-k-sorted-linked-lists",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "A heap of list fronts, and the O(N log k) argument, after the brute force it replaces.",
        },
        {
          title: "Striver — Task scheduler",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/task-scheduler",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "Both the heap simulation and the formula, with a picture of the idle slots.",
        },
      ],
    },
    {
      slug: "dsa-heap-two-heaps",
      title: "Two heaps",
      objective:
        "Maintain a running median with a max-heap and a min-heap, and use two heaps to pick greedily under a constraint.",
      estMinutes: 70,
      primer: `"Numbers keep arriving; after each one, report the **median**." Re-sorting each time is far too slow.

Split the numbers into two halves with two heaps: a **max-heap** for the smaller half (so its top is the largest of the small numbers) and a **min-heap** for the larger half (its top is the smallest of the large numbers). Keep the two sizes equal, or the max-heap one bigger. The median is then always sitting at the top of one heap, or halfway between the two tops.

Each new number goes into one heap, and at most one item moves across to rebalance — O(log n) per number.

**You need already:** min-heaps and max-heaps.`,
      conceptMd: `**Running median.** Split the numbers seen so far into a lower half and an upper half:

- \`lo\` — a **max-heap** holding the smaller half, so its top is the largest of the small numbers;
- \`hi\` — a **min-heap** holding the larger half, so its top is the smallest of the large ones.

Keep \`lo.size() == hi.size()\` or \`lo.size() == hi.size() + 1\`. Then the median is \`lo.top()\` (odd count) or the average of both tops (even count).

\`\`\`cpp
void addNum(int x) {
  lo.push(x);
  hi.push(lo.top()); lo.pop();          // the largest of lo moves up: halves stay ordered
  if (hi.size() > lo.size()) { lo.push(hi.top()); hi.pop(); }   // rebalance sizes
}
double findMedian() {
  return lo.size() > hi.size() ? lo.top() : (lo.top() + (double)hi.top()) / 2;
}
\`\`\`

Add is O(log n), median is O(1). Sorting on every query would be O(n log n) each time.

**Two heaps as "available" and "locked".** In IPO, projects have a capital requirement and a profit. Sort projects by capital (or put them in a min-heap by capital). Each round, move every project you can now afford into a max-heap by profit, then take the most profitable one. The first structure gates what is possible; the second picks the best of what is possible. The same shape appears in scheduling with release times and in the "meeting rooms" family.`,
      interviewAngle:
        "Find Median from Data Stream is a design question: they want the two-heap invariant stated " +
        "before any code, and the follow-ups — what if all numbers are in [0, 100]? (counting array) — " +
        "test whether you understand why heaps were needed.",
      pitfalls: [
        "Using two min-heaps, so the lower half's top is its smallest, not its largest.",
        "Rebalancing sizes without also keeping every element of lo ≤ every element of hi.",
        "Integer overflow or integer division when averaging the two tops.",
        "In IPO, re-scanning all projects each round instead of advancing a pointer over the sorted list.",
      ],
      recall: [
        {
          front: "In the two-heap running median, which heap holds which half, and of which kind?",
          back: "The smaller half in a max-heap, the larger half in a min-heap; the tops meet at the median.",
        },
        {
          front: "What two invariants does the running-median structure maintain?",
          back: "Every element of the lower heap is ≤ every element of the upper, and their sizes differ by at most one.",
        },
        {
          front: "In IPO, what does each of the two structures do?",
          back:
            "Projects sorted by capital gate what you can afford; a max-heap by profit picks the best " +
            "of the affordable ones each round.",
        },
      ],
      resources: [
        {
          title: "Striver — Find median from data stream",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/find-median-data-stream",
          kind: "do",
          minutes: 40,
          whyThisOne:
            "The two rules the heaps keep, and the rebalance step, traced on a small stream.",
          steps: [
            "Read the problem and examples, and try it yourself for 10–15 minutes.",
            "Read the approaches in order — brute force first — following each **Dry Run** on paper.",
            "Trace the two heaps by hand for the stream 5, 15, 1, 3, 8.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — IPO",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/ipo",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "Two heaps used differently: unlock what you can afford, then pick the best — a pattern that reappears in scheduling.",
        },
      ],
    },
    {
      slug: "dsa-tries",
      title: "Tries",
      objective:
        "Implement a trie with insert, search and startsWith, extend it to wildcard search, and use a binary trie for maximum XOR.",
      estMinutes: 90,
      primer: `A **trie** (said "try") stores a set of words so you can ask "is this a word?" and "does any word start with this?" in time proportional to the *length of the word*, not the number of words stored.

Each node represents a prefix, with up to 26 child pointers, one per next letter. "cat" and "car" share the path c → a, then split. A flag on a node marks "a word ends here". Inserting and searching both just follow the letters down from the root.

Tries power autocomplete and spell-checkers. A binary version, storing numbers bit by bit, finds the **maximum XOR** of two numbers greedily — at each bit, try to go the opposite way.

**You need already:** trees and pointers; the XOR unit for the last problem.`,
      conceptMd: `A **trie** (prefix tree) stores strings character by character. Each node has up to 26 children and a flag saying "a word ends here". Words sharing a prefix share the path.

\`\`\`cpp
struct Node {
  Node *next[26] = {};
  bool end = false;
};
void insert(Node *root, const string &w) {
  Node *n = root;
  for (char c : w) {
    if (!n->next[c - 'a']) n->next[c - 'a'] = new Node();
    n = n->next[c - 'a'];
  }
  n->end = true;
}
\`\`\`

\`search\` walks the same path and checks \`end\`; \`startsWith\` walks it and only checks the path exists. All are **O(L)** for a word of length L, independent of how many words are stored. A hash set gives O(L) search too, but cannot answer prefix queries.

**Wildcards** ("." matches any letter): at a dot, try every non-null child recursively. Worst case is exponential in the number of dots, but on real dictionaries it prunes fast.

**Word Search II** — find every dictionary word in a grid. Searching the grid once per word is too slow. Instead, put the words in a trie and run one DFS from each cell, walking the trie as you walk the grid; a missing child prunes the path immediately. Remove found words (or prune empty trie nodes) so the search does not repeat work.

**Binary trie for XOR.** Store numbers bit by bit from the most significant bit (bit 31 down to 0); each node has two children. To maximise \`x XOR y\` over stored y, walk from the top bit and at each level **prefer the child with the opposite bit** to x's — a 1 in a higher bit beats anything in the lower bits. Each query is O(32), so the maximum XOR of any pair in an array is O(32·n).`,
      interviewAngle:
        "Implement Trie is a warm-up; Word Search II is the real test, and the key sentence is " +
        "\"put the dictionary in a trie and search the grid once\". Maximum XOR shows up in harder " +
        "rounds and is a trie problem that does not look like one.",
      pitfalls: [
        "Treating search and startsWith as the same function and forgetting the end-of-word flag.",
        "In Word Search II, searching once per word instead of once per grid with the trie.",
        "Not marking cells visited during the grid DFS, so a letter is reused in one word.",
        "Inserting XOR bits from the least significant end, which breaks the greedy.",
      ],
      recall: [
        {
          front: "What does a trie answer that a hash set of words cannot?",
          back: "Prefix queries: which stored words start with p, in O(|p|) to reach them.",
        },
        {
          front: "How does Word Search II avoid searching the grid once per word?",
          back:
            "The words go into a trie, and one DFS per cell walks the trie alongside the grid, pruning " +
            "as soon as the path is not a prefix of any word.",
        },
        {
          front: "To maximise x XOR y with a binary trie, which child do you prefer at each bit, and why top-down?",
          back:
            "The child whose bit is the opposite of x's bit. Going from the most significant bit, a 1 " +
            "there outweighs all lower bits combined.",
        },
      ],
      resources: [
        {
          title: "Striver — Introduction to trie",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/introduction-to-trie",
          kind: "read",
          minutes: 35,
          whyThisOne:
            "Why a trie is needed, its structure, then insert and search, one idea per section.",
          steps: [
            "Read **Why a Trie Is Needed** and **Trie Structure: Root, Children, and End Marker**.",
            "Work **Inserting Words into a Trie** and the search sections, drawing the trie for `cat, car, cart, dog`.",
            "Then implement it yourself from *Implementing a trie* (next link).",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Implementing a trie",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/trie-implementation",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "insert, search and startsWith, with the node structure in code.",
        },
        {
          title: "Striver — Maximum XOR of two numbers",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/maximum-xor-of-two-numbers-in-an-array",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "The binary trie and the take-the-opposite-bit greedy.",
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-kth-largest-in-array", title: "Kth Largest Element in an Array", platform: "leetcode", url: "https://leetcode.com/problems/kth-largest-element-in-an-array/", difficulty: "medium", patternTag: "heap", triggerHint: "You need order statistics, not the full sorted order.", approachHint: "Sort is the throwaway answer. Keep a size-k min-heap (priority_queue with greater<int>) — O(n log k).", estMinutes: 25, unitSlug: "dsa-heap-basics" },
    { slug: "lc-last-stone-weight", title: "Last Stone Weight", platform: "leetcode", url: "https://leetcode.com/problems/last-stone-weight/", difficulty: "easy", patternTag: "heap", triggerHint: "Repeatedly take the two largest.", approachHint: "A max-heap; pop two, push the difference if non-zero.", estMinutes: 10, unitSlug: "dsa-heap-basics" },
    { slug: "lc-kth-largest-stream", title: "Kth Largest Element in a Stream", platform: "leetcode", url: "https://leetcode.com/problems/kth-largest-element-in-a-stream/", difficulty: "easy", patternTag: "heap", triggerHint: "Kth largest, but values keep arriving.", approachHint: "A size-k min-heap kept across calls; its top is the answer after every add.", estMinutes: 15, unitSlug: "dsa-heap-basics" },
    { slug: "lc-top-k-frequent", title: "Top K Frequent Elements", platform: "leetcode", url: "https://leetcode.com/problems/top-k-frequent-elements/", difficulty: "medium", patternTag: "heap", triggerHint: "The k best by a score you have to count first.", approachHint: "Count with a hash map, then a size-k min-heap on count. Follow-up: bucket by frequency for O(n).", estMinutes: 20, unitSlug: "dsa-heap-topk" },
    { slug: "lc-k-closest-points", title: "K Closest Points to Origin", platform: "leetcode", url: "https://leetcode.com/problems/k-closest-points-to-origin/", difficulty: "medium", patternTag: "heap", triggerHint: "The k smallest by a distance.", approachHint: "A size-k max-heap on squared distance — no sqrt needed.", estMinutes: 20, unitSlug: "dsa-heap-topk" },
    { slug: "lc-merge-k-sorted-lists", title: "Merge k Sorted Lists", platform: "leetcode", url: "https://leetcode.com/problems/merge-k-sorted-lists/", difficulty: "hard", patternTag: "heap", triggerHint: "Several sorted sequences into one.", approachHint: "Min-heap of list heads by value; pop, append, push that node's next. O(N log k).", estMinutes: 35, unitSlug: "dsa-heap-topk" },
    { slug: "lc-task-scheduler", title: "Task Scheduler", platform: "leetcode", url: "https://leetcode.com/problems/task-scheduler/", difficulty: "medium", patternTag: "heap", triggerHint: "Most frequent first, with a cooldown between repeats.", approachHint: "Closed form: max(tasks, (maxFreq−1)·(n+1) + countOfMaxFreq). Derive it from the idle-slot grid.", estMinutes: 30, unitSlug: "dsa-heap-topk" },
    { slug: "lc-find-median-stream", title: "Find Median from Data Stream", platform: "leetcode", url: "https://leetcode.com/problems/find-median-from-data-stream/", difficulty: "hard", patternTag: "two-heaps", triggerHint: "A median that must be ready after every insert.", approachHint: "Max-heap for the low half, min-heap for the high half; sizes differ by at most one.", estMinutes: 35, unitSlug: "dsa-heap-two-heaps" },
    { slug: "lc-ipo", title: "IPO", platform: "leetcode", url: "https://leetcode.com/problems/ipo/", difficulty: "hard", patternTag: "two-heaps", triggerHint: "Pick the best option among those currently unlocked, k times.", approachHint: "Sort by capital; each round push every affordable project into a max-heap by profit, take the top.", estMinutes: 35, unitSlug: "dsa-heap-two-heaps" },
    { slug: "lc-implement-trie", title: "Implement Trie (Prefix Tree)", platform: "leetcode", url: "https://leetcode.com/problems/implement-trie-prefix-tree/", difficulty: "medium", patternTag: "trie", triggerHint: "Insert, search and prefix queries over words.", approachHint: "Nodes with 26 child pointers and an end flag; search checks the flag, startsWith does not.", estMinutes: 25, unitSlug: "dsa-tries" },
    { slug: "lc-add-search-words", title: "Design Add and Search Words Data Structure", platform: "leetcode", url: "https://leetcode.com/problems/design-add-and-search-words-data-structure/", difficulty: "medium", patternTag: "trie", triggerHint: "Word lookup with single-letter wildcards.", approachHint: "A trie; at a '.', recurse into every non-null child.", estMinutes: 30, unitSlug: "dsa-tries" },
    { slug: "lc-maximum-xor-pair", title: "Maximum XOR of Two Numbers in an Array", platform: "leetcode", url: "https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/", difficulty: "medium", patternTag: "trie", triggerHint: "Maximise XOR over pairs.", approachHint: "Binary trie from bit 31 down; for each x, prefer the opposite bit at every level.", estMinutes: 35, unitSlug: "dsa-tries" },
    { slug: "lc-word-search-ii", title: "Word Search II", platform: "leetcode", url: "https://leetcode.com/problems/word-search-ii/", difficulty: "hard", patternTag: "trie", triggerHint: "Many words, one grid.", approachHint: "Put the words in a trie; DFS from every cell walking the trie; prune missing children and found words.", estMinutes: 45, unitSlug: "dsa-tries" },
  ],
};
