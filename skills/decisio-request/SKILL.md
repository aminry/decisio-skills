---
name: decisio-request
description: Write and test a decisio decision request for classification, yes/no checks or rubric scores. Use when building decisio questions and reading their typed answers, not for unrelated classification advice.
---

# Build a decisio request

Turn the user's application decision into a complete request and explain how the application reads its answer.
Read [questions.md](references/questions.md) for the supported request and response shapes before writing fields.

1. Identify the input text or record, the judgment needed, and the values the application can use. Reuse the user's known options and policy.
2. Choose `choice` for unordered alternatives, `noul` for yes/no, and `score` for an ordered rubric. Ask independent judgments as separate named questions in the same body.
3. Write focused instructions and distinct option descriptions. The text goes in `state`; named questions go in `questions`. Keep the question definitions reviewable in one place.
4. Adapt the complete [request.json](assets/request.json) fixture. Produce a real file and a caller or run command, without ellipses or invented fields in runnable examples.
5. Use the supplied endpoint if available. Check HTTP success and the response shape before reading the answer. Exercise a representative input and an ambiguous input; do not assert exact probabilities across models or serving setups.
6. Explain the value the application should read and its review path. A hand-picked probability threshold is a routing policy, not a certificate. Use the existing project policy where one exists.

For a decisio server, omit `model` unless the client needs it: it does not switch the running model. For Ollama, its `model` listing is required and its serving behavior differs; use the Ollama setup reference or official guide.

If no endpoint is available, complete the files and validate their structure. State clearly that inference was not run, and describe what command remains. Do not silently install a model server as part of request authoring.

Report the saved request, how to run it, the fields your code consumes, and what was actually checked.
