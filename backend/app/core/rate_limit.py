"""Simple in-memory per-key cooldown for abuse-prone endpoints."""

from __future__ import annotations

import time


class CooldownLimiter:
    def __init__(self, cooldown_seconds: float):
        self.cooldown_seconds = cooldown_seconds
        self._last_hit: dict[str, float] = {}

    def is_allowed(self, key: str) -> bool:
        now = time.monotonic()
        last = self._last_hit.get(key)
        if last is not None and now - last < self.cooldown_seconds:
            return False
        self._last_hit[key] = now
        return True

    def clear(self) -> None:
        self._last_hit.clear()


# One verification email per address per minute.
resend_verification_limiter = CooldownLimiter(cooldown_seconds=60)

# One forgot-password / magic-link email per address per minute.
forgot_password_limiter = CooldownLimiter(cooldown_seconds=20)
