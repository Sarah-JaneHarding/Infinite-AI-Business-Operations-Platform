# Open Questions Register

A live register of every open question across `infinite-ai-ecosystem` and
`Infinite-AI-Business-Operations-Platform`, each with why it is open, options, and a recommendation.
This folder is a **versioned snapshot** of the page and its data as of 2026-11-24. The live copy is a
Claude artifact whose answers live in the artifact's own database, not in this repository.

The same snapshot is kept in `infinite-ai-ecosystem` under `docs/open-questions-register/`. If the two
folders differ, the one with the later date in this README wins; refresh both together.

| File                  | What it is                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `register.html`       | The page source (single file, no build). Runs only inside a Claude artifact.                                             |
| `questions.seed.json` | The 60 questions in the register as of 2026-11-24 (26 ecosystem, 34 platform), one JSON object per question.             |

## How answers are checked

1. An editor records an answer (a choice and/or text, plus a reason when it departs from the
   recommendation). The page saves it and sends Claude a comment naming the question and repository.
2. Claude checks the answer against `CLAUDE.md` and `docs/OPEN_QUESTIONS.md`, writes a verdict
   (`accepted`, `followup` or `conflict`) to the question, and updates `docs/OPEN_QUESTIONS.md` in the
   question's own repository.
3. Accepted questions move to Resolved. The markdown register stays the record of authority;
   the live register is a working view of it.

## Limits

- `docs/OPEN_QUESTIONS.md` in each repository remains authoritative. If the register and the markdown
  differ, the markdown wins.
- Recommendations marked "from the repository's recommendations file" come from this repo's
  `docs/OPQ_RECOMMENDATIONS.md`. The rest were written by Claude from the question text and need a
  human's judgement.
- The seed holds unresolved questions, plus OPQ-035 and OPQ-036, which were marked resolved on 2026-11-24
  to match the markdown. Other resolved items stay in the markdown files.
- Nothing here holds learner data, credentials or tenant identifiers.
