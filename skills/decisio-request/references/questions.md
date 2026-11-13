# Requests and answers

Reference baseline: decisio 0.46.0. [HTTP API](https://opendecisio.com/docs/api/) is the source for fields beyond these examples.

## HTTP body

`POST /v1/systemone`, JSON content type:

- `state`: text, object or array describing the input.
- `questions`: a nonempty object mapping names chosen by the application to question objects.
- A question has `type`, `instructions`, and `criteria` where required.
- The answer is under `answers` with the same name.
- A decisio server loads one model at startup. A `model` name in the request does not switch it and can be echoed in the response. Inspect health to know the model actually serving.

## Choice

`type: "choice"`; `criteria` is an object of option keys to descriptions or `null`. Up to 255 named options are supported.
The answer has `choice` and `probabilities`, keyed by your option names. Read `probabilities[choice]` for the top probability.
The separate `confidence` field is rescaled from the top probability; it is not the probability itself.
Use distinct descriptions, and include an alternative or review policy when inputs may not fit any useful category.

## Yes or no

`type: "noul"`; `instructions` is the question or statement. Optional criteria describe `true` and `false`.
The answer's `noul` number is P(yes), between 0 and 1. P(no) is one minus that value.
A Boolean in your application is a policy decision; a value near the middle can go to review.

## Score

`type: "score"`; `criteria` is an ordered array of level descriptions, lowest first.
`score` is the probability-weighted mean level, starting at zero, so it can be fractional.
`probabilities` is keyed by string level indices; `legend` maps them to descriptions. Look at the distribution when a mean could hide a split answer.

## Errors and verification

Read `response.ok` or equivalent before consuming JSON. Errors use a `detail` field: 422 for validation problems, 400 for an unsupported request, 415 for a wrong content type; service errors may be 5xx.
Unknown fields can be ignored rather than rejected, so a misspelled field is not a reliable validation test.
Check expected question names/types, option keys, finite probability values in range, and distributions that sum to approximately one. Do not require exact numeric outputs.
The service timeout should allow for the first model read; keep it configurable.

## Certification fields

Read certification fields on the named answer: `answers.queue.certified`, `answers.queue.certificate_kind` and `answers.queue.certificate` for a question named `queue`.
These fields belong to that answer, not to the response root.
`certificate` is an ID string, not an object containing the kind; the certificate object returned by task registration has a different shape.

This excerpt shows the certification fields of an illustrative decision response; other fields are omitted:

```json
{
  "answers": {
    "queue": {
      "certified": true,
      "certificate": "support-queue#example",
      "certificate_kind": "gold"
    }
  }
}
```

For a gold-only action, first read `answer = response["answers"]["queue"]`, then require `answer.get("certified") is True` and `answer.get("certificate_kind") == "gold"`.
False, missing or unknown fields go to review; `"agreement"` concerns matching the model rather than correctness against human labels.
A high probability alone is not a certificate.
The [task guide](https://opendecisio.com/docs/tasks/certify/) explains teaching and certification.
