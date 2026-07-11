class FoundryError(RuntimeError):
    """Base error for bounded Content Foundry failures."""


class ValidationError(FoundryError):
    """A caller supplied data outside the Foundry contract."""


class ComfyUIError(FoundryError):
    """The local ComfyUI backend failed or returned unsafe data."""
