import type { Module } from "@/content/types";

export const linkedLists: Module = {
  slug: "dsa-linked-lists",
  trackSlug: "dsa",
  phaseSlug: "foundations",
  order: 7,
  title: "Linked lists",
  summary:
    "Pointer discipline under pressure. The techniques are few and the bugs are always the same three — off-by-one, lost head, null dereference — so drill until the pattern is muscle memory.",
  prereqSlugs: ["dsa-cpp-stl"],
  units: [
    {
      slug: "dsa-ll-basics",
      title: "Traversal, reversal & the dummy head",
      objective:
        "Reverse a linked list iteratively and recursively, and use a dummy head to kill edge cases.",
      estMinutes: 75,
      primer: `A **linked list** stores values in separate boxes called **nodes**. Each node holds a value and a pointer to the next node; the last one points to \`nullptr\`. You keep a pointer to the first node, the **head**.

Unlike a vector, the nodes are not side by side in memory, so there is no \`list[5]\` — to reach the 6th node you walk from the head. In exchange, inserting or removing a node, once you are at the right place, is just changing a couple of pointers.

Almost every linked-list bug is one of three: losing the rest of the list by overwriting a \`next\` pointer too early, following a \`nullptr\`, or special-casing the head. This unit teaches the habits that avoid all three — including a fake **dummy** node placed before the head.

**You need already:** C++ pointers at the level of \`node->next\`, and \`struct\`.`,
      conceptMd: `Iterative reversal is three pointers and a fixed order of operations. Write it enough times that you never have to think:

\`\`\`cpp
ListNode *prev = nullptr, *cur = head;
while (cur) {
    ListNode *next = cur->next;  // save first
    cur->next = prev;            // reverse
    prev = cur; cur = next;      // advance
}
return prev;
\`\`\`

Saving \`next\` before overwriting \`cur->next\` is the entire trick; skip it and you lose the rest of the list.

**The dummy head** is the technique that removes most edge cases. Allocate a throwaway node in front, build from there, and return \`dummy.next\`. Deleting the real head stops being a special case, and so does inserting into an empty list. Use it by default — the code is shorter and the reviewer sees you know it.`,
      interviewAngle:
        "Reversal is asked as a warm-up and expected to be fluent. Reaching for a dummy head " +
        "unprompted is a small, reliable signal that you have done this before.",
      pitfalls: [
        "Overwriting `cur->next` before saving it. That loses the rest of the list — the " +
          "single most common linked-list bug.",
        "Special-casing the head instead of using a dummy node. Deleting the head, inserting " +
          "into an empty list and merging all stop being special cases with one throwaway node.",
        "Returning `head` after an iterative reversal. The new head is `prev`; `head` is now " +
          "the tail.",
      ],
      recall: [
        {
          front: "Write the four statements of the iterative reversal loop, in order.",
          back:
            "`next = cur->next` (save first), `cur->next = prev` (reverse), `prev = cur`, `cur " +
            "= next` (advance). Return `prev`, not `head`.",
        },
        {
          front: "What does a dummy head buy you, concretely?",
          back:
            "It removes the head from every special case: deleting the first node, inserting " +
            "into an empty list and building a merged list all become the same code. Return " +
            "`dummy.next` at the end.",
        },
        {
          front: "Recursive versus iterative reversal — what is the difference that matters?",
          back: "Space. Iterative is O(1); recursive is O(n) in stack frames, one per node.",
        },
      ],
      resources: [
        {
          title: "Striver — Singly linked list: structure and basic operations",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/singly-linked-list",
          kind: "read",
          minutes: 35,
          whyThisOne:
            "Builds the node struct and each basic operation from zero, with a picture of the pointers at every step.",
          steps: [
            "Read **Introduction and Basics of Singly Linked List**.",
            "Work through **Traversal**, **Insert at Head** and **Insert at Tail**, drawing boxes and arrows as you go.",
            "Type the node struct and those three functions yourself and run them.",
            "Then do *Reverse a singly linked list* (next link).",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Reverse a singly linked list",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/reverse-a-singly-linked-list",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "From copying values to the three-pointer rewiring, and why the iterative version beats the recursive one on space.",
          steps: [
            "Read **Optimal Approach** and redo its **Dry Run** on paper with arrows.",
          ],
        },
      ],
    },
    {
      slug: "dsa-ll-fast-slow",
      title: "Fast & slow pointers",
      objective:
        "Find the middle, detect a cycle, and locate the cycle's start — explaining why Floyd's works.",
      estMinutes: 75,
      primer: `Walk a linked list with **two pointers at different speeds**: \`slow\` moves one node per step, \`fast\` moves two.

- **Middle of the list**: when \`fast\` reaches the end, \`slow\` has gone half as far — it is at the middle. One pass, no counting.
- **Cycle detection**: if the last node points back into the list, a normal walk never ends. With two speeds, if there is a loop, \`fast\` eventually laps \`slow\` and they meet — like two runners on a circular track. If there is no loop, \`fast\` reaches \`nullptr\`. This is **Floyd's algorithm**.

A follow-up asks *where* the loop starts; there is a short argument for why resetting one pointer to the head finds it.

**You need already:** traversing a linked list safely (checking for \`nullptr\`).`,
      conceptMd: `One pointer moves one step, another moves two. That single idea solves a surprising number of problems.

**Middle**: when fast reaches the end, slow is at the middle. Whether you get the first or second middle for even lengths depends on your loop condition — \`while (fast && fast->next)\` gives the second, and interviewers do ask which you want.

**Cycle detection (Floyd's)**: if a cycle exists, fast gains one position per step on slow inside the loop, so it must eventually land on it. No cycle means fast falls off the end.

**Cycle start**: after they meet, reset one pointer to the head and advance both one step at a time — they meet at the entrance. The proof is a short bit of algebra worth doing once on paper: if the tail before the loop is length \`a\`, the meeting point is \`b\` into a loop of length \`c\`, then \`a ≡ c − b\`, which is exactly why the two-pointer walk converges there.

Removing the nth node from the end is the same family: advance one pointer n steps first, then move both until it hits the end — plus a dummy head so removing the actual head is not a special case.`,
      interviewAngle:
        "`Why does resetting to the head find the cycle entrance?` is the follow-up to Floyd's, " +
        "and it is the whole reason the question is asked. Know the algebra, not just the " +
        "recipe.",
      pitfalls: [
        "Not knowing which middle your loop returns. `while (fast && fast->next)` gives the " +
          "second middle on an even-length list — decide deliberately.",
        "Dereferencing `fast->next` without first checking `fast`. Order matters in that " +
          "condition.",
        "Removing the nth node from the end without a dummy head. Removing the actual head " +
          "then becomes a special case you will forget.",
      ],
      recall: [
        {
          front:
            "Why must a fast pointer moving two steps eventually meet a slow pointer inside a " +
            "cycle?",
          back:
            "Once both are in the loop, fast gains exactly one position on slow per step, so " +
            "the gap shrinks by one each time and must reach zero. Without a cycle, fast falls " +
            "off the end instead.",
        },
        {
          front:
            "After Floyd's pointers meet, how do you find the start of the cycle, and why does " +
            "it work?",
          back:
            "Reset one pointer to the head and advance both one step at a time; they meet at " +
            "the entrance. With tail length a, meeting point b into a loop of length c, the " +
            "algebra gives a ≡ c − b, so both walks cover the same remaining distance.",
        },
        {
          front: "How do you remove the nth node from the end in one pass?",
          back:
            "Advance one pointer n steps first, then move both until it reaches the end — the " +
            "trailing pointer is at the node before the target. Use a dummy head so removing " +
            "the real head is not special.",
        },
      ],
      resources: [
        {
          title: "Striver — Find the middle of a linked list",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/find-middle-of-linked-list",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "The simplest use of two speeds: counting first, then the fast/slow version.",
          steps: [
            "Read **Approach 1** (count, then walk) and **Approach 2** (fast and slow).",
            "Dry-run Approach 2 on lists of length 5 and 6 — which middle do you get for 6?",
            "Then do *Detect a cycle* (next link) — the same two pointers.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Detect a cycle in a linked list",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/detect-cycle-linked-list",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "Floyd's algorithm, after the hash-set version it replaces.",
        },
        {
          title: "Striver — Find the starting node of a cycle",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/find-start-of-cycle-linked-list",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Proves why resetting a pointer to the head finds the entrance, instead of just asserting it.",
        },
      ],
    },
    {
      slug: "dsa-ll-merge-sort",
      title: "Merging & sorting lists",
      objective:
        "Merge two sorted lists in place and sort a list in O(n log n) with O(1) extra space.",
      estMinutes: 75,
      primer: `Two sorted linked lists can be **merged** into one sorted list without copying any values: look at the two front nodes, attach the smaller one to your result, move forward in that list, and repeat. When one list runs out, attach the rest of the other.

That merge is the heart of **sorting a linked list** with merge sort: split the list in half (the fast/slow middle from the last unit), sort each half, merge them. Merge sort suits linked lists especially well — it never needs to jump to position i, which lists cannot do cheaply.

A **dummy node** — a fake first node you create at the start — saves you from writing special cases for "the result is still empty".

**You need already:** fast/slow pointers, and merge sort on arrays from the arrays module.`,
      conceptMd: `**Merging two sorted lists** is the array merge with pointer rewiring instead of copying — dummy head, append the smaller front node, advance, then attach whatever remains. No allocation.

**Sorting a linked list** is where merge sort beats quicksort decisively: no random access is needed, and the merge step requires no auxiliary array because you are just relinking. Split with the fast/slow middle, recurse on both halves, merge. O(n log n) time, O(log n) stack.

**Palindrome check** composes three things you already have: find the middle, reverse the second half, compare, and then restore the list. Restoring it is the detail that separates a careful answer from a merely correct one — an interviewer will notice you left the input mutated.`,
      interviewAngle:
        "`Why merge sort and not quicksort for a linked list?` is the question inside the " +
        "question. The answer is about random access and the merge needing no auxiliary array.",
      pitfalls: [
        "Allocating a new list when merging. The whole point is rewiring pointers — no " +
          "allocation.",
        "Forgetting to attach the remaining tail after one list is exhausted.",
        "Leaving the list reversed after a palindrome check. Restore it; an interviewer " +
          "notices a mutated input.",
      ],
      recall: [
        {
          front: "Why is merge sort the right sort for a linked list, where quicksort is not?",
          back:
            "Merge sort needs no random access, and its merge step is pure pointer relinking " +
            "with no auxiliary array. Quicksort's partition depends on random access to be " +
            "efficient.",
        },
        {
          front: "What is the complexity of sorting a linked list by merge sort?",
          back:
            "O(n log n) time and O(log n) space — the stack from the recursion, since the merge " +
            "itself allocates nothing.",
        },
        {
          front: "Palindrome check on a linked list — which three techniques does it compose?",
          back:
            "Find the middle with fast/slow, reverse the second half, compare the halves — and " +
            "then reverse it back to restore the input.",
        },
      ],
      resources: [
        {
          title: "Striver — Merge two sorted linked lists",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/merge-two-sorted-linked-lists",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "The merge by rewiring pointers, built up from the copy-into-an-array version.",
          steps: [
            "Read **Brute Force** quickly, then **Optimal Approach**.",
            "Dry-run it with a dummy node on `1→3→5` and `2→4`.",
            "Then do *Sort a linked list using merge sort* (next link), which uses this merge.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Sort a linked list using merge sort",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/sort-a-linked-list-using-merge-sort",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "Makes the case for why merge sort is the right choice here, not just how to write it.",
        },
      ],
    },
    {
      slug: "dsa-ll-lru",
      title: "LRU cache — list + map",
      objective:
        "Build an LRU cache with O(1) get and put, and explain why both structures are required.",
      estMinutes: 90,
      primer: `A **cache** keeps recently used data close at hand so you do not recompute or refetch it. It has limited room, so when it is full something must be thrown out. **LRU — least recently used —** throws out whatever has gone unused the longest.

The interview task: build one where both \`get(key)\` and \`put(key, value)\` take O(1) time. No single structure does both jobs:

- a **hash map** finds a key instantly, but has no idea of order;
- a **doubly linked list** keeps items in order of use and can move or remove a node instantly — *if* you already have a pointer to it.

So you use both: the map stores key → pointer to the list node. Every access moves that node to the front; eviction removes from the back.

**You need already:** maps, and linked-list pointer changes (this unit adds a \`prev\` pointer).`,
      conceptMd: `A top-tier interview favourite, and a genuinely useful thing to have built — you will meet the same idea again as a caching strategy in the SRE track.

The requirement is O(1) for both \`get\` and \`put\`, which forces the combination:

- a **hash map** from key → node, for O(1) lookup
- a **doubly linked list** in recency order, for O(1) move-to-front and O(1) eviction from the back

Neither alone suffices: a map has no ordering, and a list has no fast lookup. Saying exactly that is the answer they are listening for.

Two dummy nodes — head and tail sentinels — remove every null check from the splice operations. In C++ you can lean on \`std::list\` plus \`unordered_map<int, list<...>::iterator>\`, since \`list::splice\` is O(1) and does not invalidate iterators. Know how to do it by hand as well.`,
      interviewAngle:
        "A top-tier favourite. The answer they are listening for is why *both* structures are " +
        "needed — say that before you write any code.",
      pitfalls: [
        "Proposing a map alone. It has no recency ordering, so eviction becomes O(n).",
        "Proposing a list alone. It has no fast lookup, so `get` becomes O(n).",
        "Using a singly linked list. Removing a node from the middle in O(1) requires the " +
          "previous pointer, which is what makes it doubly linked.",
        "Skipping the head and tail sentinels, then writing null checks in every splice.",
      ],
      recall: [
        {
          front: "Why does an O(1) LRU cache need both a hash map and a doubly linked list?",
          back:
            "The map gives O(1) lookup from key to node; the list keeps recency order so " +
            "move-to-front and eviction from the back are O(1). A map has no ordering and a " +
            "list has no fast lookup, so neither alone works.",
        },
        {
          front: "Why must the list be doubly linked rather than singly?",
          back:
            "Removing a node from the middle in O(1) needs its predecessor. A singly linked " +
            "list would have to walk to find it.",
        },
        {
          front: "What do the head and tail sentinel nodes buy you?",
          back:
            "Every splice — insert at front, remove from back, move to front — has a real " +
            "neighbour on both sides, so no null checks are needed anywhere.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Introduction to LRU cache",
          url: "https://www.geeksforgeeks.org/system-design/lru-cache-implementation/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Explains what the cache must do before the code, then builds the list-plus-map design step by step.",
          steps: [
            "Read **Operations on LRU Cache** and **Working of LRU Cache**, following its worked example.",
            "Read **Designing a LRU Cache** — why neither structure is enough alone.",
            "Read **Efficient Solution – Using Doubly Linked List and Hashing** and draw the list after each operation.",
            "Implement it yourself for LeetCode *LRU Cache* in this unit's practice list.",
          ],
          isPrimary: true,
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-reverse-linked-list", title: "Reverse Linked List", platform: "leetcode", url: "https://leetcode.com/problems/reverse-linked-list/", difficulty: "easy", patternTag: "linked-list", triggerHint: "The base technique everything else composes from.", approachHint: "prev / cur / next. Save next before rewiring. Then write the recursive version too.", estMinutes: 15, unitSlug: "dsa-ll-basics" },
    { slug: "lc-middle-of-linked-list", title: "Middle of the Linked List", platform: "leetcode", url: "https://leetcode.com/problems/middle-of-the-linked-list/", difficulty: "easy", patternTag: "fast-slow", triggerHint: "Positional query in one pass without knowing the length.", approachHint: "slow += 1, fast += 2. Your loop condition decides first-vs-second middle on even lengths.", estMinutes: 10, unitSlug: "dsa-ll-fast-slow" },
    { slug: "lc-linked-list-cycle", title: "Linked List Cycle", platform: "leetcode", url: "https://leetcode.com/problems/linked-list-cycle/", difficulty: "easy", patternTag: "fast-slow", triggerHint: "Cycle detection with O(1) space.", approachHint: "Floyd's. Fast gains one position per step inside a loop, so it must catch slow.", estMinutes: 15, unitSlug: "dsa-ll-fast-slow" },
    { slug: "lc-linked-list-cycle-ii", title: "Linked List Cycle II", platform: "leetcode", url: "https://leetcode.com/problems/linked-list-cycle-ii/", difficulty: "medium", patternTag: "fast-slow", triggerHint: "Not just whether there is a cycle, but where it starts.", approachHint: "After they meet, reset one pointer to head and step both by one. They meet at the entrance — be able to justify it.", estMinutes: 25, unitSlug: "dsa-ll-fast-slow" },
    { slug: "lc-find-duplicate-number", title: "Find the Duplicate Number", platform: "leetcode", url: "https://leetcode.com/problems/find-the-duplicate-number/", difficulty: "medium", patternTag: "cycle-detection", triggerHint: "Read-only array, O(1) space, values in 1..n.", approachHint: "Treat index i -> nums[i] as a next-pointer: the values form a linked list with a cycle, and the cycle entrance is the duplicate. Floyd, then reset one pointer to the start.", estMinutes: 35, unitSlug: "dsa-ll-fast-slow" },
    { slug: "lc-remove-nth-from-end", title: "Remove Nth Node From End of List", platform: "leetcode", url: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/", difficulty: "medium", patternTag: "fast-slow", triggerHint: "Position from the end, one pass.", approachHint: "Advance one pointer n steps, then move both. Use a dummy head so removing the head is not a special case.", estMinutes: 20, unitSlug: "dsa-ll-fast-slow" },
    { slug: "lc-merge-two-sorted-lists", title: "Merge Two Sorted Lists", platform: "leetcode", url: "https://leetcode.com/problems/merge-two-sorted-lists/", difficulty: "easy", patternTag: "linked-list", triggerHint: "Interleave two sorted sequences.", approachHint: "Dummy head, append the smaller front each time, attach the remaining tail at the end.", estMinutes: 15, unitSlug: "dsa-ll-merge-sort" },
    { slug: "lc-palindrome-linked-list", title: "Palindrome Linked List", platform: "leetcode", url: "https://leetcode.com/problems/palindrome-linked-list/", difficulty: "easy", patternTag: "linked-list", triggerHint: "Symmetry check with O(1) space.", approachHint: "Find the middle, reverse the second half, compare — then restore the list before returning.", estMinutes: 25, unitSlug: "dsa-ll-merge-sort" },
    { slug: "lc-remove-duplicates-sorted-list", title: "Remove Duplicates from Sorted List", platform: "leetcode", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-list/", difficulty: "easy", patternTag: "linked-list", triggerHint: "In-place compaction of a sorted list.", approachHint: "Single pass; skip forward while the next value equals the current one.", estMinutes: 15, unitSlug: "dsa-ll-basics" },
    { slug: "lc-add-two-numbers", title: "Add Two Numbers", platform: "leetcode", url: "https://leetcode.com/problems/add-two-numbers/", difficulty: "medium", patternTag: "linked-list", triggerHint: "Digit-wise arithmetic across two lists.", approachHint: "Dummy head plus a carry. Keep looping while either list remains OR the carry is non-zero.", estMinutes: 25, unitSlug: "dsa-ll-basics" },
    { slug: "lc-intersection-two-linked-lists", title: "Intersection of Two Linked Lists", platform: "leetcode", url: "https://leetcode.com/problems/intersection-of-two-linked-lists/", difficulty: "easy", patternTag: "two-pointers", triggerHint: "Shared suffix between two lists of different lengths.", approachHint: "Walk both; on reaching the end, switch to the other head. They align after a+b steps, or both hit null.", estMinutes: 25, unitSlug: "dsa-ll-fast-slow" },
    { slug: "lc-sort-list", title: "Sort List", platform: "leetcode", url: "https://leetcode.com/problems/sort-list/", difficulty: "medium", patternTag: "merge-sort", triggerHint: "O(n log n) sort with no random access available.", approachHint: "Merge sort: split at the fast/slow middle, recurse, merge by relinking. No auxiliary array needed.", estMinutes: 35, unitSlug: "dsa-ll-merge-sort" },
    { slug: "lc-reverse-nodes-k-group", title: "Reverse Nodes in k-Group", platform: "leetcode", url: "https://leetcode.com/problems/reverse-nodes-in-k-group/", difficulty: "hard", patternTag: "linked-list", triggerHint: "Segment-wise reversal leaving a short tail untouched.", approachHint: "Check k nodes remain before reversing a group; reverse, then reconnect the boundaries. Dummy head is essential.", estMinutes: 45, isMust: false, unitSlug: "dsa-ll-basics" },
    { slug: "lc-lru-cache", title: "LRU Cache", platform: "leetcode", url: "https://leetcode.com/problems/lru-cache/", difficulty: "medium", patternTag: "design", triggerHint: "O(1) get and put with eviction by recency.", approachHint: "Hash map for lookup + doubly linked list for order. Sentinel head and tail nodes remove all null checks.", estMinutes: 45, unitSlug: "dsa-ll-lru" },
  ],
};
