# Skill behavior checks

The package's deterministic checks run with `npm test` and `npm run check`.
The cases in `cases.json` support separate host-selection evaluations; they are not regex tests of skill descriptions.

For each host, install the package into an isolated fixture project and start a fresh session.
Run a positive or negative prompt, then record whether the intended skill loaded, what files it produced, and what it actually ran.
A prompt that names no endpoint should not claim successful inference.
Record host/version and observed counts before reporting a trigger rate.

The workflow checks use three fixtures:

- Request authoring without an endpoint: write valid JSON and run instructions; explicitly report inference as unverified.
- Setup against a local HTTP protocol fixture: check health, models and a decision request without installing or restarting a service.
- Integration into a minimal backend: require the documented top-level gold certificate fields for routing; missing, agreement or unknown kinds, malformed results, service errors and timeouts go to review.

Use real supported response shapes in fixtures.
A decision answer's `certificate` is an ID string, while registration returns a certificate object.
Run the generated application tests as well as inspecting the final summary; a generated test can otherwise agree with an invented schema.

These HTTP fixtures exercise the protocol and application policy.
They do not run a model or measure its quality.
Hardware start commands need a separate run on the intended hardware with the required model download.
