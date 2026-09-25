import type { Module } from "@/content/types";

export const bst: Module = {
  slug: "dsa-bst",
  trackSlug: "dsa",
  phaseSlug: "depth",
  order: 3,
  title: "Binary search trees",
  summary:
    "A binary tree with one invariant — everything left is smaller, everything right is larger — and every BST problem is that invariant used twice: to walk one path instead of the whole tree, and to read the keys in sorted order with an inorder traversal.",
  prereqSlugs: ["dsa-binary-trees"],
  units: [
    {
      slug: "dsa-bst-operations",
      title: "Search, insert & delete",
      objective:
        "Search, insert and delete in a BST in O(h), including deleting a node with two children.",
      estMinutes: 75,
      primer: `A **binary search tree** (BST) is a binary tree with one rule at every node: **everything in the left subtree is smaller, everything in the right subtree is larger**.

That rule turns searching into binary search. Looking for 7 at a node holding 10? It can only be on the left, so ignore the whole right side. Each step goes down one level, so a search costs the tree's **height** — about log n steps if the tree is bushy, but n steps if it has grown into a long chain (insert 1, 2, 3, 4… in order and it does exactly that).

**Insert** walks the same path and adds the new node where the walk falls off the tree. **Delete** is the interesting one: removing a node that has two children means replacing it with the next larger value, so the rule still holds everywhere.

**You need already:** binary trees and binary search.`,
      conceptMd: `The **invariant**: for every node, all keys in its left subtree are smaller and all keys in its right subtree are larger. Not just the children — the whole subtrees.

That invariant means every operation walks **one root-to-leaf path**, so it costs O(h): O(log n) when the tree is balanced, O(n) when it degenerates into a list (insert sorted keys into a plain BST and you get exactly that). \`std::set\` and \`std::map\` are self-balancing (red-black trees in every major standard library) precisely so that h stays O(log n).

**Search and insert** are the same walk. Insert stops where search would have fallen off, and hangs the new node there:

\`\`\`cpp
TreeNode* insert(TreeNode *root, int x) {
  if (!root) return new TreeNode(x);
  if (x < root->val) root->left = insert(root->left, x);
  else               root->right = insert(root->right, x);
  return root;
}
\`\`\`

**Delete** has three cases:

1. **Leaf** — remove it.
2. **One child** — replace the node with that child.
3. **Two children** — copy in the **inorder successor** (the smallest key in the right subtree: go right once, then left as far as possible), then delete the successor from the right subtree. The successor has no left child, so that second delete is case 1 or 2.

The inorder predecessor (largest in the left subtree) works equally well; say which you chose.

**Floor and ceil** are the same walk with a remembered candidate: to find the ceil of x, every time you go left from a node ≥ x, that node is the best answer so far.`,
      interviewAngle:
        "Delete Node in a BST is the operation interviewers ask for, and the two-children case is the " +
        "whole question. Naming the inorder successor and why it has no left child shows you " +
        "understand the invariant, not just the code.",
      pitfalls: [
        "Stating O(log n) for a plain BST. It is O(h), and h is n for sorted insertions.",
        "Checking only the immediate children for the invariant. The whole left subtree must be smaller.",
        "In the two-children delete, forgetting to delete the successor from the right subtree afterwards.",
        "Losing the subtree by not assigning the recursive result back: `root->left = insert(root->left, x)`.",
      ],
      recall: [
        {
          front: "Deleting a BST node with two children — what replaces it, and why is the next step easy?",
          back:
            "Its inorder successor, the smallest key in the right subtree. That node has no left child, " +
            "so deleting it from the right subtree is the leaf or one-child case.",
        },
        {
          front: "What is the time complexity of search in a plain BST, stated precisely?",
          back: "O(h). That is O(log n) if balanced and O(n) if it degenerates, for example after sorted inserts.",
        },
        {
          front: "How do you find the ceil of x in a BST in one walk?",
          back: "Walk down; whenever a node is ≥ x, record it as the best candidate and go left, otherwise go right.",
        },
      ],
      resources: [
        {
          title: "Striver — Binary search tree: introduction and operations",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/binary-search-tree",
          kind: "read",
          minutes: 35,
          whyThisOne:
            "The BST rule, then search, insert and delete, each with a dry run — from zero.",
          steps: [
            "Read **What is a Binary Search Tree** and **The Core Properties of a BST**.",
            "Work **Search Operation** and **Insertion Operation**, following each **Dry Run**.",
            "Read **Deletion Operation** — all three cases — and **Why the Worst Case Occurs: Skewed Trees**.",
            "Then solve *Delete Node in a BST* (next link) yourself.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Delete a node in a BST",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/delete-node-in-a-bst",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "All three delete cases as a problem, with the successor replacement drawn out.",
          steps: [
            "Read the problem and examples, and try it yourself for 10–15 minutes.",
            "Read the approaches in order — brute force first — following each **Dry Run** on paper.",
          ],
        },
        {
          title: "Striver — Floor and ceil in a BST",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/floor-and-ceil-in-a-bst",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "Walking one path while remembering the best candidate — reused for successor and predecessor.",
        },
      ],
    },
    {
      slug: "dsa-bst-inorder",
      title: "The inorder invariant",
      objective:
        "Validate a BST with bounds, and use sorted inorder order to find the kth smallest and build a balanced BST.",
      estMinutes: 75,
      primer: `Walk a BST in **inorder** (left, node, right) and the values come out **in sorted order**. That single fact solves most of this unit.

- **Is this tree a valid BST?** Its inorder walk must be strictly increasing. Or, recursively: every node must lie within a range that tightens as you go down — checking only a node against its own children is the classic wrong answer.
- **The kth smallest value** is the kth node the inorder walk visits; stop there.
- **Building a balanced BST from a sorted array**: the middle element becomes the root, the left half builds the left subtree, the right half the right.

**You need already:** inorder traversal, and the BST rule from the last unit.`,
      conceptMd: `**The inorder traversal of a BST is sorted.** That one fact solves a whole family:

- **Kth smallest**: inorder, count k, stop — O(h + k) with an early exit.
- **Minimum absolute difference**: the closest pair is always adjacent in sorted order, so compare each value only with the previous one in inorder.
- **Two Sum in a BST**: two pointers over the inorder sequence, or two iterators walking from each end.

**Validating a BST is the classic trap.** Checking \`left->val < node->val < right->val\` at each node is wrong:

\`\`\`text
      5
     / \\
    1   6
       / \\
      3   7      3 < 6, locally fine — but 3 is in 5's right subtree
\`\`\`

The fix is to pass down the **range each node must lie in**:

\`\`\`cpp
bool valid(TreeNode *n, long long lo, long long hi) {
  if (!n) return true;
  if (n->val <= lo || n->val >= hi) return false;
  return valid(n->left, lo, n->val) && valid(n->right, n->val, hi);
}
// valid(root, LLONG_MIN, LLONG_MAX)
\`\`\`

Use \`long long\` bounds (or null pointers) — with \`int\` bounds a node holding \`INT_MAX\` fails wrongly. The alternative is an inorder walk that checks each value is greater than the previous.

**Building a balanced BST from a sorted array** is the inverse: the middle element is the root, the left half builds the left subtree and the right half the right subtree. The height is O(log n) by construction.`,
      interviewAngle:
        "Validate Binary Search Tree is asked because the local-comparison answer is wrong in a way " +
        "that looks right. Drawing the counterexample yourself, then passing bounds, is a strong " +
        "signal.",
      pitfalls: [
        "Validating by comparing each node only with its children.",
        "Using int bounds, so a node with value INT_MAX or INT_MIN is rejected.",
        "Doing a full inorder into a vector for kth smallest when an early exit would do.",
        "Picking the middle inconsistently when building from a sorted array, and not saying either middle works.",
      ],
      recall: [
        {
          front: "Why is checking left < node < right at every node not enough to validate a BST?",
          back:
            "The invariant covers whole subtrees. A node deep in the right subtree can be larger than " +
            "its parent but smaller than an ancestor it must exceed.",
        },
        {
          front: "What single property of a BST solves kth-smallest and minimum-difference problems?",
          back: "Its inorder traversal is sorted.",
        },
        {
          front: "How do you build a height-balanced BST from a sorted array?",
          back: "Make the middle element the root and recurse on the left and right halves.",
        },
      ],
      resources: [
        {
          title: "Striver — Validate a binary search tree",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/validate-binary-search-tree",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "The range-passing version and the inorder version, with the check-only-the-children trap shown.",
          steps: [
            "Read the problem and examples, and try it yourself for 10–15 minutes.",
            "Read the approaches in order — brute force first — following each **Dry Run** on paper.",
            "Draw a tree that passes the children-only check but is not a BST.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Kth smallest and largest in a BST",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/kth-smallest-and-largest-elements-in-a-bst",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "Inorder with a counter and an early exit.",
        },
        {
          title: "Striver — Convert a sorted array into a BST",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/convert-sorted-array-into-bst",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "Middle as root, recursively — also why a balanced tree is only log n tall.",
        },
      ],
    },
    {
      slug: "dsa-bst-iterators",
      title: "Iterator, LCA & recovering a swapped BST",
      objective:
        "Build a BST iterator in O(h) space, find the LCA with the invariant, and repair a BST in which two nodes were swapped.",
      estMinutes: 90,
      primer: `Three problems that use the BST rule in less obvious ways.

**Iterator**: return the values one at a time in sorted order, using only O(height) memory — not a full sorted list. Keep a stack of the nodes on the path to the next smallest value and do the inorder walk *one step per call*.

**LCA in a BST** is simpler than in a plain tree: if both values are smaller than the current node, go left; if both are larger, go right; otherwise the paths split here and this node is the answer.

**Recover a BST**: two nodes' values were swapped by mistake. The inorder sequence then has one or two places where it goes down instead of up; those spots identify the two nodes to swap back.

**You need already:** inorder traversal with an explicit stack, and the previous BST units.`,
      conceptMd: `**BST iterator.** \`next()\` and \`hasNext()\` in O(1) amortised time and O(h) space — which rules out copying the inorder into an array. Instead, pause the iterative inorder traversal between calls:

\`\`\`cpp
class BSTIterator {
  stack<TreeNode*> st;
  void pushLeft(TreeNode *n) { while (n) { st.push(n); n = n->left; } }
public:
  BSTIterator(TreeNode *root) { pushLeft(root); }
  int next() {
    TreeNode *n = st.top(); st.pop();
    pushLeft(n->right);              // the next smallest lives down the right subtree's left spine
    return n->val;
  }
  bool hasNext() { return !st.empty(); }
};
\`\`\`

Each node is pushed and popped once over the whole iteration, so \`next\` is O(1) amortised.

**LCA in a BST** needs no recursion into both sides. If both p and q are smaller than the node, the LCA is on the left; if both are larger, on the right; otherwise this node is where they split — it *is* the LCA. O(h), and it works iteratively in O(1) space.

**Recover a BST** in which exactly two nodes were swapped. Their inorder sequence is sorted except for one or two **inversions** — places where a value is smaller than the one before it:

- two inversions (non-adjacent swap): the first node is the *larger* of the first inversion, the second is the *smaller* of the second;
- one inversion (adjacent swap): the two nodes are that inversion's pair.

Track \`prev\` during an inorder walk, record \`first\` and \`second\`, and swap their values at the end. O(n) time, O(h) space; Morris traversal makes it O(1).`,
      interviewAngle:
        "The BST iterator is a design question disguised as a tree question — interviewers want the " +
        "O(h)-space answer and the amortised argument. Recover BST tests whether you really believe " +
        "inorder is sorted.",
      pitfalls: [
        "Implementing the iterator by flattening the tree into an array — O(n) space, which the problem forbids.",
        "Using the general binary-tree LCA on a BST and ignoring the ordering.",
        "Handling only the two-inversion case in Recover BST, so adjacent swaps are missed.",
        "Swapping the nodes themselves instead of their values, and breaking the tree's links.",
      ],
      recall: [
        {
          front: "How does a BST iterator achieve O(h) space and O(1) amortised next()?",
          back:
            "It keeps a stack of the left spine and pauses an iterative inorder. After popping a node " +
            "it pushes the left spine of its right child; each node is pushed and popped once.",
        },
        {
          front: "How do you find the LCA of p and q in a BST without searching both subtrees?",
          back: "Go left if both are smaller, right if both are larger; the first node where they split is the LCA.",
        },
        {
          front: "Two nodes of a BST were swapped. How do you find them from the inorder sequence?",
          back:
            "Find the inversions. With two, take the larger of the first and the smaller of the " +
            "second; with one, take its pair.",
        },
      ],
      resources: [
        {
          title: "Striver — Binary search tree iterator",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/binary-search-tree-iterator",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "A paused inorder walk, and why each call is O(1) on average.",
          steps: [
            "Read the problem and examples, and try it yourself for 10–15 minutes.",
            "Read the approaches in order — brute force first — following each **Dry Run** on paper.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — LCA of a binary search tree",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/lowest-common-ancestor-of-a-binary-search-tree",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "The split-point rule, recursive and iterative.",
        },
        {
          title: "Striver — Recover a binary search tree",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/recover-binary-search-tree",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "Both the adjacent and non-adjacent swap cases — where people slip.",
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-search-bst", title: "Search in a Binary Search Tree", platform: "leetcode", url: "https://leetcode.com/problems/search-in-a-binary-search-tree/", difficulty: "easy", patternTag: "bst", triggerHint: "Find a key using the ordering.", approachHint: "Go left if smaller, right if larger. Iterative is two lines.", estMinutes: 10, unitSlug: "dsa-bst-operations" },
    { slug: "lc-insert-bst", title: "Insert into a Binary Search Tree", platform: "leetcode", url: "https://leetcode.com/problems/insert-into-a-binary-search-tree/", difficulty: "medium", patternTag: "bst", triggerHint: "Place a new key where search would fall off.", approachHint: "Recurse left or right; a null position gets the new node. Assign the result back to the child pointer.", estMinutes: 15, unitSlug: "dsa-bst-operations" },
    { slug: "lc-delete-node-bst", title: "Delete Node in a BST", platform: "leetcode", url: "https://leetcode.com/problems/delete-node-in-a-bst/", difficulty: "medium", patternTag: "bst", triggerHint: "Remove a key and keep the invariant.", approachHint: "Leaf: remove. One child: splice it in. Two: copy the inorder successor, delete it from the right.", estMinutes: 30, unitSlug: "dsa-bst-operations" },
    { slug: "lc-validate-bst", title: "Validate Binary Search Tree", platform: "leetcode", url: "https://leetcode.com/problems/validate-binary-search-tree/", difficulty: "medium", patternTag: "bst", triggerHint: "Does the whole-subtree ordering hold everywhere.", approachHint: "Pass (lo, hi) bounds down, as long long; or check an inorder walk is strictly increasing.", estMinutes: 20, unitSlug: "dsa-bst-inorder" },
    { slug: "lc-kth-smallest-bst", title: "Kth Smallest Element in a BST", platform: "leetcode", url: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/", difficulty: "medium", patternTag: "bst", triggerHint: "An order statistic in a BST.", approachHint: "Iterative inorder, decrement k on each visit, return at zero.", estMinutes: 20, unitSlug: "dsa-bst-inorder" },
    { slug: "lc-sorted-array-to-bst", title: "Convert Sorted Array to Binary Search Tree", platform: "leetcode", url: "https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/", difficulty: "easy", patternTag: "bst", triggerHint: "Sorted input, balanced tree out.", approachHint: "The middle element is the root; recurse on each half.", estMinutes: 15, unitSlug: "dsa-bst-inorder" },
    { slug: "lc-min-abs-diff-bst", title: "Minimum Absolute Difference in BST", platform: "leetcode", url: "https://leetcode.com/problems/minimum-absolute-difference-in-bst/", difficulty: "easy", patternTag: "bst", triggerHint: "The closest pair of values in a BST.", approachHint: "Inorder is sorted, so only adjacent values can be closest; track the previous value.", estMinutes: 15, unitSlug: "dsa-bst-inorder" },
    { slug: "lc-bst-iterator", title: "Binary Search Tree Iterator", platform: "leetcode", url: "https://leetcode.com/problems/binary-search-tree-iterator/", difficulty: "medium", patternTag: "bst", triggerHint: "Sorted iteration in O(h) memory.", approachHint: "Stack of the left spine; after popping, push the left spine of the popped node's right child.", estMinutes: 25, unitSlug: "dsa-bst-iterators" },
    { slug: "lc-lca-bst", title: "Lowest Common Ancestor of a Binary Search Tree", platform: "leetcode", url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/", difficulty: "medium", patternTag: "bst", triggerHint: "LCA where the ordering tells you which way to go.", approachHint: "Both smaller: go left. Both larger: go right. Otherwise this node is the LCA.", estMinutes: 15, unitSlug: "dsa-bst-iterators" },
    { slug: "lc-recover-bst", title: "Recover Binary Search Tree", platform: "leetcode", url: "https://leetcode.com/problems/recover-binary-search-tree/", difficulty: "medium", patternTag: "bst", triggerHint: "Exactly two nodes swapped; fix without restructuring.", approachHint: "Inorder with prev; first = larger of the first inversion, second = smaller of the last. Swap values.", estMinutes: 35, unitSlug: "dsa-bst-iterators" },
  ],
};
