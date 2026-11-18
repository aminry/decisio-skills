# Running decisio

These commands target decisio 0.50.2. The [current running guides](https://opendecisio.com/docs/) describe supported machines and versions.
Use an existing endpoint first when the user supplies one.

## Linux and an NVIDIA GPU

Use Python 3.12 and a driver supporting CUDA 13.0. The default Gemma 4 31B was measured on a 96 GB card and also starts on an 80 GB H100; choose a smaller model when the documented hardware needs it.
The first start downloads the model. Do not present a successful install as a ready server.

```bash
python3.12 -m venv .venv
. .venv/bin/activate
pip install 'decisio[serve]==0.50.2'
python -m decisio.serve.vllm_engine
```

For the full locked dependency environment, clone the release and use uv instead:

```bash
git clone --branch v0.50.2 https://github.com/aminry/decisio
cd decisio
uv sync --extra serve --frozen
uv run python -m decisio.serve.vllm_engine
```

To read images, add `--images on` (Gemma bases; the default is off):

```bash
python -m decisio.serve.vllm_engine --base gemma-4-12b --images on
```

The default endpoint is `http://127.0.0.1:8000`. `GET /health` returns 200 when ready; `GET /v1/models` lists the served model.
Do not bind it to a public interface without the user's chosen authenticated proxy.

## Apple silicon with MLX

Use a build that fits memory. A 32 GB machine uses the 12B; the documented 31B paths need more memory. Check the [MLX guide](https://opendecisio.com/docs/deploy/mac/) before choosing the 31B.

```bash
git clone --branch v0.50.2 https://github.com/aminry/decisio
cd decisio
uv sync --extra mlx
uv run python -m decisio.serve.vllm_engine --backend mlx --base gemma-4-12b --model mlx-community/gemma-4-12B-it-6bit
```

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
ollama pull aminroudaki/decisio-gemma          # the Gemma 4 12B base
ollama pull aminroudaki/decisio-gemma-tuned    # the tuned 12B (calibrated)
```

Each listing's `q4_k_m` tag takes about 11 GB in memory (11.1 GB the base, 10.8 GB the tuned model) and its `q8_0` tag 15.9 GB, measured on a Mac; a 16 GB machine was not tried.
Both listings answer `/v1/systemone` with decisio's own prompt and temperatures, and they read images.
Send the bundled request to `http://localhost:11434/v1/systemone`, with `"model": "aminroudaki/decisio-gemma"` added to the body. Check Ollama with `GET /api/tags`; decisio's `/health` and task routes are not its health or teaching API.
Ollama differs from decisio's own server: images go before the state, not at their places in it, and there is no Box question. It does not apply the commit flavor, thinking, read twice, tasks, abstention or the fast table.

## Check an existing decisio endpoint

```bash
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/health
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/v1/models
curl --fail-with-body --silent --show-error http://127.0.0.1:8000/v1/systemone -H 'Content-Type: application/json' --data-binary @request.json
```

Copy the bundled request to the project's working directory, or name its real path. Replace the base URL with the configured endpoint. Keep any proxy credentials in the project's normal secret mechanism.
A development stand-in can exercise this contract, but its probabilities do not describe the production model's quality.
