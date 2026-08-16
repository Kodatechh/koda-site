#!/usr/bin/env python3
"""Grava e verifica a identidade canônica de fábrica de um KodaBot."""

import argparse
import hashlib
import hmac
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

SUPPORTED_MODELS = {"kodabot-i", "kodabot-i-pro"}
REQUIRED_FIELDS = {"serial", "model", "board_uid", "device_secret_hex"}
SERIAL_PATTERN = re.compile(r"^KBP-[0-9]{4,}$")
BOARD_UID_PATTERN = re.compile(r"^[0-9a-f]{8,}$")
SECRET_PATTERN = re.compile(r"^[0-9a-f]{64}$")
USB_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{4}:[0-9a-fA-F]{4}$")


@dataclass(frozen=True)
class FactoryIdentity:
    serial: str
    model: str
    board_uid: str
    device_secret_hex: str

    def payload(self) -> Dict[str, str]:
        return {
            "serial": self.serial,
            "model": self.model,
            "board_uid": self.board_uid,
            "device_secret_hex": self.device_secret_hex,
        }


class ProvisionError(Exception):
    """Erro esperado e seguro para exibição."""


def required_string(data: Dict[str, Any], field: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ProvisionError(f'O campo "{field}" deve ser um texto não vazio.')
    if value != value.strip():
        raise ProvisionError(f'O campo "{field}" não pode conter espaços nas extremidades.')
    return value


def load_identity(file_path: str) -> FactoryIdentity:
    path = Path(file_path).expanduser()
    if not path.is_file():
        raise ProvisionError("Arquivo de identidade não encontrado.")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise ProvisionError("O arquivo não contém um JSON válido.") from None
    if not isinstance(data, dict) or set(data) != REQUIRED_FIELDS:
        raise ProvisionError("A identidade não contém exatamente os campos esperados.")

    serial = required_string(data, "serial")
    model = required_string(data, "model")
    board_uid = required_string(data, "board_uid")
    secret = required_string(data, "device_secret_hex")

    if not SERIAL_PATTERN.fullmatch(serial):
        raise ProvisionError("O número de série é inválido.")
    if model not in SUPPORTED_MODELS:
        raise ProvisionError("O modelo não é suportado.")
    if not BOARD_UID_PATTERN.fullmatch(board_uid):
        raise ProvisionError("O Board UID deve ser hexadecimal minúsculo.")
    if not SECRET_PATTERN.fullmatch(secret):
        raise ProvisionError("A credencial deve conter exatamente 64 caracteres hexadecimais minúsculos.")
    return FactoryIdentity(serial, model, board_uid, secret)


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
    ports: list[str] = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) < 3 or not USB_ID_PATTERN.fullmatch(fields[2]) or fields[2].lower() == "0000:0000":
            continue
        port = fields[0]
        if "bluetooth-incoming-port" in port.lower() or "debug-console" in port.lower():
            continue
        if port not in ports:
            ports.append(port)
    return ports


def responds_as_micropython(port: str) -> bool:
    try:
        result = run_mpremote(["connect", port, "exec", "import sys; print(sys.implementation.name)"], timeout=5)
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
        raise ProvisionError("Mais de um KodaBot foi encontrado via USB. Desconecte os demais.")
    return devices[0]


def physical_board_uid(port: str) -> str:
    code = "import machine,ubinascii; print(ubinascii.hexlify(machine.unique_id()).decode())"
    result = run_mpremote(["connect", port, "exec", code], timeout=5)
    if result.returncode != 0:
        raise ProvisionError("Não foi possível ler o Board UID físico do KodaBot.")
    candidates = [line.strip() for line in result.stdout.splitlines() if BOARD_UID_PATTERN.fullmatch(line.strip())]
    if len(candidates) != 1:
        raise ProvisionError("O Board UID físico retornado pelo KodaBot é inválido.")
    return candidates[0]


def write_and_verify(identity: FactoryIdentity, port: str) -> None:
    if physical_board_uid(port) != identity.board_uid:
        raise ProvisionError("O Board UID deste KodaBot não corresponde ao pacote de provisionamento.")

    mkdir = run_mpremote([
        "connect", port, "exec",
        "import os\ntry:\n os.mkdir('/factory')\nexcept OSError:\n pass",
    ])
    if mkdir.returncode != 0:
        raise ProvisionError("Não foi possível preparar a pasta /factory no KodaBot.")

    encoded = json.dumps(identity.payload(), separators=(",", ":"), ensure_ascii=True)
    code = f"data={encoded!r}\nwith open('/factory/device_identity.json','w') as f:\n f.write(data)"
    if run_mpremote(["connect", port, "exec", code]).returncode != 0:
        raise ProvisionError("Não foi possível gravar a identidade no KodaBot.")

    read = run_mpremote([
        "connect", port, "exec",
        "print(open('/factory/device_identity.json','r').read())",
    ])
    if read.returncode != 0:
        raise ProvisionError("A identidade foi gravada, mas não pôde ser verificada.")
    try:
        recorded = json.loads(read.stdout.strip())
    except json.JSONDecodeError:
        raise ProvisionError("A leitura de verificação do KodaBot não é válida.") from None
    if recorded != identity.payload():
        raise ProvisionError("A identidade lida do KodaBot não corresponde ao pacote.")
    if not SECRET_PATTERN.fullmatch(str(recorded.get("device_secret_hex", ""))):
        raise ProvisionError("A credencial gravada não passou na validação de formato.")


