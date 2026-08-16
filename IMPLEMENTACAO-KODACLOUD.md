# KodaCloud — Arquitetura Atual

## Fonte canônica

`public.devices` é o único cadastro de dispositivos. Identidade, ownership, estado de ativação, produção e vínculos de KodaCare usam o mesmo `device_id`.

## Fábrica

`kodacloud-factory-provision` valida o administrador e chama `koda_factory_provision_device`. O provisionamento:

1. cria ou encontra o registro em `devices`;
2. valida serial, modelo e Board UID;
3. gera uma credencial HMAC de 32 bytes;
4. grava `koda_device_credentials`;
5. muda a produção para `provisioned`;
6. devolve uma única vez o conteúdo de `factory_identity.json`.

Formato oficial:

```json
{
  "serial": "KBP-0000",
  "model": "kodabot-i",
  "board_uid": "0000000000000000",
  "device_secret_hex": "<64 caracteres hexadecimais minúsculos>"
}
```

## Autenticação do hardware

1. O aparelho envia serial, modelo e Board UID para `POST /v1/device/challenge`.
2. KodaCloud cria um nonce curto em `koda_device_challenges`.
3. O aparelho calcula HMAC SHA-256 usando `device_secret_hex`.
4. A mensagem assinada é `serial|model|board_uid|challenge_id|nonce`.
5. `POST /v1/device/auth` consome o challenge e retorna um device token temporário.
6. O hash do token fica em `koda_device_tokens`; o token em texto puro existe somente no aparelho.

Challenges são de uso único e expiram. Tokens podem ser revogados.

## Ativação e Conta Koda

Um dispositivo autenticado e Ready cria uma sessão em `koda_activation_sessions`. KodaCloud devolve uma URL do site no formato `/ativar?token=...`.

O site preserva o token durante login ou criação da conta e chama `kodacloud-claim`. A função `koda_claim_device` valida a sessão, atribui `devices.owner_user_id`, marca o dispositivo como `activated` e conclui a sessão. O aparelho consulta a sessão até receber o estado final.

Conhecer apenas serial ou Board UID não permite reivindicar um dispositivo.

## Runtime e OTA

Com device token válido, o aparelho pode consultar status e enviar heartbeat. O heartbeat atualiza presença e versão sem reduzir uma versão já armazenada. OTA usa o mesmo dispositivo canônico e autenticação do hardware.

## Suporte e restauração de fábrica

`support_factory_reset_device`:

- revoga device tokens;
- invalida challenges;
- cancela activation sessions pendentes;
- rotaciona `koda_device_credentials`;
- remove ownership;
- retorna uma nova identidade one-time no formato canônico.

O Board UID permanece associado ao mesmo dispositivo.

## Fluxo descontinuado

O fluxo antigo baseado em credencial de ativação compartilhada e código digitável foi descontinuado e não deve possuir callers operacionais.
