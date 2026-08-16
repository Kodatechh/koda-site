import contextlib
import importlib.util
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("provision.py")
SPEC = importlib.util.spec_from_file_location("koda_factory_provision", MODULE_PATH)
provision = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(provision)

TEST_SECRET = "a" * 64
VALID = {
    "serial": "KBP-9999",
    "model": "kodabot-i",
    "board_uid": "49b0eb4b537cd293",
    "device_secret_hex": TEST_SECRET,
}


class ProvisionTests(unittest.TestCase):
    def identity_file(self, payload):
        directory = tempfile.TemporaryDirectory()
        path = Path(directory.name) / "factory_identity.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        self.addCleanup(directory.cleanup)
        return str(path)

    def test_accepts_only_canonical_identity(self):
        identity = provision.load_identity(self.identity_file(VALID))
        self.assertEqual(identity.payload(), VALID)

    def test_rejects_invalid_secret_without_echoing_it(self):
        payload = {**VALID, "device_secret_hex": "INVALID-SECRET"}
        with self.assertRaisesRegex(provision.ProvisionError, "64 caracteres"):
            provision.load_identity(self.identity_file(payload))

    def test_rejects_invalid_model(self):
        with self.assertRaisesRegex(provision.ProvisionError, "modelo"):
            provision.load_identity(self.identity_file({**VALID, "model": "KodaBot-I"}))

    def test_board_uid_mismatch_aborts_before_write(self):
        identity = provision.FactoryIdentity(**VALID)
        with patch.object(provision, "physical_board_uid", return_value="0000000000000000"), patch.object(
            provision, "run_mpremote"
        ) as remote:
            with self.assertRaisesRegex(provision.ProvisionError, "não corresponde"):
                provision.write_and_verify(identity, "/dev/test")
            remote.assert_not_called()

    def test_write_and_readback(self):
        identity = provision.FactoryIdentity(**VALID)
        completed = subprocess.CompletedProcess([], 0, stdout="", stderr="")
        readback = subprocess.CompletedProcess([], 0, stdout=json.dumps(VALID), stderr="")
        with patch.object(provision, "physical_board_uid", return_value=VALID["board_uid"]), patch.object(
            provision, "run_mpremote", side_effect=[completed, completed, readback]
        ):
            provision.write_and_verify(identity, "/dev/test")

    def test_no_pico_found(self):
        completed = subprocess.CompletedProcess([], 0, stdout="", stderr="")
        with patch.object(provision, "run_mpremote", return_value=completed):
            with self.assertRaisesRegex(provision.ProvisionError, "Nenhum KodaBot"):
                provision.find_single_device()

    def test_secret_never_reaches_main_output(self):
        path = self.identity_file(VALID)
        stdout, stderr = io.StringIO(), io.StringIO()
        with patch("sys.argv", ["provision.py", path, "--dry-run"]):
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                self.assertEqual(provision.main(), 0)
        self.assertNotIn(TEST_SECRET, stdout.getvalue())
        self.assertNotIn(TEST_SECRET, stderr.getvalue())

    def test_cloud_verification_uses_challenge_hmac_and_status_only(self):
        identity = provision.FactoryIdentity(**VALID)
        responses = [
            {"challenge_id": "challenge-id", "nonce": "nonce"},
            {"device_token": "temporary-device-token"},
            {"serial": VALID["serial"], "model": VALID["model"]},
        ]
        with patch.object(provision, "request_json", side_effect=responses) as request:
            provision.verify_cloud(identity, "https://example.supabase.co")
        self.assertEqual(request.call_count, 3)
        auth_payload = request.call_args_list[1].args[2]
        expected_message = "|".join(
            (VALID["serial"], VALID["model"], VALID["board_uid"], "challenge-id", "nonce")
        )
        expected_proof = __import__("hmac").new(
            bytes.fromhex(TEST_SECRET),
            expected_message.encode("utf-8"),
            __import__("hashlib").sha256,
        ).hexdigest()
        self.assertEqual(auth_payload["proof"], expected_proof)
        self.assertNotIn(TEST_SECRET, json.dumps(request.call_args_list, default=str))


if __name__ == "__main__":
    unittest.main()
