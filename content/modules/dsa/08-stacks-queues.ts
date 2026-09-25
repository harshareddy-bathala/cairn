import type { Module } from "@/content/types";

const TUF = "https://takeuforward.org/blogs/data-structure-and-algorithm";

export const stacksQueues: Module = {
  slug: "dsa-stacks-queues",
  trackSlug: "dsa",
  phaseSlug: "depth",
  order: 1,
  title: "Stacks & queues",
  summary:
    "Two containers with one rule each, and the monotonic stack — the pattern behind next-greater, stock span, histogram and a surprising number of \"hard\" problems. Once you see that a stack remembers the candidates still waiting for an answer, half of this module solves itself.",
  prereqSlugs: ["dsa-linked-lists"],
  units: [
    {
      slug: "dsa-sq-mechanics",
      title: "Stack & queue mechanics",
      objective:
        "Use std::stack, std::queue and std::deque fluently, and build a queue from two stacks with amortised O(1) operations.",
      estMinutes: 60,
      conceptMd: `A **stack** is last-in, first-out: \`push\`, \`pop\`, \`top\`. A **queue** is first-in, first-out: \`push\`, \`pop\`, \`front\`. A **deque** allows both ends. In C++ all three are O(1) per operation, and \`stack\` and \`queue\` are adapters over a \`deque\` by default.

\`\`\`cpp
stack<int> st;  st.push(1); st.top(); st.pop();
queue<int> q;   q.push(1);  q.front(); q.pop();
deque<int> dq;  dq.push_back(1); dq.push_front(0); dq.pop_back(); dq.front();
\`\`\`

\`pop()\` returns \`void\` — read with \`top()\` or \`front()\` first. And calling either on an empty container is undefined behaviour, so check \`empty()\` before you look.

**A queue from two stacks** is the classic mechanics question, and its real content is amortised analysis:

\`\`\`cpp
stack<int> in, out;
void push(int x) { in.push(x); }
int pop() {
  if (out.empty())
    while (!in.empty()) { out.push(in.top()); in.pop(); }   // reverse once
  int x = out.top(); out.pop(); return x;
}
\`\`\`

Each element is moved from \`in\` to \`out\` **at most once** in its lifetime, so n operations cost O(n) total — O(1) amortised, even though a single \`pop\` can cost O(n). Moving everything back and forth on every call is the O(n)-per-operation version interviewers are waiting for you to avoid.

**A circular queue** on a fixed array keeps \`head\` and a \`count\` (or \`head\` and \`tail\` with one slot left empty) and advances with \`(i + 1) % capacity\`. Tracking the count is what distinguishes *full* from *empty* when head and tail meet.`,
      interviewAngle:
        "\"Implement a queue using stacks\" is asked for the amortised argument, not the code. Saying " +
        "\"each element crosses from in to out once, so n operations cost O(n)\" is the answer.",
      pitfalls: [
        "Expecting `pop()` to return the value. It returns void — read `top()` or `front()` first.",
        "Calling `top()`, `front()` or `pop()` on an empty container. That is undefined behaviour, not an exception.",
        "Refilling the out-stack on every pop. Only refill when it is empty — that is what makes it amortised O(1).",
        "A circular queue that cannot tell full from empty because head == tail in both. Keep a count.",
      ],
      recall: [
        {
          front: "Why is a queue built from two stacks amortised O(1) per operation?",
          back:
            "Each element moves from the in-stack to the out-stack at most once, and only when the " +
            "out-stack is empty — so n operations cost O(n) in total.",
        },
        {
          front: "In a circular array queue, what goes wrong if you track only head and tail?",
          back:
            "head == tail means both full and empty. Keep a size counter, or always leave one slot " +
            "unused.",
        },
        {
          front: "What does `st.pop()` return in C++, and why does it matter?",
          back: "Nothing — it is void. You must read `st.top()` before popping.",
        },
      ],
      resources: [
        {
          title: "Striver — implement a queue using stacks",
          url: `${TUF}/implement-a-queue-using-stacks`,
          kind: "read",
          minutes: 20,
          whyThisOne: "Both the push-heavy and pop-heavy versions, with the amortised argument spelled out.",
          isPrimary: true,
        },
        {
          title: "Striver — design a circular queue",
          url: `${TUF}/design-circular-queue`,
          kind: "read",
          minutes: 15,
          whyThisOne: "The modular-index bookkeeping, including the full-versus-empty case.",
        },
        {
          title: "VisuAlgo — stack, queue and deque",
          url: "https://visualgo.net/en/list",
          kind: "do",
          minutes: 10,
          whyThisOne: "Step through push and pop on each until the three rules are reflexes.",
        },
      ],
    },
    {
      slug: "dsa-sq-classics",
      title: "Parentheses, min stack & expression evaluation",
      objective:
        "Solve the matching, min-stack and postfix-evaluation family, and recognise when a stack is simulating something.",
      estMinutes: 75,
      conceptMd: `A stack is the right tool whenever **the most recent unresolved thing is the one you resolve next**. Three classics show it:

**Matching brackets.** Push openers; on a closer, the top must be its partner. Valid means every closer matched *and* the stack is empty at the end.

\`\`\`cpp
bool valid(const string &s) {
  stack<char> st;
  for (char c : s) {
    if (c == '(' || c == '[' || c == '{') st.push(c);
    else {
      if (st.empty()) return false;
      char o = st.top(); st.pop();
      if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;
    }
  }
  return st.empty();   // "(((" has no bad closer, and is still invalid
}
\`\`\`

**Min stack in O(1).** Store, with every element, the minimum *at the time it was pushed* — push \`{x, min(x, st.top().second)}\`. Popping then restores the previous minimum for free. A single "current min" variable fails the moment the minimum is popped.

**Postfix (RPN) evaluation.** Push numbers; on an operator, pop two, apply, push the result. **Order matters**: the first pop is the *right* operand — \`b = pop(); a = pop(); push(a - b)\`. Getting that backwards is the whole bug in subtraction and division.

**Simulation.** Asteroid collision is the same shape: the stack holds survivors moving right, and a left-mover fights the top until one side is gone. Whenever a new item can cancel the most recent survivors, reach for a stack.`,
      interviewAngle:
        "Valid Parentheses and Min Stack are warm-up favourites, and the follow-ups are predictable: " +
        "\"why not one min variable?\" and \"what about an empty stack at the end?\". Have both answers ready.",
      pitfalls: [
        "Returning true when every closer matched but openers remain. Check the stack is empty at the end.",
        "Tracking the minimum in a single variable. When that element is popped, the previous minimum is lost.",
        "Popping RPN operands in the wrong order. The first pop is the right-hand operand.",
        "Popping on a closer without checking the stack is empty first.",
      ],
      recall: [
        {
          front: "How does a min stack return the minimum in O(1) even after the minimum is popped?",
          back:
            "Each entry stores the minimum as of its push. Popping reveals the entry below, which " +
            "already carries the previous minimum.",
        },
        {
          front: "Evaluating RPN, you pop two operands for `-`. Which one is on the left?",
          back: "The second one popped. `b = pop(); a = pop(); push(a - b)`.",
        },
        {
          front: "Every closing bracket matched. Why can the string still be invalid?",
          back: "Unmatched openers may remain — \"(((\" — so the stack must also be empty at the end.",
        },
      ],
      resources: [
        {
          title: "Striver — balanced parentheses using a stack",
          url: `${TUF}/check-balanced-parentheses-using-a-stack`,
          kind: "read",
          minutes: 15,
          whyThisOne: "The canonical version, including the empty-stack checks people forget.",
          isPrimary: true,
        },
        {
          title: "Striver — evaluate reverse Polish notation",
          url: `${TUF}/evaluate-reverse-polish-notation`,
          kind: "read",
          minutes: 15,
          whyThisOne: "Operand order and integer division towards zero, both spelled out.",
        },
        {
          title: "Striver — asteroid collision",
          url: `${TUF}/asteroid-collision`,
          kind: "read",
          minutes: 20,
          whyThisOne: "The stack-as-simulation shape, which transfers to a whole family of cancellation problems.",
        },
      ],
    },
    {
      slug: "dsa-sq-monotonic",
      title: "The monotonic stack",
      objective:
        "Solve next-greater and stock-span style problems in O(n) with a monotonic stack, and explain why it is O(n).",
      estMinutes: 90,
      conceptMd: `"For each element, find the next element to its right that is greater" is O(n²) with two loops. The **monotonic stack** does it in O(n):

\`\`\`cpp
vector<int> nextGreater(const vector<int> &a) {
  int n = a.size();
  vector<int> res(n, -1);
  stack<int> st;                       // indices whose answer is still unknown
  for (int i = 0; i < n; i++) {
    while (!st.empty() && a[st.top()] < a[i]) {
      res[st.top()] = a[i];            // a[i] is the answer for everything it beats
      st.pop();
    }
    st.push(i);
  }
  return res;
}
\`\`\`

**The idea to keep:** the stack holds the elements *still waiting for an answer*. Because anything smaller than \`a[i]\` has just been answered and removed, the values left on the stack are always in decreasing order — that is what "monotonic" means, and it is a consequence, not a rule you enforce.

**Why O(n):** every index is pushed once and popped at most once. The inner \`while\` looks nested, but across the whole run it executes at most n times.

**Store indices, not values.** Indices give you the value (\`a[i]\`), the distance (\`i - j\`, which is what Daily Temperatures asks for) and the position to write the answer.

**The four variants** differ only in the comparison and the direction:

| want | scan | pop while top is |
|---|---|---|
| next greater | left → right | smaller than current |
| next smaller | left → right | larger than current |
| previous greater | left → right, read top *after* popping | ≤ current |
| circular (next greater II) | loop i from 0 to 2n−1, use \`i % n\` | smaller than current |

**Stock span** is "previous greater" in disguise: the span is the distance back to the previous day with a higher price.`,
      interviewAngle:
        "Monotonic stacks appear constantly and are rarely named in the problem. The trigger is \"for " +
        "each element, the nearest element to the left or right that is bigger or smaller\" — say that " +
        "out loud and the interviewer knows you have the pattern.",
      pitfalls: [
        "Storing values instead of indices, then being unable to compute distances or write answers.",
        "Arguing the nested while loop makes it O(n²). Each index is pushed and popped at most once.",
        "Getting `<` versus `<=` wrong, which silently mishandles equal values.",
        "Handling the circular variant by copying the array. Loop to 2n and index with `i % n` instead.",
      ],
      recall: [
        {
          front: "What does a monotonic stack actually hold during a next-greater scan?",
          back:
            "The indices still waiting for their answer. They end up in decreasing order of value " +
            "because every smaller one has just been answered and popped.",
        },
        {
          front: "The monotonic stack has a while loop inside a for loop. Why is it still O(n)?",
          back: "Each index is pushed once and popped at most once, so the inner loop runs at most n times in total.",
        },
        {
          front: "How do you solve Next Greater Element II, where the array is circular?",
          back: "Loop i from 0 to 2n − 1 and use i % n, pushing indices only on the first pass.",
        },
        {
          front: "Stock span is which monotonic-stack variant?",
          back: "Previous greater element: the span is the distance back to the last day with a higher price.",
        },
      ],
      resources: [
        {
          title: "Striver — next greater element",
          url: `${TUF}/next-greater-element`,
          kind: "read",
          minutes: 25,
          whyThisOne: "Builds the monotonic stack from the brute force, which is how you rebuild it under pressure.",
          isPrimary: true,
        },
        {
          title: "Striver — stock span problem",
          url: `${TUF}/stock-span-problem`,
          kind: "read",
          minutes: 15,
          whyThisOne: "The previous-greater variant, and the one most often disguised as a design question.",
        },
        {
          title: "USACO Guide — Stacks",
          url: "https://usaco.guide/gold/stacks",
          kind: "read",
          minutes: 20,
          whyThisOne: "A second framing of the nearest-smaller-values problem, with the proof of O(n).",
        },
      ],
    },
    {
      slug: "dsa-sq-histogram",
      title: "Histogram & contribution counting",
      objective:
        "Solve largest rectangle in a histogram and sum of subarray minimums by computing each element's reach with previous and next smaller.",
      estMinutes: 90,
      conceptMd: `Some of the best-known "hard" stack problems are one idea: **ask what each element contributes when it is the limiting one.**

**Largest rectangle in a histogram.** Every candidate rectangle is limited by its shortest bar. So for each bar \`i\`, the widest rectangle *with bar i as the shortest* stretches left to the previous smaller bar and right to the next smaller bar:

\`\`\`text
width(i) = nextSmaller(i) - prevSmaller(i) - 1
area(i)  = h[i] * width(i)
\`\`\`

Compute previous-smaller and next-smaller with two monotonic-stack passes (use -1 and n when none exists) and the answer is the maximum area — O(n). A single-pass version pops a bar, computes its area the moment its right boundary appears, and appends a sentinel height 0 at the end to flush the stack. Learn the two-pass version first; it is the one you can reason about.

**Sum of subarray minimums** is the same idea counted instead of maximised. Element \`a[i]\` is the minimum of exactly

\`\`\`text
left(i) * right(i)   subarrays,
left(i)  = i - prevSmaller(i)
right(i) = nextSmaller(i) - i
\`\`\`

so its contribution is \`a[i] * left * right\`, summed modulo 10⁹+7.

**Equal values double count** unless you break the tie: use *strictly* smaller on one side and *smaller-or-equal* on the other. Then each subarray's minimum is credited to exactly one of its equal minima.

Maximal Rectangle in a binary matrix is this problem run once per row, on heights that accumulate downwards.`,
      interviewAngle:
        "Largest Rectangle in Histogram is a genuine hard that is asked because it has one clean idea. " +
        "Explaining \"each bar as the shortest, extended to the nearest smaller on each side\" before " +
        "coding is most of the credit.",
      pitfalls: [
        "Forgetting the boundaries: previous smaller defaults to -1 and next smaller to n.",
        "Using strict comparisons on both sides in contribution counting, which double counts equal values.",
        "Overflowing the area or the sum. Heights times widths and contribution products need long long.",
        "Forgetting the modulo in sum of subarray minimums until the very end.",
      ],
      recall: [
        {
          front: "In largest rectangle in a histogram, what rectangle does each bar i define?",
          back:
            "The widest one in which bar i is the shortest: from just after the previous smaller bar " +
            "to just before the next smaller bar.",
        },
        {
          front: "In sum of subarray minimums, how many subarrays is a[i] the minimum of?",
          back: "(i − prevSmaller(i)) × (nextSmaller(i) − i).",
        },
        {
          front: "How do you stop equal values from being double counted in contribution problems?",
          back: "Break the tie: strictly smaller on one side, smaller-or-equal on the other.",
        },
      ],
      resources: [
        {
          title: "Striver — largest rectangle in a histogram",
          url: `${TUF}/largest-rectangle-in-histogram`,
          kind: "read",
          minutes: 30,
          whyThisOne: "Two-pass and one-pass versions, in that order — the order you should learn them in.",
          isPrimary: true,
        },
        {
          title: "Striver — sum of subarray minimums",
          url: `${TUF}/sum-of-subarray-minimums`,
          kind: "read",
          minutes: 25,
          whyThisOne: "The contribution technique with the tie-breaking rule made explicit.",
        },
      ],
    },
    {
      slug: "dsa-sq-deque",
      title: "The monotonic deque",
      objective:
        "Find the maximum of every window of size k in O(n) with a deque, and extend it to windows with a min-max constraint.",
      estMinutes: 75,
      conceptMd: `A sliding window whose answer is "the maximum in the window" cannot be updated with a running sum: when the maximum leaves, you need the next largest immediately. A heap would do it in O(n log k). A **monotonic deque** does it in O(n).

\`\`\`cpp
vector<int> windowMax(const vector<int> &a, int k) {
  deque<int> dq;                                   // indices, values decreasing
  vector<int> res;
  for (int i = 0; i < (int)a.size(); i++) {
    if (!dq.empty() && dq.front() <= i - k) dq.pop_front();          // left the window
    while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();       // can never be max again
    dq.push_back(i);
    if (i >= k - 1) res.push_back(a[dq.front()]);
  }
  return res;
}
\`\`\`

Two removals, from two ends, for two different reasons:

- **From the back**: an older element that is ≤ the new one can never be a window maximum again — the new one is larger *and* will stay in the window longer. That is the monotonic part.
- **From the front**: the front index has slid out of the window. That is the window part.

The front is always the current maximum. Every index enters and leaves the deque once, so the whole scan is O(n).

**Min and max together.** "Longest subarray where max − min ≤ limit" keeps *two* deques — one decreasing for the max, one increasing for the min — inside a variable-size window. When \`max - min > limit\`, advance the left edge and drop fronts that fall behind it.`,
      interviewAngle:
        "Sliding Window Maximum is the standard hard that separates candidates who know the heap " +
        "answer from those who know the O(n) one. Explaining why an element can be discarded from the " +
        "back is the part interviewers listen for.",
      pitfalls: [
        "Storing values instead of indices, which makes it impossible to tell when the front has left the window.",
        "Checking the front for expiry after reading the answer, so the answer comes from outside the window.",
        "Popping from the back with `<` instead of `<=` — it works, but keeps duplicates you did not need.",
        "Reaching for a multiset or heap and stopping there. Both work; the deque is the O(n) answer they want.",
      ],
      recall: [
        {
          front: "In the sliding-window-maximum deque, why can an element be dropped from the back?",
          back:
            "A newer element at least as large has arrived. It is bigger and stays in the window " +
            "longer, so the older one can never be the maximum again.",
        },
        {
          front: "What two reasons remove an index from the monotonic deque, and from which ends?",
          back:
            "From the back when a new larger element makes it useless; from the front when it has " +
            "slid out of the window.",
        },
        {
          front: "How do you track both the window max and min in O(n)?",
          back: "Two monotonic deques — one decreasing for the max, one increasing for the min.",
        },
      ],
      resources: [
        {
          title: "cp-algorithms — Minimum stack / minimum queue",
          url: "https://cp-algorithms.com/data_structures/stack_queue_modification.html",
          kind: "read",
          minutes: 25,
          whyThisOne: "Derives the monotonic deque from the min-stack you already know, which is the connection that makes it stick.",
          isPrimary: true,
        },
        {
          title: "Striver — longest subarray with absolute difference ≤ limit",
          url: `${TUF}/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit`,
          kind: "read",
          minutes: 20,
          whyThisOne: "The two-deque extension inside a variable-size window.",
        },
        {
          title: "cppreference — std::deque",
          url: "https://en.cppreference.com/w/cpp/container/deque",
          kind: "docs",
          whyThisOne: "Both ends are O(1), which is the entire reason this works.",
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-queue-using-stacks", title: "Implement Queue using Stacks", platform: "leetcode", url: "https://leetcode.com/problems/implement-queue-using-stacks/", difficulty: "easy", patternTag: "stack", triggerHint: "FIFO behaviour from LIFO parts, with an amortised bound.", approachHint: "Two stacks. Push onto in; pop from out, refilling out from in only when out is empty.", estMinutes: 15, unitSlug: "dsa-sq-mechanics" },
    { slug: "lc-stack-using-queues", title: "Implement Stack using Queues", platform: "leetcode", url: "https://leetcode.com/problems/implement-stack-using-queues/", difficulty: "easy", patternTag: "queue", triggerHint: "LIFO from a FIFO part.", approachHint: "One queue: after pushing x, rotate the previous size elements behind it so x is at the front.", estMinutes: 15, unitSlug: "dsa-sq-mechanics" },
    { slug: "lc-design-circular-queue", title: "Design Circular Queue", platform: "leetcode", url: "https://leetcode.com/problems/design-circular-queue/", difficulty: "medium", patternTag: "queue", triggerHint: "A fixed-capacity FIFO on an array.", approachHint: "Keep head and a count; tail is (head + count) % k. The count is what separates full from empty.", estMinutes: 20, unitSlug: "dsa-sq-mechanics" },
    { slug: "lc-valid-parentheses", title: "Valid Parentheses", platform: "leetcode", url: "https://leetcode.com/problems/valid-parentheses/", difficulty: "easy", patternTag: "stack", triggerHint: "Nested pairs that must close in reverse order.", approachHint: "Push openers; a closer must match the top. Valid only if the stack ends empty.", estMinutes: 10, unitSlug: "dsa-sq-classics" },
    { slug: "lc-min-stack", title: "Min Stack", platform: "leetcode", url: "https://leetcode.com/problems/min-stack/", difficulty: "medium", patternTag: "stack", triggerHint: "The minimum in O(1), surviving pops.", approachHint: "Push pairs {x, min so far}. The top's second field is always the current minimum.", estMinutes: 20, unitSlug: "dsa-sq-classics" },
    { slug: "lc-evaluate-rpn", title: "Evaluate Reverse Polish Notation", platform: "leetcode", url: "https://leetcode.com/problems/evaluate-reverse-polish-notation/", difficulty: "medium", patternTag: "stack", triggerHint: "Postfix expression, operators after operands.", approachHint: "Push numbers; on an operator pop b then a and push a op b. Division truncates toward zero.", estMinutes: 20, unitSlug: "dsa-sq-classics" },
    { slug: "lc-asteroid-collision", title: "Asteroid Collision", platform: "leetcode", url: "https://leetcode.com/problems/asteroid-collision/", difficulty: "medium", patternTag: "stack", triggerHint: "New items can cancel the most recent survivors.", approachHint: "Stack of survivors. A left-mover fights right-moving tops until it dies, they die, or they tie.", estMinutes: 25, unitSlug: "dsa-sq-classics" },
    { slug: "lc-next-greater-element-i", title: "Next Greater Element I", platform: "leetcode", url: "https://leetcode.com/problems/next-greater-element-i/", difficulty: "easy", patternTag: "monotonic-stack", triggerHint: "For each element, the next larger one to its right.", approachHint: "Monotonic stack over nums2 recording answers in a map; then look up each element of nums1.", estMinutes: 15, unitSlug: "dsa-sq-monotonic" },
    { slug: "lc-next-greater-element-ii", title: "Next Greater Element II", platform: "leetcode", url: "https://leetcode.com/problems/next-greater-element-ii/", difficulty: "medium", patternTag: "monotonic-stack", triggerHint: "Next greater, but the array wraps around.", approachHint: "Loop i to 2n − 1 using i % n; only push indices during the first pass.", estMinutes: 20, unitSlug: "dsa-sq-monotonic" },
    { slug: "lc-daily-temperatures", title: "Daily Temperatures", platform: "leetcode", url: "https://leetcode.com/problems/daily-temperatures/", difficulty: "medium", patternTag: "monotonic-stack", triggerHint: "How many days until a warmer one — a distance to the next greater.", approachHint: "Stack of indices; when today beats the top, its answer is today's index minus its index.", estMinutes: 20, unitSlug: "dsa-sq-monotonic" },
    { slug: "lc-online-stock-span", title: "Online Stock Span", platform: "leetcode", url: "https://leetcode.com/problems/online-stock-span/", difficulty: "medium", patternTag: "monotonic-stack", triggerHint: "A streaming previous-greater query.", approachHint: "Stack of {price, span}; pop while top price ≤ today, adding their spans to today's.", estMinutes: 25, unitSlug: "dsa-sq-monotonic" },
    { slug: "lc-largest-rectangle-histogram", title: "Largest Rectangle in Histogram", platform: "leetcode", url: "https://leetcode.com/problems/largest-rectangle-in-histogram/", difficulty: "hard", patternTag: "monotonic-stack", triggerHint: "Maximise width × the minimum height over a range.", approachHint: "For each bar as the shortest, width = nextSmaller − prevSmaller − 1. Two monotonic passes.", estMinutes: 40, unitSlug: "dsa-sq-histogram" },
    { slug: "lc-sum-subarray-minimums", title: "Sum of Subarray Minimums", platform: "leetcode", url: "https://leetcode.com/problems/sum-of-subarray-minimums/", difficulty: "medium", patternTag: "contribution", triggerHint: "A sum over all subarrays of their minimum.", approachHint: "a[i] × (i − prevSmaller) × (nextSmaller − i); strict on one side, ≤ on the other. Modulo 1e9+7.", estMinutes: 35, unitSlug: "dsa-sq-histogram" },
    { slug: "lc-sliding-window-maximum", title: "Sliding Window Maximum", platform: "leetcode", url: "https://leetcode.com/problems/sliding-window-maximum/", difficulty: "hard", patternTag: "monotonic-deque", triggerHint: "The maximum of every window of size k.", approachHint: "Deque of indices with decreasing values; drop expired fronts and smaller backs. Front is the max.", estMinutes: 35, unitSlug: "dsa-sq-deque" },
    { slug: "lc-longest-subarray-abs-diff-limit", title: "Longest Continuous Subarray With Absolute Diff ≤ Limit", platform: "leetcode", url: "https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/", difficulty: "medium", patternTag: "monotonic-deque", triggerHint: "A variable window constrained by its max minus its min.", approachHint: "Two deques for max and min. Shrink from the left while max − min > limit.", estMinutes: 35, unitSlug: "dsa-sq-deque" },
  ],
};
