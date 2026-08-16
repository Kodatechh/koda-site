#!/usr/bin/env python3
"""Provisiona com segurança a identidade de fábrica de um KodaBot."""

import argparse
import importlib.util
import json
import os
import re
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
REQUIRED_FIELDS = {"schema", "serial_number", "model", "activation_secret", "kodaos_version", "cloud_url"}
USB_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{4}:[0-9a-fA-F]{4}$")


@dataclass(frozen=True)
class ProvisioningPackage:
    serial_number: str
    model: str
    activation_secret: str  # Nunca imprimir este valor.
    kodaos_version: str
    cloud_url: str

    def identity(self) -> Dict[str, Any]:
        return {
            "schema": SCHEMA_VERSION,
            "serial_number": self.serial_number,
            "model": self.model,
            "activation_secret": self.activation_secret,
            "cloud_url": self.cloud_url,
            "kodaos_version": self.kodaos_version,
        }


class ProvisionError(Exception):
    """Erro esperado e seguro para exibição, sem dados do pacote."""


def required_string(data: Dict[str, Any], field: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ProvisionError(f'O campo "{field}" deve ser um texto não vazio.')
    return value.strip()


def load_package(file_path: str) -> ProvisioningPackage:
    path = Path(file_path).expanduser()
    if not path.is_file():
        raise ProvisionError("Arquivo de provisionamento não encontrado.")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise ProvisionError("O arquivo de provisionamento não contém um JSON válido.") from None
    if not isinstance(data, dict):
        raise ProvisionError("O pacote deve ser um objeto JSON.")
    if set(data) != REQUIRED_FIELDS:
        raise ProvisionError("O pacote não contém exatamente os campos esperados.")
    if data.get("schema") != SCHEMA_VERSION:
        raise ProvisionError("A versão do pacote não é suportada.")

    serial = required_string(data, "serial_number").upper()
    model = required_string(data, "model").lower()
    secret = required_string(data, "activation_secret")
    version = required_string(data, "kodaos_version")
    cloud_url = required_string(data, "cloud_url").rstrip("/")
    if not all(char.isalnum() or char == "-" for char in serial):
        raise ProvisionError("O número de série contém caracteres inválidos.")
    if model not in SUPPORTED_MODELS:
        raise ProvisionError("O modelo do pacote não é suportado.")
    if len(secret) < 16:
        raise ProvisionError("A credencial do pacote é inválida.")
    if not any(char.isdigit() for char in version):
        raise ProvisionError("A versão do KODA OS é inválida.")
    parsed = urlparse(cloud_url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.path not in ("", "/"):
        raise ProvisionError("A URL do KodaCloud deve ser uma origem HTTPS.")
    return ProvisioningPackage(serial, model, secret, version, cloud_url)


def run_mpremote(arguments: list[str], timeout: int = 12) -> subprocess.CompletedProcess[str]:
    if importlib.util.find_spec("mpremote") is None:
        raise ProvisionError("mpremote não está instalado.\n\n  python3 -m pip install mpremote")
    try:
        return subprocess.run(
            [sys.executable, "-m", "mpremote", *arguments],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise ProvisionError("A comunicação USB com o KodaBot expirou.") from None


def plausible_usb_ports(output: str) -> list[str]:
    """Extrai somente portas que têm uma identificação VID:PID USB real."""
    ports: list[str] = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) < 3 or not USB_ID_PATTERN.fullmatch(fields[2]) or fields[2].lower() == "0000:0000":
            continue
        port = fields[0]
        port_name = port.lower()
        if "bluetooth-incoming-port" in port_name or "debug-console" in port_name:
            continue
        if port not in ports:
            ports.append(port)
    return ports


def responds_as_micropython(port: str) -> bool:
    check_code = "import sys; print(sys.implementation.name)"
    try:
        result = run_mpremote(["connect", port, "exec", check_code], timeout=5)
    except ProvisionError:
        return False
    return result.returncode == 0 and any(
        line.strip().lower() == "micropython" for line in result.stdout.splitlines()
    )


def find_single_device() -> str:
    result = run_mpremote(["connect", "list"], timeout=5)
    if result.returncode != 0:
        raise ProvisionError("Não foi possível consultar os dispositivos USB com mpremote.")
    devices = [port for port in plausible_usb_ports(result.stdout) if responds_as_micropython(port)]
    if not devices:
        raise ProvisionError("Nenhum KodaBot encontrado via USB.")
    if len(devices) > 1:
        raise ProvisionError("Mais de um KodaBot foi encontrado via USB. Desconecte os demais e tente novamente.")
    return devices[0]


def write_and_verify(package: ProvisioningPackage, port: str) -> None:
    mkdir_code = "import os\ntry:\n os.mkdir('/factory')\nexcept OSError:\n pass"
    made = run_mpremote(["connect", port, "exec", mkdir_code])
    if made.returncode != 0:
        raise ProvisionError("Não foi possível preparar a pasta /factory no KodaBot.")

    identity_json = json.dumps(package.identity(), separators=(",", ":"), ensure_ascii=True)
    write_code = f"data={identity_json!r}\nwith open('/factory/device_identity.json','w') as f:\n f.write(data)"
    written = run_mpremote(["connect", port, "exec", write_code])
    if written.returncode != 0:
        raise ProvisionError("Não foi possível gravar a identidade no KodaBot.")

    read_code = "print(open('/factory/device_identity.json','r').read())"
    read = run_mpremote(["connect", port, "exec", read_code])
    if read.returncode != 0:
        raise ProvisionError("A identidade foi gravada, mas não pôde ser lida para verificação.")
    try:
        recorded = json.loads(read.stdout.strip())
    except json.JSONDecodeError:
        raise ProvisionError("A leitura de verificação do KodaBot não é válida.") from None
    if recorded != package.identity():
        raise ProvisionError("A identidade lida do KodaBot não corresponde ao pacote.")


def read_env_file(name: str) -> Optional[str]:
    for filename in (".env.local", ".env"):
        path = Path.cwd() / filename
        if not path.is_file():
            continue
        try:
            for line in path.read_text(encoding="utf-8").splitlines():
                key, separator, value = line.partition("=")
                if separator and key.strip() == name:
                    return value.strip().strip('"').strip("'") or None
        except OSError:
            continue
    return None


def publishable_key() -> Optional[str]:
    for name in ("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"):
        value = os.environ.get(name) or read_env_file(name)
        if value:
            return value
    return None


def check_in(package: ProvisioningPackage) -> None:
    key = publishable_key()
    if not key:
        raise ProvisionError("A chave pública do KodaCloud não foi encontrada no ambiente ou no arquivo .env.")
    payload = {"_serial_number": package.serial_number, "_activation_secret": package.activation_secret, "_kodaos_version": package.kodaos_version, "_hardware_revision": None}
    request = urllib.request.Request(f"{package.cloud_url}/rest/v1/rpc/factory_device_checkin", data=json.dumps(payload).encode("utf-8"), headers={"apikey": key, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, UnicodeError, json.JSONDecodeError):
        raise ProvisionError("O KodaBot foi gravado, mas o KodaCloud não confirmou o provisionamento.\n\nVocê pode tentar novamente, sem regravar:\n\n  python3 tools/factory-provisioner/provision.py <arquivo> --check-in") from None
    if not isinstance(result, dict) or result.get("provisioning_status") not in {"provisioned", "factory_tested", "ready"}:
        raise ProvisionError("O KodaBot foi gravado, mas o KodaCloud não confirmou o provisionamento.\n\nVocê pode executar --check-in novamente sem regravar.")


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", help="arquivo .koda-provision.json")
    parser.add_argument("--dry-run", action="store_true", help="somente validar o pacote")
    parser.add_argument("--write", action="store_true", help="gravar e verificar a identidade via USB")
    parser.add_argument("--check-in", action="store_true", help="confirmar o provisionamento no KodaCloud")
    parsed = parser.parse_args()
    if not (parsed.dry_run or parsed.write or parsed.check_in):
        parser.error("use --dry-run, --write, --check-in ou --write --check-in")
    if parsed.dry_run and (parsed.write or parsed.check_in):
        parser.error("--dry-run não pode ser combinado com outras ações")
    return parsed


def main() -> int:
    options = args()
    print("Koda Factory Provisioner")
    print("────────────────────────")
    try:
        package = load_package(options.package)
        print(f"\nSerial: {package.serial_number}")
        print(f"Modelo: {'KodaBot I Pro' if package.model == 'kodabot-i-pro' else 'KodaBot I'}\n")
        print("✓ Pacote validado")
        if options.dry_run:
            print("\nDry-run concluído. Nenhum dispositivo ou serviço foi alterado.")
            return 0
        if options.write:
            port = find_single_device()
            print("✓ KodaBot encontrado via USB")
            write_and_verify(package, port)
            print("✓ Identidade gravada")
            print("✓ Gravação verificada")
        if options.check_in:
            check_in(package)
            print("✓ KodaCloud confirmou o provisionamento")
        print(f"\n{package.serial_number} está provisionado." if options.check_in else "\nOperação concluída.")
        return 0
    except ProvisionError as error:
        print(f"\n✕ {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\n✕ Provisionamento cancelado.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
