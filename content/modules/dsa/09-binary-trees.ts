import type { Module } from "@/content/types";

export const binaryTrees: Module = {
  slug: "dsa-binary-trees",
  trackSlug: "dsa",
  phaseSlug: "depth",
  order: 2,
  title: "Binary trees",
  summary:
    "The most-asked data structure in interviews at this band. Almost every tree problem is one recursive function that asks its children a question and combines the answers — learn to decide what that question is, and the family collapses into a handful of shapes.",
  prereqSlugs: ["dsa-recursion-backtracking"],
  units: [
    {
      slug: "dsa-bt-traversals",
      title: "Traversals, recursive and iterative",
      objective:
        "Write preorder, inorder and postorder recursively and with an explicit stack, and say which order a problem needs.",
      estMinutes: 75,
      primer: `A **binary tree** is made of nodes where each node has a value and up to two children, *left* and *right*. The top node is the **root**; nodes with no children are **leaves**. Like a linked list, it is built from nodes and pointers — just with two \`next\` pointers instead of one.

Nearly every tree problem is solved by **recursion**: to answer a question about a tree, answer it for the left subtree and the right subtree (which are smaller trees), then combine.

To visit every node you choose an order. The three depth-first orders differ only in *when* you handle the node itself: **preorder** (node, then left, then right), **inorder** (left, node, right), **postorder** (left, right, node).

**You need already:** recursion from Phase 1, and linked-list pointers.`,
      conceptMd: `The three depth-first orders differ only in **when you visit the node** relative to its children:

| order | visit | used when |
|---|---|---|
| **preorder** | node, left, right | copying or serialising a tree; the parent must be known first |
| **inorder** | left, node, right | a BST — it yields keys in sorted order |
| **postorder** | left, right, node | the parent needs its children's answers first (height, deletion) |

Recursively, each is three lines. **Interviewers ask for the iterative versions**, because they show you understand that recursion *is* a stack:

\`\`\`cpp
vector<int> inorder(TreeNode *root) {
  vector<int> out;
  stack<TreeNode*> st;
  TreeNode *cur = root;
  while (cur || !st.empty()) {
    while (cur) { st.push(cur); cur = cur->left; }   // go as far left as possible
    cur = st.top(); st.pop();
    out.push_back(cur->val);                          // visit
    cur = cur->right;                                 // then the right subtree
  }
  return out;
}
\`\`\`

**Iterative preorder** is simpler: pop, visit, push *right then left* (so left comes out first). **Iterative postorder** is easiest as a reversed "node, right, left" preorder — or with one stack and a \`prev\` pointer if you are asked not to reverse.

**Complexity:** O(n) time, O(h) space for the stack, where h is the height — O(log n) for a balanced tree and O(n) for a skewed one. Say "O(h)", then say what h is.

Morris traversal gets inorder to O(1) extra space by temporarily threading right pointers back to ancestors. It is worth knowing exists; it is rarely required.`,
      interviewAngle:
        "\"Now do it without recursion\" is the standard follow-up to any traversal. Having the " +
        "iterative inorder loop cold — go left, pop, visit, go right — makes that follow-up a " +
        "formality.",
      pitfalls: [
        "Pushing left before right in iterative preorder. The stack reverses order — push right first.",
        "Stating O(log n) space. It is O(h), which is O(n) for a skewed tree.",
        "Using preorder where a BST problem needs inorder, and losing the sorted order.",
        "An iterative inorder loop condition of `!st.empty()` alone — it exits immediately on a fresh start.",
      ],
      recall: [
        {
          front: "Which traversal order do you use when a node needs its children's answers first?",
          back: "Postorder — left, right, then node. Height, diameter and deletion all have this shape.",
        },
        {
          front: "In iterative preorder with one stack, which child do you push first, and why?",
          back: "The right child. A stack reverses order, so pushing right first makes left come out first.",
        },
        {
          front: "What is the extra space of a recursive traversal, stated precisely?",
          back: "O(h), the tree's height — O(log n) when balanced, O(n) when skewed.",
        },
      ],
      resources: [
        {
          title: "Striver — Binary tree: types, structure and terminology",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/binary-tree-data-structure",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "The vocabulary from zero — root, leaf, height, depth, and the kinds of binary tree.",
          steps: [
            "Read **Introduction and Basics of Binary Trees** and **Basic Terminology**.",
            "Draw a 7-node tree and label its root, leaves, and each node's depth and height.",
            "Skim **Types of Binary Trees**.",
            "Then read *Introduction to DFS traversals* (next link) — the three orders.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Introduction to DFS traversals",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/introduction-to-dfs-traversals",
          kind: "read",
          minutes: 35,
          whyThisOne:
            "All three orders side by side, recursive and then iterative with a stack.",
          steps: [
            "Read **Recursive DFS Structure** and write each order's output for your drawn tree.",
            "Read **Iterative DFS Using a Stack** — preorder first, it is the simplest.",
          ],
        },
        {
          title: "Striver — Morris inorder traversal",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/morris-inorder-traversal",
          kind: "read",
          whyThisOne:
            "Optional, for the O(1)-space follow-up: know it exists and roughly how it works.",
        },
      ],
    },
    {
      slug: "dsa-bt-level-order",
      title: "Level order & the views",
      objective:
        "Do breadth-first traversal level by level, and derive zigzag, right view and vertical order from it.",
      estMinutes: 90,
      primer: `**Level order** traversal visits the tree row by row: the root, then its children, then their children. It uses a **queue**: take a node off the front, handle it, put its children on the back.

The trick that unlocks most problems in this unit: before handling a level, **read the queue's size**. That number is exactly how many nodes are on the current level, so you can process one whole level per loop.

With that you get, almost for free: the **zigzag** order (reverse every other level), the **right-side view** (the last node of each level), and the **left view** (the first).

**You need already:** queues, and the tree vocabulary from the last unit.`,
      conceptMd: `Breadth-first traversal uses a **queue**, and the trick that unlocks most level problems is to process **one whole level per iteration** by reading the queue's size first:

\`\`\`cpp
vector<vector<int>> levels(TreeNode *root) {
  vector<vector<int>> out;
  if (!root) return out;
  queue<TreeNode*> q; q.push(root);
  while (!q.empty()) {
    int sz = q.size();                  // freeze the size: this is one level
    vector<int> level;
    for (int i = 0; i < sz; i++) {
      TreeNode *n = q.front(); q.pop();
      level.push_back(n->val);
      if (n->left)  q.push(n->left);
      if (n->right) q.push(n->right);
    }
    out.push_back(level);
  }
  return out;
}
\`\`\`

From that loop:

- **Zigzag**: reverse every other level, or fill each level's vector from alternating ends.
- **Right view**: the last node of each level. **Left view**: the first.
- **Minimum depth**: the first level containing a leaf — BFS finds it without visiting the whole tree.

**Vertical order** needs coordinates. Give the root column 0; a left child is column − 1, a right child column + 1. Collect nodes by column (and by row within a column) and read columns left to right. The **top view** is the first node seen in each column during BFS; the **bottom view** is the last. LeetCode's vertical-order problem also sorts equal (row, column) nodes by value — read the statement, because the variants differ in exactly that tie-break.

Views can also be done with DFS, carrying the depth and recording the first node seen at each depth. BFS is the version to reach for first: level is built into it.`,
      interviewAngle:
        "Level-order is the second tree question after traversal, and the views are how it is made " +
        "harder. Explaining \"freeze the queue size, that is one level\" covers most of them.",
      pitfalls: [
        "Reading `q.size()` inside the loop condition while also pushing — the level boundary moves.",
        "Forgetting the null root, then dereferencing it on the first pop.",
        "Assuming the right view is the rightmost path. A left subtree can be deeper and show through.",
        "Ignoring the tie-break in vertical order: equal row and column means sort by value.",
      ],
      recall: [
        {
          front: "How does a BFS loop process exactly one level per iteration?",
          back: "Read the queue's size before the inner loop and pop exactly that many nodes.",
        },
        {
          front: "Why is the right view not just the path following right children?",
          back: "A deeper left subtree can be visible from the right; the view is the last node of every level.",
        },
        {
          front: "What coordinates does vertical-order traversal assign to each node?",
          back: "Root column 0; left child column − 1, right child column + 1, with the depth as the row.",
        },
      ],
      resources: [
        {
          title: "Striver — Binary tree level order traversal",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/binary-tree-level-order-traversal",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "The size-first loop that every other problem in this unit reuses.",
          steps: [
            "Read up to **Returning Nodes Level by Level** and **Why Must the Queue Size Be Recorded First?**",
            "Write it yourself and print one line per level.",
            "Read **Common Variations** — reverse level order, zigzag, left view.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Left and right views of a binary tree",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/left-and-right-views-of-a-binary-tree",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "Both the level-order version and the depth-tracking recursive one.",
        },
        {
          title: "Striver — Vertical order traversal",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/vertical-order-traversal-of-a-binary-tree",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "Giving each node a column number, and the tie-break rule for equal positions.",
        },
      ],
    },
    {
      slug: "dsa-bt-height",
      title: "Height, diameter, balance & max path sum",
      objective:
        "Solve height-based problems with one postorder pass that returns one value and updates a global answer.",
      estMinutes: 90,
      primer: `The **height** of a tree is the number of nodes on its longest path from the root down to a leaf. Recursively: height = 1 + the larger of the left and right subtree heights, and an empty tree has height 0. Four lines of code.

Many harder problems are this same function with one extra line. The **diameter** — the longest path between *any* two nodes — passes through some node, going down its left side and its right side. So while computing heights, at each node also check \`leftHeight + rightHeight\` and keep the best in a variable outside the function.

That shape — **return one thing to the parent, update a global answer on the side** — also solves "is the tree balanced?" and the maximum path sum.

**You need already:** tree recursion from the traversal unit.`,
      conceptMd: `This family has one shape. A recursive function **returns something to its parent** and **updates a global answer on the side**:

\`\`\`cpp
int best = 0;
int height(TreeNode *n) {                 // returns: height of this subtree
  if (!n) return 0;
  int l = height(n->left), r = height(n->right);
  best = max(best, l + r);                // side effect: longest path through n
  return 1 + max(l, r);
}
// diameter = best, after height(root)
\`\`\`

The distinction that solves every problem here: **what the parent needs** (a path going *down* from this node) is different from **what the answer is** (a path that may bend *through* this node). The return value carries the first; the global carries the second.

- **Diameter**: return height; answer is \`l + r\` at the bending node (in edges).
- **Balanced**: return height, or -1 if any subtree is unbalanced; short-circuit on -1. Checking balance by calling height from every node is O(n²) — this is O(n).
- **Maximum path sum**: return the best *downward* sum, which may drop a negative child: \`max(0, l)\`. Answer is \`n->val + max(0,l) + max(0,r)\`. The downward value can use only one child — a path cannot fork.
- **Symmetric**: a different shape — compare two subtrees as mirror images, \`left->left\` with \`right->right\` and \`left->right\` with \`right->left\`.

The naive version of each calls a helper from every node — O(n²). The postorder version visits each node once — O(n). Interviewers ask for the second.`,
      interviewAngle:
        "Diameter and Binary Tree Maximum Path Sum are the two most-asked problems in this shape. " +
        "Saying \"the return value is the downward path; the answer is the path that bends here\" " +
        "before writing code is the signal they are looking for.",
      pitfalls: [
        "Returning the bent path to the parent. The parent can only extend a downward path — one child.",
        "Checking balance by computing height separately at every node: O(n²).",
        "Keeping negative child sums in max path sum. Clamp with max(0, ·).",
        "Initialising the maximum path sum to 0. An all-negative tree needs INT_MIN or the root's value.",
      ],
      recall: [
        {
          front: "In diameter and max path sum, what is the difference between the return value and the answer?",
          back:
            "The return value is the best downward path, which the parent can extend. The answer is " +
            "the best path bending through the node, kept in a global.",
        },
        {
          front: "How do you check whether a tree is balanced in O(n) rather than O(n²)?",
          back: "One postorder pass returning the height, or −1 as soon as any subtree is unbalanced.",
        },
        {
          front: "In binary tree max path sum, why clamp each child's contribution with max(0, ·)?",
          back: "A negative subtree only makes the path worse; the path is better off not extending into it.",
        },
      ],
      resources: [
        {
          title: "Striver — Diameter of a binary tree",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/diameter-of-a-binary-tree",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "From computing heights again at every node, O(n²), to one pass — exactly the move to learn.",
          steps: [
            "Read the problem and examples, and try it yourself for 10–15 minutes.",
            "Read the approaches in order — brute force first — following each **Dry Run** on paper.",
            "Write the one-pass version from memory, then use the same shape on *Balanced Binary Tree*.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Check if a binary tree is height-balanced",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/check-if-a-binary-tree-is-height-balanced",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "Returning −1 to mean 'unbalanced' turns two passes into one.",
        },
        {
          title: "Striver — Binary tree maximum path sum",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/binary-tree-maximum-path-sum",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "The same shape, plus ignoring negative branches.",
        },
      ],
    },
    {
      slug: "dsa-bt-paths-lca",
      title: "Root-to-node paths & the lowest common ancestor",
      objective:
        "Collect root-to-leaf paths with backtracking, find the LCA of two nodes in one pass, and find all nodes at distance k.",
      estMinutes: 90,
      primer: `Two questions about positions in a tree.

**Paths**: list every path from the root down to a leaf. This is backtracking on a tree: add the node to the current path, go into both children, then remove the node before returning — the same pattern as subsets in Phase 1.

**Lowest common ancestor (LCA)**: given two nodes, find the deepest node that has both of them below it. Ask each subtree "did you find either node?". If the left finds one and the right finds the other, the current node is the answer. If only one side finds something, pass that up.

A related question — "all nodes at distance k from a given node" — needs to move *upward* too, so you first record each node's parent, turning the tree into a graph you can search in every direction.

**You need already:** tree recursion, and backtracking from Phase 1.`,
      conceptMd: `**Root-to-leaf paths** are backtracking on a tree: push the node, recurse, pop.

\`\`\`cpp
void paths(TreeNode *n, int target, vector<int> &cur, vector<vector<int>> &out) {
  if (!n) return;
  cur.push_back(n->val);
  if (!n->left && !n->right && target == n->val) out.push_back(cur);   // a leaf
  paths(n->left,  target - n->val, cur, out);
  paths(n->right, target - n->val, cur, out);
  cur.pop_back();                                                      // undo
}
\`\`\`

A **leaf** has no children. A node with one null child is not a leaf, and treating it as one is the standard Path Sum bug.

**Lowest common ancestor** of p and q, in one pass:

\`\`\`cpp
TreeNode* lca(TreeNode *n, TreeNode *p, TreeNode *q) {
  if (!n || n == p || n == q) return n;
  TreeNode *l = lca(n->left, p, q), *r = lca(n->right, p, q);
  if (l && r) return n;          // p and q found on different sides: n is the split
  return l ? l : r;              // otherwise pass up whichever side found something
}
\`\`\`

Read the return value as "a node from {p, q, their LCA} found in this subtree, or null". The first node where both sides report something is the LCA. If p is an ancestor of q, it returns p at once — which is correct, because a node is its own ancestor.

**All nodes at distance k** needs to move *upwards*, which a tree does not allow. So first record every node's parent in a map with a BFS or DFS, then run a BFS from the target over three neighbours — left, right and parent — with a visited set, stopping at depth k. This "tree as undirected graph" move also solves minimum time to burn a tree.`,
      interviewAngle:
        "LCA of a binary tree is among the most-asked tree questions at every level, and the " +
        "interviewer usually asks what the return value means. \"A node from p, q or their LCA found " +
        "below here, or null\" is the answer that makes the code obviously correct.",
      pitfalls: [
        "Treating a node with one child as a leaf in path problems.",
        "Forgetting to pop after recursing, so paths leak into siblings.",
        "Copying the path vector at every call instead of pushing and popping one shared buffer.",
        "Trying to walk upwards without a parent map in distance-k problems.",
      ],
      recall: [
        {
          front: "In the one-pass LCA recursion, what does the return value mean?",
          back:
            "A node from {p, q, their LCA} found in this subtree, or null. The first node where both " +
            "sides return non-null is the LCA.",
        },
        {
          front: "How do you find all nodes at distance k from a target in a binary tree?",
          back:
            "Map each node to its parent, then BFS from the target over left, right and parent with a " +
            "visited set, stopping at depth k.",
        },
        {
          front: "What is the definition of a leaf, and which bug comes from getting it wrong?",
          back:
            "A node with no children. Treating a one-child node as a leaf makes Path Sum accept paths " +
            "that stop halfway.",
        },
      ],
      resources: [
        {
          title: "Striver — Lowest common ancestor in a binary tree",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/lowest-common-ancestor-in-a-binary-tree",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "Comparing root-to-node paths first, then the one-pass recursion — the order that makes it make sense.",
          steps: [
            "Read the problem and examples, and try it yourself for 10–15 minutes.",
            "Read the approaches in order — brute force first — following each **Dry Run** on paper.",
            "Answer *Why does the recursive approach return the current node when both subtree results are non-null?*",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Path sum II",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/path-sum-ii",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "Backtracking on a tree, with the leaf check done properly.",
        },
        {
          title: "Striver — Nodes at distance k",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/nodes-distance-k-binary-tree",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "A parent map plus BFS turns the tree into an undirected graph.",
        },
      ],
    },
    {
      slug: "dsa-bt-build-serialize",
      title: "Building & serialising trees",
      objective:
        "Rebuild a tree from preorder and inorder in O(n), and serialise and deserialise a tree so the round trip is exact.",
      estMinutes: 90,
      primer: `Can you rebuild a tree from its traversals? With **preorder and inorder** together, yes.

Preorder always lists the root first. Find that root in the inorder list: everything to its left belongs to the left subtree, everything to its right to the right subtree. Now you know each subtree's size, so you can split the preorder list the same way and rebuild each subtree recursively. A map from value to inorder position makes each lookup O(1).

**Serialising** means turning a tree into a string you can save or send, and **deserialising** turns it back. The trick is to write an explicit marker (like \`#\`) for every missing child, so the shape comes back exactly.

**You need already:** the traversal orders, and tree recursion.`,
      conceptMd: `**Which traversals determine a tree?** Inorder plus preorder does, and inorder plus postorder does. Preorder plus postorder does not, in general — without inorder you cannot tell a lone left child from a lone right child.

**Building from preorder and inorder.** Preorder's first element is the root. Find it in inorder: everything to its left is the left subtree, everything to its right the right subtree. Recurse on the matching ranges.

\`\`\`cpp
unordered_map<int,int> pos;   // value -> index in inorder, built once
int pre = 0;
TreeNode* build(vector<int> &preorder, int lo, int hi) {   // inorder range [lo, hi]
  if (lo > hi) return nullptr;
  TreeNode *root = new TreeNode(preorder[pre++]);
  int mid = pos[root->val];
  root->left  = build(preorder, lo, mid - 1);    // left first: preorder order
  root->right = build(preorder, mid + 1, hi);
  return root;
}
\`\`\`

Searching inorder linearly at every step is O(n²); the hash map of positions makes it O(n). Building left before right matters, because it consumes preorder in the right sequence. This relies on distinct values — say so.

**Serialise and deserialise.** Write the preorder **with explicit null markers**, so the shape is recoverable without a second traversal:

\`\`\`text
    1
   / \\        ->  "1,2,#,#,3,4,#,#,5,#,#"
  2   3
     / \\
    4   5
\`\`\`

Deserialise by reading tokens in the same order: a \`#\` returns null; a number makes a node, then builds its left and right from the following tokens. Level-order with nulls works too, and is what LeetCode displays.

The null markers are the whole point. Without them a single traversal is ambiguous.`,
      interviewAngle:
        "Serialize and Deserialize Binary Tree is a design-flavoured hard asked for the null-marker " +
        "insight. Building from preorder and inorder is asked for the hash-map optimisation and the " +
        "question \"which pairs of traversals are enough?\".",
      pitfalls: [
        "Searching the inorder array linearly at every step — O(n²). Precompute value → index.",
        "Building the right subtree before the left while consuming preorder from the front.",
        "Serialising without null markers, so two different trees produce the same string.",
        "Assuming values are distinct without saying so; duplicates break the inorder lookup.",
      ],
      recall: [
        {
          front: "Which pairs of traversals uniquely determine a binary tree?",
          back:
            "Inorder with preorder, or inorder with postorder. Preorder with postorder does not in " +
            "general, because a single child could be left or right.",
        },
        {
          front: "Rebuilding from preorder and inorder, what makes it O(n) instead of O(n²)?",
          back: "A hash map from value to inorder index, so the root's split point is found in O(1).",
        },
        {
          front: "Why does a serialised tree need null markers?",
          back: "Without them a single traversal cannot recover the shape — different trees give the same sequence.",
        },
      ],
      resources: [
        {
          title: "Striver — Construct a binary tree from preorder and inorder",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/construct-a-binary-tree-from-preorder-and-inorder",
          kind: "do",
          minutes: 40,
          whyThisOne:
            "The recursion over index ranges, with the hash map, drawn out step by step.",
          steps: [
            "Read the problem and examples, and try it yourself for 10–15 minutes.",
            "Read the approaches in order — brute force first — following each **Dry Run** on paper.",
            "Answer *Why is inorder required along with preorder?* and *What happens when inStart > inEnd?*",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Serialize and deserialize a binary tree",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/serialize-and-deserialize-a-binary-tree",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "The null-marker encoding and its exact inverse.",
        },
        {
          title: "Striver — What is needed to construct a unique binary tree",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/requirements-needed-to-construct-a-unique-binary-tree",
          kind: "read",
          minutes: 10,
          whyThisOne:
            "The short theory answer to 'which pairs of traversals are enough?'.",
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-bt-preorder", title: "Binary Tree Preorder Traversal", platform: "leetcode", url: "https://leetcode.com/problems/binary-tree-preorder-traversal/", difficulty: "easy", patternTag: "tree-traversal", triggerHint: "Visit the node before its children.", approachHint: "Recursive, then iterative: pop, visit, push right then left.", estMinutes: 15, unitSlug: "dsa-bt-traversals" },
    { slug: "lc-bt-inorder", title: "Binary Tree Inorder Traversal", platform: "leetcode", url: "https://leetcode.com/problems/binary-tree-inorder-traversal/", difficulty: "easy", patternTag: "tree-traversal", triggerHint: "Left, node, right — the sorted order of a BST.", approachHint: "Iterative: go left pushing, pop and visit, then move to the right child.", estMinutes: 15, unitSlug: "dsa-bt-traversals" },
    { slug: "lc-bt-postorder", title: "Binary Tree Postorder Traversal", platform: "leetcode", url: "https://leetcode.com/problems/binary-tree-postorder-traversal/", difficulty: "easy", patternTag: "tree-traversal", triggerHint: "Children before the node.", approachHint: "Iterative: do node-right-left with a stack and reverse the output.", estMinutes: 20, unitSlug: "dsa-bt-traversals" },
    { slug: "lc-bt-level-order", title: "Binary Tree Level Order Traversal", platform: "leetcode", url: "https://leetcode.com/problems/binary-tree-level-order-traversal/", difficulty: "medium", patternTag: "bfs", triggerHint: "Nodes grouped by depth.", approachHint: "Queue; read its size at the start of each level and pop exactly that many.", estMinutes: 20, unitSlug: "dsa-bt-level-order" },
    { slug: "lc-bt-zigzag", title: "Binary Tree Zigzag Level Order Traversal", platform: "leetcode", url: "https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/", difficulty: "medium", patternTag: "bfs", triggerHint: "Level order, alternating direction.", approachHint: "Level-order BFS; reverse every other level, or fill each level from alternating ends.", estMinutes: 20, unitSlug: "dsa-bt-level-order" },
    { slug: "lc-bt-right-view", title: "Binary Tree Right Side View", platform: "leetcode", url: "https://leetcode.com/problems/binary-tree-right-side-view/", difficulty: "medium", patternTag: "bfs", triggerHint: "The node visible at each depth from one side.", approachHint: "Last node of each BFS level — or DFS right-first, recording the first node at each new depth.", estMinutes: 20, unitSlug: "dsa-bt-level-order" },
    { slug: "lc-bt-vertical-order", title: "Vertical Order Traversal of a Binary Tree", platform: "leetcode", url: "https://leetcode.com/problems/vertical-order-traversal-of-a-binary-tree/", difficulty: "hard", patternTag: "bfs", triggerHint: "Group nodes by column, then row, then value.", approachHint: "Assign (column, row) coordinates; collect into map<col, map<row, multiset<val>>>, then read in order.", estMinutes: 40, unitSlug: "dsa-bt-level-order" },
    { slug: "lc-max-depth-bt", title: "Maximum Depth of Binary Tree", platform: "leetcode", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/", difficulty: "easy", patternTag: "tree-dfs", triggerHint: "The height of the tree.", approachHint: "1 + max(depth(left), depth(right)); the base case is a null node at depth 0.", estMinutes: 10, unitSlug: "dsa-bt-height" },
    { slug: "lc-diameter-bt", title: "Diameter of Binary Tree", platform: "leetcode", url: "https://leetcode.com/problems/diameter-of-binary-tree/", difficulty: "easy", patternTag: "tree-dfs", triggerHint: "The longest path between any two nodes, which may not pass the root.", approachHint: "Return height; at each node update the answer with left height + right height.", estMinutes: 20, unitSlug: "dsa-bt-height" },
    { slug: "lc-balanced-bt", title: "Balanced Binary Tree", platform: "leetcode", url: "https://leetcode.com/problems/balanced-binary-tree/", difficulty: "easy", patternTag: "tree-dfs", triggerHint: "Every node's subtree heights differ by at most one.", approachHint: "One postorder pass returning height, or −1 as soon as any subtree is unbalanced.", estMinutes: 15, unitSlug: "dsa-bt-height" },
    { slug: "lc-symmetric-tree", title: "Symmetric Tree", platform: "leetcode", url: "https://leetcode.com/problems/symmetric-tree/", difficulty: "easy", patternTag: "tree-dfs", triggerHint: "A tree that is its own mirror.", approachHint: "Compare two subtrees: outer pair (left.left, right.right) and inner pair (left.right, right.left).", estMinutes: 15, unitSlug: "dsa-bt-height" },
    { slug: "lc-bt-max-path-sum", title: "Binary Tree Maximum Path Sum", platform: "leetcode", url: "https://leetcode.com/problems/binary-tree-maximum-path-sum/", difficulty: "hard", patternTag: "tree-dfs", triggerHint: "The best-sum path between any two nodes, values may be negative.", approachHint: "Return val + max(0, best child downward); update the answer with val + max(0,l) + max(0,r).", estMinutes: 35, unitSlug: "dsa-bt-height" },
    { slug: "lc-path-sum", title: "Path Sum", platform: "leetcode", url: "https://leetcode.com/problems/path-sum/", difficulty: "easy", patternTag: "tree-dfs", triggerHint: "Does any root-to-leaf path add up to the target.", approachHint: "Subtract as you descend; check target == val only at a true leaf.", estMinutes: 10, unitSlug: "dsa-bt-paths-lca" },
    { slug: "lc-path-sum-ii", title: "Path Sum II", platform: "leetcode", url: "https://leetcode.com/problems/path-sum-ii/", difficulty: "medium", patternTag: "backtracking", triggerHint: "All root-to-leaf paths with the target sum.", approachHint: "Push, recurse left and right, pop. Record the path at a leaf where the remaining target equals the value.", estMinutes: 25, unitSlug: "dsa-bt-paths-lca" },
    { slug: "lc-lca-bt", title: "Lowest Common Ancestor of a Binary Tree", platform: "leetcode", url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/", difficulty: "medium", patternTag: "tree-dfs", triggerHint: "The deepest node with both targets below it.", approachHint: "Return the node if it is null, p or q; if both sides return non-null, this node is the LCA.", estMinutes: 25, unitSlug: "dsa-bt-paths-lca" },
    { slug: "lc-nodes-distance-k", title: "All Nodes Distance K in Binary Tree", platform: "leetcode", url: "https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree/", difficulty: "medium", patternTag: "bfs", triggerHint: "Distance k from a node, in any direction including up.", approachHint: "Map each node to its parent, then BFS from the target over left, right and parent with a visited set.", estMinutes: 30, unitSlug: "dsa-bt-paths-lca" },
    { slug: "lc-build-tree-pre-in", title: "Construct Binary Tree from Preorder and Inorder Traversal", platform: "leetcode", url: "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/", difficulty: "medium", patternTag: "tree-construction", triggerHint: "Two traversals; rebuild the tree.", approachHint: "Preorder gives the root; its inorder index splits left and right. Precompute value → index.", estMinutes: 35, unitSlug: "dsa-bt-build-serialize" },
    { slug: "lc-serialize-bt", title: "Serialize and Deserialize Binary Tree", platform: "leetcode", url: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/", difficulty: "hard", patternTag: "tree-construction", triggerHint: "Round-trip a tree through a string.", approachHint: "Preorder with a null marker; deserialise by consuming tokens in the same order recursively.", estMinutes: 40, unitSlug: "dsa-bt-build-serialize" },
  ],
};
