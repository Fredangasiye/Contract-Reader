# Rules Contribution Guide

## How to add new rules

1.  **Identify the Trap**: Find a common clause or exclusion in insurance contracts that poses a risk to the user.
2.  **Define the Rule**: Add a new entry to `docs/common_traps_library.json` under the appropriate category (e.g., `insurance`).
    *   `title`: Short, descriptive title.
    *   `patterns`: Array of regex strings to match the clause. Use `(?:...)` for non-capturing groups.
    *   `explanation`: Plain English explanation of the risk.
    *   `default_severity`: Integer 0-100 indicating the risk level.
    *   `category`: One of `coverage`, `exclusion`, `obligation`, `cost`, `legal`, `reporting`, `admin`.
    *   `metadata`: `why` and `suggested_action`.
3.  **Add Examples**: Add positive and negative examples to `docs/common_traps_examples.json`.
    *   `positive`: Sentences that SHOULD trigger the rule.
    *   `negative`: Sentences that should NOT trigger the rule.

## Testing Requirements

*   Run `node scripts/validate_rules.js` to check for JSON errors and invalid regex.
*   Run `npm test` in `backend/` to verify that the new rule is detected correctly using the provided examples.

## PR Checklist

*   [ ] Rule has at least 2 positive examples.
*   [ ] Rule has 1 negative example.
*   [ ] Severity justification provided in PR description.
*   [ ] Patterns tested manually or via regex tester.
