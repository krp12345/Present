"""Error types raised by the PKI package.

One place to catch everything this package can fail with.
"""


class PkiError(Exception):
    """Base class for every failure raised by this package."""


class AddressDiscoveryError(PkiError):
    """No usable IP address could be discovered."""


class MaterialNotFoundError(PkiError):
    """A key or certificate was expected on disk and is not there."""


class MaterialExistsError(PkiError):
    """Writing would overwrite existing material and overwrite was not allowed."""


class CommandError(PkiError):
    """An external command failed or produced output that cannot be parsed."""
