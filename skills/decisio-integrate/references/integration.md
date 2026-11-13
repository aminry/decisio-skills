# Backend integration

Baseline: decisio 0.46.0. See [client examples](https://opendecisio.com/docs/use-from/), [HTTP API](https://opendecisio.com/docs/api/) and [task usage](https://opendecisio.com/docs/tasks/).

## Client configuration

- Configure `DECISIO_BASE_URL` with a service base such as `http://127.0.0.1:8000`, then append `/v1/systemone` exactly once.
- Configure a timeout that fits the application's latency budget and allows for model startup or a first long read where appropriate.
- A decisio server ignores its own API key/authentication header; a proxy in front may require one. Preserve the project's real proxy credentials and never hardcode them.
- The server sets no browser CORS headers. The ordinary integration is backend to backend.
- Python's standard library and Node's built-in fetch can call the API. Do not introduce an SDK unless it adds value to this project.
- When adapting an existing SDK, verify its base URL convention. Some clients append `/v1` themselves and others expect it in the base.

## Request and result

The bundled clients accept the whole request body. `state` is the text or record; `questions` maps names to question objects.
`choice` questions have an option map in `criteria`; `noul` questions return P(yes); `score` questions have ordered levels and return the weighted mean level.
Read the returned entry by the same question name. For choices, `probabilities[choice]` is the probability; `confidence` is a different rescaled field.
The server's startup selects its model. The request's `model` can be echoed and is not reliable evidence of the model that ran; use `/health` and `/v1/models` when configuring the client.

Validate the HTTP status and result shape before action. A 422 means fix the request; blind retries do not repair it. Handle a 5xx or timeout with the application's service-failure policy. Do not retry task registration blindly, since it changes server state.

## Teaching and certification

A recurring task is registered with `POST /v1/tasks`, an `id` and labelled `examples`; each example includes a one-question `request` and its expected `answer`.
Every example for a fixed task uses the same question and ordered options. Renaming/reordering options or changing their descriptions can change task matching.
Registration keeps learned corrections only when the supplied examples justify them; inspect its response rather than promise a gain.

To certify, add `certify` with the chosen `alpha` error target and `delta` failure probability. Preserve separate held-out examples. Insufficient data or an unsupported serving setup can lead to no certified answers; implement that outcome.
Read `certified`, `certificate`, `certificate_kind` and `certified_reason` on the named answer, such as `answers.queue`. `certificate` there is an ID string, not the registration response's certificate object. Do not read `certificate.kind` or `certificate.certificate_kind` from a decision answer.
`certificate_kind` on the answer is `"gold"` for a certificate made from human labels and `"agreement"` for a fast table learned from model traffic. Agreement bounds disagreement with the model, not error against labels.
For gold-only routing, require `answer.certified === true && answer.certificate_kind === "gold"`; false, missing or unknown fields go to review. The bundled `assets/gold-certified.mjs` also checks that the certificate ID is a nonempty string.
Recertify after changing the model, layout, serving setup or software release.

This is an illustrative response shape, not a model recording:

```json
{"answers":{"queue":{"type":"choice","choice":"billing","probabilities":{"billing":0.8,"access":0.1,"other":0.1},"certified":true,"certificate":"support-queue#example","certificate_kind":"gold"}}}
```

Task persistence is per server unless configured with `--tasks-dir` or a shared `--task-store`. Registering a production task, replacing it or changing deployment flags requires the corresponding user authorization; do not do it merely to test a client.

## Application boundary

Keep three outcomes distinct: a usable answer, an answer the policy sends for review, and an unavailable/invalid service result.
A raw answer need not carry a certificate. For a certified-only workflow, explicitly require `answer.certified === true` (or the Python equivalent), and check `certificate_kind` when the application policy requires a gold certificate.
Do not silently convert failure into a business decision, such as approving an action because a response is missing.
