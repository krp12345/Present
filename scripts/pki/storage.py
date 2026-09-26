"""Where keys and certificates live.

The use cases talk to :class:`MaterialStore`. Only the filesystem
implementation below knows about paths, file modes and PEM encoding.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Protocol, Sequence

from cryptography import x509
from cryptography.hazmat.primitives import serialization

from .errors import MaterialExistsError, MaterialNotFoundError, PkiError
from .keys import PrivateKey

KEY_MODE = 0o600
CERT_MODE = 0o644


class KeyProtection(Protocol):
    """How a private key is protected at rest."""

    def encryption(self) -> serialization.KeySerializationEncryption: ...

    def passphrase(self) -> bytes | None: ...


class UnencryptedKey:
    """Plain PEM, protected by file permissions only.

    The right choice for a server key that a service must read unattended.
    """

    def encryption(self) -> serialization.KeySerializationEncryption:
        return serialization.NoEncryption()

    def passphrase(self) -> bytes | None:
        return None


class PassphraseProtectedKey:
    """PEM encrypted with a passphrase. Worth it for the CA key."""

    def __init__(self, passphrase: bytes) -> None:
        if not passphrase:
            raise ValueError("passphrase must not be empty")
        self._passphrase = passphrase

    def encryption(self) -> serialization.KeySerializationEncryption:
        return serialization.BestAvailableEncryption(self._passphrase)

    def passphrase(self) -> bytes | None:
        return self._passphrase


class MaterialStore(Protocol):
    """Reads and writes keys and certificates by name."""

    def save_key(self, name: str, key: PrivateKey, protection: KeyProtection) -> Path: ...

    def save_certificate(self, name: str, certificate: x509.Certificate) -> Path: ...

    def save_chain(
        self, name: str, certificates: Sequence[x509.Certificate]
    ) -> Path: ...

    def load_key(self, name: str, protection: KeyProtection) -> PrivateKey: ...

    def load_certificate(self, name: str) -> x509.Certificate: ...

    def exists(self, name: str) -> bool: ...

    def assert_writable(self, names: Sequence[str]) -> None:
        """Raise before anything is written if any name is already taken."""

    def path_of(self, name: str) -> Path: ...


class FilesystemMaterialStore:
    """PEM files in one directory, keys written readable by the owner only."""

    def __init__(self, directory: Path, overwrite: bool = False) -> None:
        self._directory = directory
        self._overwrite = overwrite

    def path_of(self, name: str) -> Path:
        return self._directory / name

    def exists(self, name: str) -> bool:
        return self.path_of(name).exists()

    def assert_writable(self, names: Sequence[str]) -> None:
        if self._overwrite:
            return
        taken = [str(self.path_of(name)) for name in names if self.exists(name)]
        if taken:
            raise MaterialExistsError(f"already exists: {', '.join(taken)}")

    def save_key(self, name: str, key: PrivateKey, protection: KeyProtection) -> Path:
        pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=protection.encryption(),
        )
        return self._write(name, pem, KEY_MODE)

    def save_certificate(self, name: str, certificate: x509.Certificate) -> Path:
        return self._write(
            name, certificate.public_bytes(serialization.Encoding.PEM), CERT_MODE
        )

    def save_chain(self, name: str, certificates: Sequence[x509.Certificate]) -> Path:
        pem = b"".join(
            certificate.public_bytes(serialization.Encoding.PEM)
            for certificate in certificates
        )
        return self._write(name, pem, CERT_MODE)

    def load_key(self, name: str, protection: KeyProtection) -> PrivateKey:
        data = self._read(name)
        try:
            return serialization.load_pem_private_key(
                data, password=protection.passphrase()
            )
        except TypeError as exc:
            raise PkiError(f"{name} is encrypted and no passphrase was given") from exc
        except ValueError as exc:
            raise PkiError(f"{name} could not be read (wrong passphrase?)") from exc

    def load_certificate(self, name: str) -> x509.Certificate:
        return x509.load_pem_x509_certificate(self._read(name))

    def _read(self, name: str) -> bytes:
        path = self.path_of(name)
        if not path.exists():
            raise MaterialNotFoundError(f"{path} does not exist")
        return path.read_bytes()

    def _write(self, name: str, payload: bytes, mode: int) -> Path:
        path = self.path_of(name)
        if path.exists() and not self._overwrite:
            raise MaterialExistsError(f"{path} already exists")
        self._directory.mkdir(parents=True, exist_ok=True)
        os.chmod(self._directory, 0o700)
        temporary = path.with_suffix(path.suffix + ".tmp")
        descriptor = os.open(
            temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode
        )
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
        except BaseException:
            temporary.unlink(missing_ok=True)
            raise
        os.chmod(temporary, mode)
        temporary.replace(path)
        return path
