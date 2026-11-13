---
name: decisio-integrate
description: Integrate decisio typed decisions into an existing backend, workflow or System One client, including timeouts, response handling and review paths. Use for application changes using decisio, not replacing a coding assistant's model.
---

# Integrate decisio into an application

Make a small, reviewable application change around the decision the user requested.
Read [integration.md](references/integration.md) for the service contract and task behavior. Use the bundled Python or JavaScript client as a starting point only when the project does not already have a suitable HTTP client.

1. Inspect the application's instructions, configuration, request flow, tests and existing error handling. Find the insertion point that produces the needed decision without adding another architecture.
2. Reuse the configured endpoint and the language's existing HTTP library. Keep the call on the backend. Put questions and action policy together in a named module, separate from transport code.
3. Use documented question types and response fields. Configure the base URL and timeout through the project's existing environment/config system. Do not use the request's `model` field to switch a decisio server's model.
4. Handle HTTP errors, timeouts and malformed answers before taking action. Follow the user's existing review or fallback policy; if none is specified, use a visible review result rather than assume an action should run.
5. If teaching or certification is part of the request, use the supplied labels on the intended local/test instance. Preserve task identity and inspect the registration result. A decision answer's `certificate` is an ID string; `certificate_kind` is a separate top-level field on that answer. For gold-only automation, use [gold-certified.mjs](assets/gold-certified.mjs) after client validation: require `certified === true` and `certificate_kind === "gold"`. Missing, unknown or agreement kinds go to review. The certificate object returned by registration is a different shape.
6. Test the application behavior for a valid answer, a review answer, service failure and timeout using the project's test tools. Run a smoke request to the user's endpoint when available, and state when only a fixture was used.
7. Summarize the changed application files, configuration, commands and observed results. Keep production task changes, cloud provisioning and deployment within the user's actual authorization.

The application owns the action. A model's choice is input to the application's policy, not authority to bypass it.
Do not add teaching, a fast table, a new SDK or a new service when a simple decision call meets the user's request.
