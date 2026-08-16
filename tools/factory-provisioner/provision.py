#!/usr/bin/env python3
"""Validate, write, and check in a KodaBot factory provisioning package."""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlparse


SCHEMA_VERSION = 1
SUPPORTED_MODELS = {"kodabot-i", "kodabot-i-pro"}
MIN_SECRET_LENGTH = 16
REQUIRED_FIELDS = {"schema", "serial_number", "model", "activation_secret", "cloud_url"}
OPTIONAL_FIELDS = {"kodaos_version"}


@dataclass(frozen=True)
class ProvisioningPackage:
    serial_number: str
    model: str
    activation_secret: str  # Never log or print this value.
    cloud_url: str
    kodaos_version: Optional[str] = None

    def to_device_identity(self) -> Dict[str, Any]:
        identity: Dict[str, Any] = {
            "schema": SCHEMA_VERSION,
            "serial_number": self.serial_number,
            "model": self.model,
            "activation_secret": self.activation_secret,
            "cloud_url": self.cloud_url,
        }
        if self.kodaos_version:
            identity["kodaos_version"] = self.kodaos_version
        return identity


def load_provision_package(file_path: str) -> ProvisioningPackage:
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Provisioning package not found: {file_path}")

    try:
        with path.open("r", encoding="utf-8") as package_file:
            data = json.load(package_file)
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON: {error}") from error

    if not isinstance(data, dict):
        raise ValueError("Provisioning package must be a JSON object")
    if data.get("schema") != SCHEMA_VERSION:
        raise ValueError(
            f"Unsupported schema version: {data.get('schema')}. Expected {SCHEMA_VERSION}."
        )

    missing = sorted(REQUIRED_FIELDS - data.keys())
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    unexpected = sorted(data.keys() - REQUIRED_FIELDS - OPTIONAL_FIELDS)
    if unexpected:
        raise ValueError(f"Unsupported provisioning fields: {', '.join(unexpected)}")

    serial = _required_string(data, "serial_number").upper()
    model = _required_string(data, "model").lower()
    secret = _required_string(data, "activation_secret")
    cloud_url = _required_string(data, "cloud_url").rstrip("/")
    version = _optional_string(data, "kodaos_version")

    if not all(character.isalnum() or character == "-" for character in serial):
        raise ValueError("Serial number may contain only letters, numbers, and hyphens")
    if model not in SUPPORTED_MODELS:
        raise ValueError(f"Unsupported model: {model}")
    if len(secret) < MIN_SECRET_LENGTH:
        raise ValueError(f"Activation secret must contain at least {MIN_SECRET_LENGTH} characters")
    if version and not any(character.isdigit() for character in version):
        raise ValueError("KODA OS version must contain a number")

    parsed_url = urlparse(cloud_url)
    if parsed_url.scheme != "https" or not parsed_url.netloc or parsed_url.path not in ("", "/"):
        raise ValueError("Cloud URL must be an HTTPS origin without a path")

    return ProvisioningPackage(serial, model, secret, cloud_url, version)


def _required_string(data: Dict[str, Any], field: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value.strip()


def _optional_string(data: Dict[str, Any], field: str) -> Optional[str]:
    value = data.get(field)
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string when provided")
    return value.strip() or None


def provision_dry_run(package: ProvisioningPackage) -> bool:
    print("Koda Factory Provisioner")
    print("✓ Pacote válido")
    print(f"✓ Modelo: {_model_name(package.model)}")
    print(f"✓ Serial: {package.serial_number}")
    if package.kodaos_version:
        print(f"✓ KODA OS: {package.kodaos_version}")
    print("✓ Identidade contém somente os campos permitidos")
    print("✓ Credencial validada e ocultada")
    print("Dry-run concluído; nenhum dispositivo ou serviço remoto foi alterado.")
    return True


def write_identity(package: ProvisioningPackage) -> bool:
    if not _mpremote_available():
        print("✗ mpremote não encontrado ou indisponível", file=sys.stderr)
        return False

    listed = subprocess.run(
        ["mpremote", "list"], capture_output=True, text=True, timeout=5, check=False
    )
    if listed.returncode != 0 or not listed.stdout.strip():
        print("✗ Nenhum dispositivo MicroPython encontrado", file=sys.stderr)
        return False

    identity_json = json.dumps(package.to_device_identity(), separators=(",", ":"))
    write_code = (
        'with open("_koda_identity.json", "w") as identity_file: '
        f"identity_file.write({identity_json!r})"
    )
    written = subprocess.run(
        ["mpremote", "exec", write_code],
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    if written.returncode != 0:
        print("✗ Não foi possível gravar a identidade no KodaBot", file=sys.stderr)
        return False

    print("✓ Identidade gravada localmente no KodaBot")
    print("  O KodaCloud ainda não foi atualizado.")
    return True


def factory_check_in(package: ProvisioningPackage) -> bool:
    publishable_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY") or os.environ.get(
        "VITE_SUPABASE_PUBLISHABLE_KEY"
    )
    if not publishable_key:
        print(
            "✗ SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_PUBLISHABLE_KEY é obrigatória para --check-in",
            file=sys.stderr,
        )
        return False

    payload: Dict[str, Any] = {
        "_serial_number": package.serial_number,
        "_activation_secret": package.activation_secret,
        "_kodaos_version": package.kodaos_version,
        "_hardware_revision": None,
    }
    request = urllib.request.Request(
        f"{package.cloud_url}/rest/v1/rpc/factory_device_checkin",
        data=json.dumps(payload).encode("utf-8"),
        headers={"apikey": publishable_key, "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as error:
        print(f"✗ Check-in no KodaCloud falhou: {_safe_http_error(error)}", file=sys.stderr)
        return False

    if not isinstance(result, dict) or result.get("provisioning_status") not in {
        "provisioned",
        "factory_tested",
        "ready",
    }:
        print("✗ KodaCloud retornou uma resposta de check-in inválida", file=sys.stderr)
        return False

    print(f"✓ Check-in confirmado pelo KodaCloud para {package.serial_number}")
    return True


def _safe_http_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        return f"HTTP {error.code}"
    if isinstance(error, urllib.error.URLError):
        return str(error.reason)
    return type(error).__name__


def _mpremote_available() -> bool:
    try:
        result = subprocess.run(
            ["mpremote", "--version"], capture_output=True, timeout=2, check=False
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _model_name(model: str) -> str:
    return {"kodabot-i": "KodaBot I", "kodabot-i-pro": "KodaBot I Pro"}.get(model, model)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", help="Provisioning package JSON")
    parser.add_argument("--dry-run", action="store_true", help="Validate only")
    parser.add_argument("--write", action="store_true", help="Write identity over USB")
    parser.add_argument("--check-in", action="store_true", help="Confirm provisioning with KodaCloud")
    args = parser.parse_args()
    if not (args.dry_run or args.write or args.check_in):
        parser.error("choose --dry-run, --write, --check-in, or --write --check-in")
    if args.dry_run and (args.write or args.check_in):
        parser.error("--dry-run cannot be combined with --write or --check-in")
    return args


def main() -> int:
    args = parse_args()
    try:
        package = load_provision_package(args.package)
        if args.dry_run:
            return 0 if provision_dry_run(package) else 1
        if args.write and not write_identity(package):
            return 1
        if args.check_in and not factory_check_in(package):
            return 1
        return 0
    except (FileNotFoundError, ValueError) as error:
        print(f"✗ Pacote inválido: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("Provisionamento cancelado", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
