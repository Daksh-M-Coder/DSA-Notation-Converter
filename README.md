Notation Tutor (Infix ⇄ Postfix ⇄ Prefix)

A lightweight static web app for DSA learners. It converts between notations and shows a step-by-step stack/output table with animation. Also supports copying the table as Markdown.

Run
Open `index.html` in any modern browser (no build needed).

Features
- Infix → Postfix via Shunting Yard with exact precedence and associativity (right-assoc `^`).
- Postfix ↔ Prefix, Postfix → Infix, Prefix → Infix with detailed steps.
- Animated table rendering; manual step button; adjustable speed.
- Copy table as Markdown.
- Supports variables (`A..Z`, `a..z`), integers (multi-digit), parentheses, and operators `^ * / + -`.

Notes
- For clarity, infix reconstructions add parentheses. Final result removes one outer pair when possible.
- Input tokens can be separated by spaces or adjacent (e.g., `A+B*C`).

Example
Input: `A + B * C - D / E` From: `Infix` To: `Postfix`
Result: `A B C * + D E / -`