def cloud_url() -> Optional[str]:
    value = os.environ.get("KODA_CLOUD_URL") or os.environ.get("VITE_SUPABASE_URL")
    return value.rstrip("/") if value else None


def request_json(url: str, method: str, payload: Optional[Dict[str, str]] = None, token: Optional[str] = None) -> Dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, UnicodeError, json.JSONDecodeError):
        raise ProvisionError("Não foi possível verificar a identidade no novo KodaCloud.") from None
    if not isinstance(result, dict):
        raise ProvisionError("O KodaCloud retornou uma resposta inválida.")
    return result


def verify_cloud(identity: FactoryIdentity, base_url: str) -> None:
    endpoint = base_url.rstrip("/") + "/functions/v1/kodacloud-device"
    challenge = request_json(endpoint + "/v1/device/challenge", "POST", {
        "serial": identity.serial,
        "model": identity.model,
        "board_uid": identity.board_uid,
    })
    challenge_id = str(challenge.get("challenge_id", ""))
    nonce = str(challenge.get("nonce", ""))
    if not challenge_id or not nonce:
        raise ProvisionError("O KodaCloud não retornou um challenge válido.")
    message = "|".join((identity.serial, identity.model, identity.board_uid, challenge_id, nonce))
    proof = hmac.new(bytes.fromhex(identity.device_secret_hex), message.encode("utf-8"), hashlib.sha256).hexdigest()
    authenticated = request_json(endpoint + "/v1/device/auth", "POST", {
        "serial": identity.serial,
        "model": identity.model,
        "board_uid": identity.board_uid,
        "challenge_id": challenge_id,
        "proof": proof,
    })
    token = str(authenticated.get("device_token", ""))
    if not token:
        raise ProvisionError("O KodaCloud não autenticou a identidade do dispositivo.")
    status = request_json(endpoint + "/v1/device/status", "GET", token=token)
    if status.get("serial") != identity.serial or status.get("model") != identity.model:
        raise ProvisionError("O status retornado pelo KodaCloud não corresponde ao dispositivo.")


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("identity", help="arquivo factory_identity.json")
    parser.add_argument("--dry-run", action="store_true", help="somente validar a identidade")
    parser.add_argument("--write", action="store_true", help="validar UID, gravar e fazer readback via USB")
    parser.add_argument("--verify-cloud", action="store_true", help="testar challenge, HMAC e status no KodaCloud")
    parsed = parser.parse_args()
    if not (parsed.dry_run or parsed.write or parsed.verify_cloud):
        parser.error("use --dry-run, --write, --verify-cloud ou combine --write --verify-cloud")
    if parsed.dry_run and (parsed.write or parsed.verify_cloud):
        parser.error("--dry-run não pode ser combinado com outras ações")
    return parsed


def main() -> int:
    options = arguments()
    print("Koda Factory Provisioner")
    print("────────────────────────")
    try:
        identity = load_identity(options.identity)
        print(f"\nSerial: {identity.serial}")
        print(f"Modelo: {'KodaBot I Pro' if identity.model == 'kodabot-i-pro' else 'KodaBot I'}")
        print("✓ Identidade validada")
        if options.dry_run:
            print("\nDry-run concluído. Nenhum dispositivo ou serviço foi alterado.")
            return 0
        if options.write:
            port = find_single_device()
            print("✓ KodaBot encontrado via USB")
            write_and_verify(identity, port)
            print("✓ Board UID físico verificado")
            print("✓ Identidade gravada com sucesso")
            print("✓ Credencial: presente")
        if options.verify_cloud:
            base_url = cloud_url()
            if not base_url:
                raise ProvisionError("Defina KODA_CLOUD_URL para verificar o novo KodaCloud.")
            verify_cloud(identity, base_url)
            print("✓ Challenge, HMAC e status verificados no KodaCloud")
        print("\nOperação concluída.")
        return 0
    except ProvisionError as error:
        print(f"\n✕ {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\n✕ Provisionamento cancelado.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
