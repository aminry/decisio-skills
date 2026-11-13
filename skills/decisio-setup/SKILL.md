---
name: decisio-setup
description: Set up a decisio decision server on a GPU, with MLX, or with Ollama, or connect a project to an existing decisio endpoint. Use for decisio setup and connection work, not generic server installation.
---

# Set up decisio

Get a working endpoint and one successful decision request for the user's project.
Keep the user's chosen hardware and existing service when they have specified them.

1. Inspect the project's setup instructions and runtime. Check whether an endpoint is already configured before installing anything.
2. Read [running.md](references/running.md) for the chosen serving path. Use the project's installed compatible version; for a fresh setup, these examples target decisio 0.46.0. Check the installed version against the reference before using newer fields.
3. For an existing endpoint, check health and models, then send the bundled [request](assets/request.json). Do not replace or restart an existing service just to test a client.
4. For a fresh server, select GPU, MLX or Ollama from the available hardware. Explain the model download and memory requirement before starting a new download, and keep actions within the user's authorization. CPU development is only a secondary option when the user needs contract tests without serving hardware.
5. Start the selected service, wait for its documented readiness signal, then send the request to its actual port. For Ollama, include its listing name in `model` and use its own endpoint; it is not the decisio server.
6. Store reusable endpoint configuration in the application's existing configuration system, with an environment example. Report what ran, the endpoint, model, launch command and how to start it again. Distinguish a successful contract test from an assessment of model quality.

A decisio server serves the model it loaded at startup. A request's `model` field does not choose another model.
The server itself has no authentication; an authenticating proxy may. Call it from the backend, and preserve any proxy configuration the project already uses.
Ollama does not provide decisio's task teaching or certification.

If the setup is blocked by missing hardware or dependencies, finish the runnable files and report the exact remaining requirement. Do not report that an endpoint was checked unless a request actually succeeded.
