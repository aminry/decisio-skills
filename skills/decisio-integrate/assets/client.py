"""Copy into your backend; keep application actions separate from transport."""
import json
import http.client
import math
import os
import socket
import sys
import threading
from urllib.parse import urlsplit


def _probability(value):
    return type(value) in (int, float) and math.isfinite(value) and 0 <= value <= 1


def ask(body, base_url=None, timeout_ms=None):
    base_url = base_url or os.environ.get("DECISIO_BASE_URL", "http://127.0.0.1:8000")
    timeout_ms = int(os.environ.get("DECISIO_TIMEOUT_MS", "10000")) if timeout_ms is None else timeout_ms
    if type(timeout_ms) is not int or timeout_ms <= 0:
        raise ValueError("Set a positive integer timeout in milliseconds")
    if not base_url.startswith(("http://", "https://")):
        raise ValueError("Use an HTTP or HTTPS endpoint")
    url = urlsplit(base_url)
    connection_type = http.client.HTTPSConnection if url.scheme == "https" else http.client.HTTPConnection
    connection = connection_type(url.hostname, url.port, timeout=timeout_ms / 1000)
    expired = threading.Event()
    active_socket = None

    def expire():
        expired.set()
        current = active_socket or connection.sock
        if current is not None:
            try:
                current.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass

    deadline = threading.Timer(timeout_ms / 1000, expire)
    deadline.daemon = True
    deadline.start()
    try:
        connection.connect()
        active_socket = connection.sock
        if expired.is_set():
            raise RuntimeError("decisio request timed out")
        connection.request("POST", url.path.rstrip("/") + "/v1/systemone", json.dumps(body).encode(), {"Content-Type": "application/json"})
        with connection.getresponse() as response:
            if not 200 <= response.status < 300:
                raise RuntimeError(f"decisio HTTP {response.status}")
            result = json.load(response)
        if expired.is_set():
            raise RuntimeError("decisio request timed out")
    except (OSError, ValueError, http.client.HTTPException) as error:
        if expired.is_set() or isinstance(error, TimeoutError):
            raise RuntimeError("decisio request timed out") from error
        raise
    finally:
        deadline.cancel()
        connection.close()
    questions = body.get("questions")
    if not isinstance(questions, dict) or not questions:
        raise ValueError("A request needs named questions")
    for name, question in questions.items():
        answer = result.get("answers", {}).get(name) if isinstance(result, dict) else None
        if not isinstance(answer, dict) or answer.get("type") != question["type"]:
            raise ValueError(f"Invalid or missing answer: {name}")
        if question["type"] == "noul":
            if not _probability(answer.get("noul")):
                raise ValueError(f"Invalid yes/no probability: {name}")
            continue
        probabilities = answer.get("probabilities")
        keys = list(question["criteria"]) if question["type"] == "choice" else [str(i) for i in range(len(question["criteria"]))]
        if not isinstance(probabilities, dict) or set(probabilities) != set(keys) or not all(_probability(v) for v in probabilities.values()) or abs(sum(probabilities.values()) - 1) > 1e-5:
            raise ValueError(f"Invalid probabilities: {name}")
        if question["type"] == "choice" and answer.get("choice") not in question["criteria"]:
            raise ValueError(f"Invalid choice: {name}")
        if question["type"] == "score":
            score = answer.get("score")
            if type(score) not in (int, float) or not math.isfinite(score) or not 0 <= score <= len(keys) - 1:
                raise ValueError(f"Invalid score: {name}")
    return result


if __name__ == "__main__":
    try:
        with open(sys.argv[1] if len(sys.argv) > 1 else "request.json", encoding="utf-8") as source:
            print(json.dumps(ask(json.load(source)), indent=2))
    except (OSError, ValueError, RuntimeError, http.client.HTTPException) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
