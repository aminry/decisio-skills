# Running decisio

These commands target decisio 0.51.1. The [current running guides](https://opendecisio.com/docs/) describe supported machines and versions.
Use an existing endpoint first when the user supplies one.

## Linux and an NVIDIA GPU

Use Python 3.12 and a driver supporting CUDA 13.0. Start with Decisio v3, a Gemma 4 12B tuned for decisions with calibrated probabilities (22 GB of bf16 weights):

```bash
python3.12 -m venv .venv
. .venv/bin/activate
pip install 'decisio[serve]==0.51.1'
python -m decisio.serve.vllm_engine --base tachara-ai/Decisio-12b-tuned-v3-calibrated
```

Use `tachara-ai/Decisio-12b-tuned-v3-commit` when the code acts on yes/no answers directly, and the `-v3-fp8-calibrated` repository (12 GB) on a smaller card.
The first start downloads the model and the calculator's small tagger. Do not present a successful install as a ready server.
With no `--base` the server serves Gemma 4 31B, measured on a 96 GB card; it also starts on an 80 GB H100.

For the full locked dependency environment, clone the release and use uv instead:

```bash
git clone --branch v0.51.1 https://github.com/aminry/decisio
cd decisio
uv sync --extra serve --frozen
uv run python -m decisio.serve.vllm_engine --base tachara-ai/Decisio-12b-tuned-v3-calibrated
```

To read images, add `--images on` (Gemma bases; the default is off):

```bash
python -m decisio.serve.vllm_engine --base gemma-4-12b --images on
```

The default endpoint is `http://127.0.0.1:8000`. `GET /health` returns 200 when ready; `GET /v1/models` lists the served model.
Do not bind it to a public interface without the user's chosen authenticated proxy.

## Apple silicon with MLX

Use a build that fits memory. Decisio v3's 8-bit MLX build (12 GB) fits a 32 GB Mac, and `-v3-mlx-calibrated` is its 6-bit build (9 GB); the documented 31B paths need more memory. Check the [MLX guide](https://opendecisio.com/docs/deploy/mac/) before choosing the 31B.

```bash
git clone --branch v0.51.1 https://github.com/aminry/decisio
cd decisio
uv sync --extra mlx
uv run python -m decisio.serve.vllm_engine --backend mlx --base tachara-ai/Decisio-12b-tuned-v3-mlx8-calibrated
```

The untrained 12B is `--base gemma-4-12b --model mlx-community/gemma-4-12B-it-6bit`.

This is the same HTTP server on port 8000. MLX needs an MLX conversion, not an FP8 GPU checkpoint. Request adapters are not supported on this path.

To read images on a Mac, use the extra `mlx-images` and `--images on` with a Gemma 4 base. Google's bf16 checkpoint has the vision weights:

```bash
uv sync --extra mlx-images
uv run python -m decisio.serve.vllm_engine --backend mlx --base gemma-4-12b --model google/gemma-4-12B-it --images on
```

An MLX conversion made for text drops the vision tensors; `mlx-community/gemma-4-12B-it-6bit` has them, while a tuned model's conversion uses the base's vision add-on (`--vision-weights`, see the Mac guide). Box questions are not served on a Mac yet: a request for one is refused with a 400.

## Ollama on a laptop

The Gemma listings work on Ollama 0.40.4 and later (checked on 0.40.4, 0.40.9 and 0.40.16). Check `ollama --version` before choosing this path. The Qwen listing, `aminroudaki/decisio`, needs Ollama 0.35.1 through 0.40.3 and is refused by later versions; on a current Ollama use a Gemma listing, or decisio's own server on a Mac.

```bash
ollama pull aminroudaki/decisio-v3            # Decisio v3, the 8-bit file (12.7 GB)
ollama pull aminroudaki/decisio-v3:q4_k_m     # Decisio v3, the 4-bit file (7.4 GB)
ollama pull aminroudaki/decisio-gemma         # the untrained Gemma 4 12B base
```

The base listing's `q4_k_m` tag takes 11.1 GB in memory and its `q8_0` tag 15.9 GB, measured on a Mac; a 16 GB machine was not tried.
The listings answer `/v1/systemone` with their own temperatures; the calculator comes only with decisio's own server.
Send the bundled request to `http://localhost:11434/v1/systemone`, with `"model": "aminroudaki/decisio-v3"` added to the body. Check Ollama with `GET /api/tags`; decisio's `/health` and task routes are not its health or teaching API.
Ollama differs from decisio's own server: images go before the state, not at their places in it, and there is no Box question. It does not apply the commit flavor, thinking, read twice, tasks, abstention or the fast table.

## Check an existing decisio endpoint

```bash
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/health
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/v1/models
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/v1/systemone -H 'Content-Type: application/json' --data-binary @request.json
```

Copy the bundled request to the project's working directory, or name its real path. Replace the base URL with the configured endpoint. Keep any proxy credentials in the project's normal secret mechanism.
A development stand-in can exercise this contract, but its probabilities do not describe the production model's quality.
