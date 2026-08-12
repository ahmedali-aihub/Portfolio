"""
Minimal in-memory per-IP rate limiter.

Good enough for a single-process portfolio demo. If this ever runs
behind multiple worker processes, swap this for a shared store (Redis)
since in-memory counters won't be consistent across workers.
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app.config import RATE_LIMIT_PER_MINUTE

_hits: dict[str, deque] = defaultdict(deque)


def check_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window = _hits[client_ip]

    while window and now - window[0] > 60:
        window.popleft()

    if len(window) >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many messages — slow down a little and try again shortly.")

    window.append(now)
