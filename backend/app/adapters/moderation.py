# Replace with real ML moderation, CSAM hash matching, nudity classifiers, etc.
HARSH_TERMS = {"kill", "bomb", "rape"}  # demo only

def prefilter_text(text: str) -> tuple[bool, str | None]:
    t = text.lower()
    for b in HARSH_TERMS:
        if b in t:
            return False, f"disallowed_term:{b}"
    return True, None

def postfilter_text(text: str) -> tuple[bool, str | None]:
    # hook for async ML; default allow
    return True, None
