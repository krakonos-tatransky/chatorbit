# Replace with your vendor (e.g., DeepL, Google, etc.)
from functools import lru_cache

@lru_cache(maxsize=2048)
def translate_text(text: str, source_lang: str | None, target_lang: str) -> str:
    # TODO: call real provider here
    if source_lang == target_lang or target_lang is None:
        return text
    # VERY naive demo "translation"
    return f"[{target_lang}] {text}"
