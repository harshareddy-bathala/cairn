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
          title: "Striver A2Z — Step 6: linked lists",
          url: "https://takeuforward.org/data-structure/reverse-a-linked-list/",
          kind: "do",
          minutes: 60,
          whyThisOne: "Introduces the dummy head early and reuses it consistently, which is the habit worth copying.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-ll-fast-slow",
      title: "Fast & slow pointers",
      objective:
        "Find the middle, detect a cycle, and locate the cycle's start — explaining why Floyd's works.",
      estMinutes: 75,
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
          title: "Striver — detect and remove a loop in a linked list",
          url: "https://takeuforward.org/data-structure/starting-point-of-loop-in-a-linked-list/",
          kind: "watch",
          minutes: 35,
          whyThisOne: "Actually proves why resetting to the head finds the entrance instead of asserting it.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-ll-merge-sort",
      title: "Merging & sorting lists",
      objective:
        "Merge two sorted lists in place and sort a list in O(n log n) with O(1) extra space.",
      estMinutes: 75,
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
          title: "Striver — sort a linked list",
          url: "https://takeuforward.org/data-structure/sort-a-linked-list/",
          kind: "watch",
          minutes: 30,
          whyThisOne: "Makes the case for why merge sort is the right choice here, not just how to write it.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-ll-lru",
      title: "LRU cache — list + map",
      objective:
        "Build an LRU cache with O(1) get and put, and explain why both structures are required.",
      estMinutes: 90,
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
          title: "NeetCode — LRU Cache",
          url: "https://neetcode.io/problems/lru-cache",
          kind: "watch",
          minutes: 30,
          whyThisOne: "Walks the two structures together, which is the part that has to be explained out loud.",
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
