# Koda Factory Provisioner

O `provision.py` é a ferramenta oficial para gravar a identidade de fábrica de um KodaBot por USB, verificar a gravação e confirmar o provisionamento no KodaCloud. Ele usa `mpremote` diretamente: não há bridge, servidor local, pairing, Web Serial, WebUSB ou serviço em background.

## Fluxo oficial

1. Abra `/fabrica` com uma conta de fábrica.
2. Cadastre o KodaBot.
3. Baixe o pacote `<serial>.koda-provision.json`.
4. Conecte somente esse KodaBot ao computador por USB.
5. Clique em **Copiar comando**.
6. Execute o comando no Terminal.
7. Volte para `/fabrica` e atualize o status.
8. Confirme que a produção mostra **Provisionado**.
9. Execute e aprove todos os testes de fábrica.
10. Marque o dispositivo como **Pronto para venda**.

## Instalação

Requer Python 3.8 ou mais recente e `mpremote`:

```bash
python3 -m pip install mpremote
```

O check-in usa `SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_PUBLISHABLE_KEY`. O provisionador procura primeiro no ambiente e depois em `.env.local` e `.env` na raiz do projeto. Ele nunca imprime a chave ou a credencial do dispositivo.

## Comando recomendado

Na raiz do projeto:

```bash
python3 tools/factory-provisioner/provision.py ~/Downloads/KBP-0003.koda-provision.json --write --check-in
```

Esse comando:

1. valida todos os campos do pacote;
2. exige que exatamente um dispositivo MicroPython esteja conectado;
3. cria `/factory` caso necessário;
4. grava somente `/factory/device_identity.json`;
5. lê o arquivo de volta e compara todos os campos;
6. somente após a verificação chama `factory_device_checkin`.

O script nunca formata a flash, apaga o filesystem, reinstala firmware ou altera arquivos do KODA OS fora de `/factory`.

## Modos disponíveis

Validar o pacote sem alterar hardware ou nuvem:

```bash
python3 tools/factory-provisioner/provision.py ~/Downloads/KBP-0003.koda-provision.json --dry-run
```

Gravar e verificar, sem check-in:

```bash
python3 tools/factory-provisioner/provision.py ~/Downloads/KBP-0003.koda-provision.json --write
```

Repetir somente o check-in, sem regravar:

```bash
python3 tools/factory-provisioner/provision.py ~/Downloads/KBP-0003.koda-provision.json --check-in
```

Gravar, verificar e fazer check-in:

```bash
python3 tools/factory-provisioner/provision.py ~/Downloads/KBP-0003.koda-provision.json --write --check-in
```

`--write` é idempotente: pode sobrescrever a mesma identidade e sempre confere o conteúdo final. `--check-in` também pode ser repetido com segurança.

## Pacote

O arquivo baixado por `/fabrica` tem este formato exato:

```json
{
  "schema": 1,
  "serial_number": "KBP-0003",
  "model": "kodabot-i",
  "activation_secret": "credencial-gerada-na-sessao",
  "kodaos_version": "0.4",
  "cloud_url": "https://projeto.supabase.co"
}
```

O pacote contém uma credencial sensível. Ela existe em texto puro somente na memória da sessão que cadastrou o dispositivo, no arquivo baixado e durante a execução do provisionador. O banco mantém apenas seu hash. Apague o pacote com segurança depois do provisionamento.

## Solução de problemas

### `mpremote não está instalado`

```bash
python3 -m pip install mpremote
```

### Nenhum KodaBot encontrado

Confirme que o KodaBot está ligado, que o cabo transmite dados e que o sistema reconheceu a porta USB. Não é necessário formatar, apagar ou colocar o Pico em modo de reinstalação.

### Mais de um KodaBot encontrado

Desconecte os demais dispositivos. O provisionador nunca escolhe um deles aleatoriamente.

### O KodaCloud não confirmou

Se a gravação e a verificação já foram concluídas, corrija a conexão ou a configuração da chave pública e repita somente:

```bash
python3 tools/factory-provisioner/provision.py ~/Downloads/KBP-0003.koda-provision.json --check-in
```
