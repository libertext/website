"""Anthropic API istemcisi ve ortak yardımcılar."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Iterator

import anthropic
from dotenv import load_dotenv

load_dotenv()

PROMPTS_DIR = Path(__file__).parent / "prompts"


@lru_cache(maxsize=1)
def get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic()


def get_model() -> str:
    return os.getenv("ANTHROPIC_MODEL", "claude-opus-4-7")


@lru_cache(maxsize=16)
def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.txt").read_text(encoding="utf-8")


def parse_structured(
    *,
    system_prompt: str,
    user_prompt: str,
    response_model,
    max_tokens: int = 8192,
):
    """Pydantic model'e göre structured output üretir. Sistem prompt'u cache'lenir."""
    client = get_client()
    response = client.messages.parse(
        model=get_model(),
        max_tokens=max_tokens,
        system=[{
            "type": "text",
            "text": system_prompt,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": user_prompt}],
        output_format=response_model,
    )
    return response.parsed_output


def stream_text(
    *,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 16000,
) -> Iterator[str]:
    """Streaming metin üretir. Sistem prompt'u cache'lenir."""
    client = get_client()
    with client.messages.stream(
        model=get_model(),
        max_tokens=max_tokens,
        system=[{
            "type": "text",
            "text": system_prompt,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": user_prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text


def generate_text(
    *,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 16000,
) -> str:
    """Streaming ile tüm metni üretir, tek string döndürür."""
    return "".join(stream_text(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max_tokens,
    ))
