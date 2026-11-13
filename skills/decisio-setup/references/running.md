# Running decisio

These commands target decisio 0.46.0. The [current running guides](https://opendecisio.com/docs/) describe supported machines and versions.
Use an existing endpoint first when the user supplies one.

## Linux and an NVIDIA GPU

Use Python 3.12 and a driver supporting CUDA 13.0. The default Gemma 4 31B was measured on a 96 GB card and also starts on an 80 GB H100; choose a smaller model when the documented hardware needs it.
The first start downloads the model. Do not present a successful install as a ready server.

```bash
python3.12 -m venv .venv
. .venv/bin/activate
pip install 'decisio[serve]==0.46.0'
python -m decisio.serve.vllm_engine
```

For the full locked dependency environment, clone the release and use uv instead:

```bash
git clone --branch v0.46.0 https://github.com/aminry/decisio
cd decisio
uv sync --extra serve --frozen
uv run python -m decisio.serve.vllm_engine
```

The default endpoint is `http://127.0.0.1:8000`. `GET /health` returns 200 when ready; `GET /v1/models` lists the served model.
Do not bind it to a public interface without the user's chosen authenticated proxy.

## Apple silicon with MLX

Use a build that fits memory. A 32 GB machine uses the 12B; the documented 31B paths need more memory. Check the [MLX guide](https://opendecisio.com/docs/deploy/mac/) before choosing the 31B.

```bash
git clone --branch v0.46.0 https://github.com/aminry/decisio
cd decisio
uv sync --extra mlx
uv run python -m decisio.serve.vllm_engine --backend mlx --base gemma-4-12b --model mlx-community/gemma-4-12B-it-6bit
```

This is the same HTTP server on port 8000. MLX needs an MLX conversion, not an FP8 GPU checkpoint. Image serving and request adapters are not supported on this path.

## Ollama on a laptop

These listings work on Ollama 0.35.1 through 0.40.3; later versions refuse them on the decision route. Check `ollama --version` before choosing this path. On Apple silicon, MLX is the alternative.

```bash
ollama pull aminroudaki/decisio-gemma
```

The smallest Gemma listing has a 7.7 GB download and uses 8.6 GB in Ollama. It is the documented 16 GB laptop path.
Send the bundled request to `http://localhost:11434/v1/systemone`, with `"model": "aminroudaki/decisio-gemma"` added to the body. Check Ollama with `GET /api/tags`; decisio's `/health` and task routes are not its health or teaching API.
Ollama constructs its own prompt and does not apply decisio's probability corrections.

## Check an existing decisio endpoint

```bash
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/health
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/v1/models
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/v1/systemone -H 'Content-Type: application/json' --data-binary @request.json
```

Copy the bundled request to the project's working directory, or name its real path. Replace the base URL with the configured endpoint. Keep any proxy credentials in the project's normal secret mechanism.
A development stand-in can exercise this contract, but its probabilities do not describe the production model's quality.
