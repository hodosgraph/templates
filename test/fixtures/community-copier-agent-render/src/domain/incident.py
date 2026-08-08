"""User-owned incident policy created once by the template."""


def classify_incident(severity: str) -> str:
    if severity not in {"low", "medium", "high"}:
        raise ValueError("severity must be low, medium or high")
    return "review" if severity == "high" else "observe"
