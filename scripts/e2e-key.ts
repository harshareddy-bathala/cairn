import { questions } from "@/content/checkpoints";

/**
 * Prints the answer key as { prompt: correct option text }, for the browser
 * scripts. Options are shuffled per sitting, so the driver answers by text —
 * the way someone who knows the material would — instead of by position.
 */
console.log(JSON.stringify(Object.fromEntries(questions.map((q) => [q.prompt, q.options[q.answer]]))));
