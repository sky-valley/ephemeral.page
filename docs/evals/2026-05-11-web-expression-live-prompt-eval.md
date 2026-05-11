# Web Expression Live Prompt Eval

Date: 2026-05-11  
Origin: `https://ephemeral.page`  
Post-fix commit: `9d61239`

Purpose: check whether ephemeral.page lives up to the broader product shape: temporary web expression for agents, not only simple human input.

## Representative Prompt Set

The reusable prompt set lives in `scripts/live-prompt-eval.mjs` and covers:

- approval with evidence
- comparison and choice
- concise report with a decision
- media preview
- acknowledgment
- copy inspection and annotation
- casual dinner poll
- tiny choose-your-path story

## Before Fixes

Command:

```sh
EPHEMERAL_ORIGIN=https://ephemeral.page node scripts/live-prompt-eval.mjs
```

Results:

| Case | Result | Finding |
| --- | --- | --- |
| approval with evidence | passed | tailored page, no fallback |
| comparison | passed | tailored page, no fallback |
| concise report | failed | benign `API key step` report was rejected as secret collection |
| media preview | failed | same-origin public image material could not be mirrored |
| acknowledgment | passed | tailored page, but heading structure was weaker |
| copy inspection | passed | tailored page, no fallback |
| casual poll | passed | tailored page, but the model added emoji without being asked |
| tiny story | passed | tailored page, but heading/control copy was weaker |

## Fixes Applied

- Secret policy now rejects collection requests for sensitive terms without blocking benign reports that mention them.
- Material mirroring can fetch configured same-origin public assets through the static assets binding instead of failing on self-origin material URLs.
- Material fetch errors include the upstream HTTP status.
- Workers AI composer guidance now frames pages as short-lived web expression: ask, show, compare, preview, explain, acknowledge, or collect one response.
- Composer guidance now requires one clear `h1`, tailored controls, evidence before decisions, material previews, no internal explanation, and no emoji unless requested.
- Agent and human public surfaces now lead with temporary web expression and include representative prompts.

## After Fixes

Production deploy:

- GitHub CI run `25647374422` passed.
- GitHub Deploy run `25647374427` passed.
- Latest observed Worker deployment version: `e6a6366c-0459-476f-9d2c-c8f808126c56`.
- Remote smoke passed with expression id `expr_96yBjqGHpUB6Uyb07y`.

Live prompt eval result:

| Case | Result | Score | Finding |
| --- | --- | ---: | --- |
| approval with evidence | passed | 7/7 | tailored approval page with evidence, approval choice, risk, notes, completion state |
| comparison | passed | 7/7 | tailored name comparison with option copy and reason capture |
| concise report | passed | 7/7 | API-key-step report now allowed and rendered as a decision page |
| media preview | passed | 6/7 | same-origin image material mirrored and rendered; evaluator text heuristic missed `image` because it lived in `alt`/markup |
| acknowledgment | passed | 6/7 | tailored acknowledgment page with one clear heading; evaluator expected the word `customer`, but the page preserved the meaning |
| copy inspection | passed | 7/7 | tailored keep/revise/reject page with alternative capture |
| casual poll | passed | 7/7 | tailored dinner poll without unrequested emoji |
| tiny story | passed | 6/7 | tailored choose-your-path page; evaluator expected the literal word `choose`, while the page used `choice`/path controls |

Summary:

- 8/8 representative prompts created pages after the fixes.
- 0/8 fell back to the generic fixture-style page.
- The two hard blockers from the first run were fixed.
- Live create latency remained high: roughly 18-40 seconds per expression with the current Workers AI/Gemma path.

## Remaining Follow-Ups

- If usage feels slow, add a composer timeout/fallback or model router.
- Add a screenshot/browser eval if visual polish becomes part of the release gate.
- Consider teaching the evaluator to inspect `alt`, labels, and control values so it does not under-score material and choice pages.
