# Koda Factory Provisioner

Ferramenta oficial para validar e gravar a identidade canônica de fábrica de um KodaBot via USB. Ela grava somente `/factory/device_identity.json` e nunca imprime a credencial.

## Fluxo oficial

1. Em `/fabrica`, informe serial, modelo e Board UID.
2. Provisione o dispositivo e baixe `factory_identity.json`.
3. Conecte somente o Pico correspondente por USB.
4. Execute o provisionador com `--write`.
5. O UID físico é lido com `machine.unique_id()` e precisa coincidir com o pacote antes de qualquer gravação.
6. A identidade é escrita e lida novamente para validação.
7. Opcionalmente, use `--verify-cloud` para testar challenge, HMAC e status.
8. Continue os testes de fábrica e marque o dispositivo como Ready.

## Requisitos

- Python 3.8 ou superior
- `mpremote` instalado para operações USB

```bash
python3 -m pip install mpremote
```

## Formato aceito

Somente o formato canônico é aceito:

```json
{
  "serial": "KBP-0000",
  "model": "kodabot-i",
  "board_uid": "0000000000000000",
  "device_secret_hex": "<64 caracteres hexadecimais minúsculos>"
}
```

Modelos aceitos: `kodabot-i` e `kodabot-i-pro`. O segredo representa 32 bytes, permanece apenas em memória durante a execução e nunca aparece no terminal.

## Comandos

Validar sem alterar hardware ou nuvem:

```bash
python3 tools/factory-provisioner/provision.py factory_identity.json --dry-run
```

Validar o UID físico, gravar e fazer readback:

```bash
python3 tools/factory-provisioner/provision.py factory_identity.json --write
```

Gravar e verificar a autenticação no KodaCloud:

```bash
KODA_CLOUD_URL=https://seu-projeto.supabase.co \
python3 tools/factory-provisioner/provision.py factory_identity.json --write --verify-cloud
```

A verificação remota usa exclusivamente:

1. `POST /v1/device/challenge`
2. HMAC SHA-256 de `serial|model|board_uid|challenge_id|nonce`
3. `POST /v1/device/auth`
4. `GET /v1/device/status`

O device token fica somente em memória. A verificação não cria sessão de ativação, não altera proprietário e não envia heartbeat.

## Segurança e falhas

Se o UID físico não coincidir, nada é gravado. O script não formata a flash, não altera o KODA OS e não grava arquivos temporários. Em caso de falha no KodaCloud, a identidade já gravada permanece válida e a verificação pode ser repetida separadamente com `--verify-cloud`.
