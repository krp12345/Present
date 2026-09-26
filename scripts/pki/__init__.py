"""A small private PKI: one CA, and server certificates for this host's IPs.

Layers, outermost first:

* ``cli`` and the scripts in ``scripts/`` -- wire concrete pieces together
* ``usecases``                            -- the two operations, abstractions only
* ``issuing``, ``profiles``, ``storage``, ``addresses``, ``keys`` -- one job each

Requires the ``cryptography`` package (``pip install cryptography``).
"""

from .errors import (
    AddressDiscoveryError,
    CommandError,
    MaterialExistsError,
    MaterialNotFoundError,
    PkiError,
)

__all__ = [
    "AddressDiscoveryError",
    "CommandError",
    "MaterialExistsError",
    "MaterialNotFoundError",
    "PkiError",
]
