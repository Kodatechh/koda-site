# Koda Factory Provisioner

Ferramenta de linha de comando para provisionar KodaBots durante a fabricação.

## Overview

O Koda Factory Provisioner é responsável por programar a identidade do dispositivo, versão de firmware e credenciais de ativação no hardware do KodaBot antes da entrega.

## Fluxo Completo de Provisionamento

```
1. CADASTRO DE UNIDADE
   └─ Administrador acessa Menu de Fábrica
   └─ Clica "Adicionar KodaBot"
   └─ Preenche dados: serial, modelo, datas, garantia
   └─ KodaCloud gera credencial única e a exibe
   └─ Administrador baixa "Pacote de Provisionamento" (JSON)

2. DESCARGA DO PACOTE
   └─ Arquivo: KBP-0001.koda-provision.json
   └─ Contém:
      • Número de série
      • Modelo (kodabot-i, kodabot-i-pro)
      • Credencial de ativação (apenas nessa sessão)
      • Versão KODA OS
      • URL da nuvem

3. PROVISIONAMENTO (USB)
   └─ Conectar KodaBot ao PC via USB
   └─ Executar: python3 provision.py KBP-0001.koda-provision.json
   └─ Script valida o pacote
   └─ Script grava identidade no Pico/microcontroller
   └─ Mensagem de sucesso exibida

4. CHECK-IN NA FÁBRICA
   └─ KodaBot é desconectado e ligado
   └─ Firmware confirma a identidade gravada
   └─ Chama RPC factory_device_checkin com serial + credencial
   └─ KodaCloud marca como "Provisionado"

5. TESTES DE FÁBRICA
   └─ Administrador acessa relatório de testes
   └─ Para KodaBot I, testa:
      • Display
      • Touch
      • Wi-Fi
      • Buzzer
      • BME280 (sensor)
      • Versão KODA OS
      • Conectividade KodaCloud
   └─ Marca cada teste como "Aprovado", "Reprovado" ou "N/A"
   └─ Quando todos os testes obrigatórios passam, clica "Marcar como Testado"
   └─ KodaCloud muda status para "Testado"

6. PRONTO PARA VENDA
   └─ Administrador clica "Marcar como Pronto para Venda"
   └─ Status muda para "Pronto para Venda"
   └─ Apenas assim o cliente pode ativar

7. ATIVAÇÃO DO CLIENTE
   └─ Cliente recebe KodaBot
   └─ Liga pela primeira vez
   └─ KodaBot se conecta à Wi-Fi (ou USB)
   └─ Usa credencial gravada para provar identidade
   └─ Obtém código de ativação temporário
   └─ Acessa koda.cloud/conta para reclamar como seu
   └─ KodaCloud muda status para "Ativado"
```

## Instalação

### Pré-requisitos

- Python 3.8+
- `mpremote` (para gravação em hardware Raspberry Pi Pico W)
  ```bash
  pip install mpremote
  ```

### Setup

1. Coloque o arquivo `provision.py` em `tools/factory-provisioner/`
2. Torne executável:
   ```bash
   chmod +x tools/factory-provisioner/provision.py
   ```

## Uso

### Validar Pacote (Dry Run)

Verifica se o pacote é válido **sem** escrever no dispositivo:

```bash
python3 provision.py KBP-0001.koda-provision.json --dry-run
```

**Saída esperada:**
```
Koda Factory Provisioner

✓ Pacote válido
✓ Modelo: KodaBot I
✓ Serial: KBP-0001
✓ KODA OS: 0.4
✓ Hardware: Rev B

Pronto para provisionamento.

Device identity (será escrito no KodaBot):
{
  "schema": 1,
  "serial": "KBP-0001",
  "model": "kodabot-i",
  "secret_hash": "d2d9b7e...",
  "kodaos_version": "0.4",
  "cloud_url": "https://qqvwnsemihkknzodkxob.supabase.co"
}

⚠️  A credencial de ativação foi validada mas NÃO será exibida.
   Ela existe apenas durante esta sessão de provisionamento.
```

### Provisionar Hardware

1. **Conecte** o KodaBot (Raspberry Pi Pico W) via USB ao PC
2. **Execute** o provisioner:
   ```bash
   python3 provision.py KBP-0001.koda-provision.json
   ```

3. **Aguarde** a conclusão:
   ```
   Koda Factory Provisioner

   ✓ Pacote válido
   ✓ Dispositivo encontrado
   ✓ Credenciais gravadas com sucesso
   ✓ Serial: KBP-0001
   ✓ Modelo: KodaBot I

   Próximas etapas:
   1. Desconecte o KodaBot do USB
   2. Conecte-o à energia
   3. Acesse https://koda.cloud para completar a ativação
   ```

## Estrutura do Pacote JSON

### Exemplo: `KBP-0001.koda-provision.json`

```json
{
  "schema": 1,
  "serial_number": "KBP-0001",
  "model": "kodabot-i",
  "activation_secret": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9",
  "kodaos_version": "0.4",
  "cloud_url": "https://qqvwnsemihkknzodkxob.supabase.co",
  "hardware_revision": "Rev B",
  "production_batch_id": "BATCH-2026-08-15"
}
```

### Campos

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `schema` | ✅ | Versão do schema (atualmente 1) |
| `serial_number` | ✅ | Número de série único (ex: KBP-0001) |
| `model` | ✅ | `kodabot-i` ou `kodabot-i-pro` |
| `activation_secret` | ✅ | Credencial aleatória gerada (min 16 caracteres) |
| `kodaos_version` | ✅ | Versão do firmware (ex: 0.4) |
| `cloud_url` | ✅ | URL da instância Supabase |
| `hardware_revision` | ❌ | Revisão do hardware (ex: Rev B) |
| `production_batch_id` | ❌ | ID do lote de produção |

## Segurança

### Credencial de Ativação

- ✅ **Gerada aleatoriamente** no KodaCloud
- ✅ **Exibida apenas uma vez** durante o registro
- ✅ **Armazenada como SHA-256** no banco de dados
- ✅ **Nunca salva em plaintext**
- ✅ **Nunca impressa pelo provisioner**
- ❌ **Não coloque em URLs ou query strings**
- ❌ **Não commit no Git**

### Arquivo de Pacote

- Deve ser baixado via HTTPS do KodaCloud
- Contém a credencial apenas durante a sessão do navegador
- Após recarregar a página, é impossível recuperar do banco
- Deve ser armazenado de forma segura durante o provisionamento
- Recomenda-se deletar após uso

## Validações

O provisioner valida:

✅ Formato JSON válido  
✅ Schema version 1  
✅ Campos obrigatórios presentes  
✅ Número de série (alphanumeric + hyphens)  
✅ Modelo suportado (kodabot-i, kodabot-i-pro)  
✅ Credencial com mínimo 16 caracteres  
✅ Versão KODA OS com dígitos  
✅ URL da nuvem com protocolo HTTP/HTTPS  

## Troubleshooting

### "mpremote não encontrado"

```bash
# Instale a ferramenta
pip install mpremote

# Verifique a instalação
mpremote --version
```

### "Nenhum dispositivo MicroPython encontrado"

1. Verifique conexão USB
2. Procure drivers de USB no PC/Mac
3. Tente outro cabo USB
4. Verifique se o Pico está em modo bootloader:
   - Desconecte
   - Pressione BOOTSEL enquanto conecta
   - Deve aparecer como `RPI-RP2` no explorador de arquivos

### "Credencial inválida"

1. Verifique que o arquivo JSON foi baixado do KodaCloud
2. Confirme que a sessão no navegador ainda está ativa
3. Gere um novo pacote se necessário

## Desenvolvimento

### Estrutura do Código

```
provision.py
├── ProvisioningPackage  # Representa o pacote validado
├── load_provision_package()  # Carrega e valida JSON
├── provision_dry_run()  # Modo validação
├── provision_hardware()  # Escreve no hardware via mpremote
└── main()  # Entrada principal
```

### Extensões Futuras

- [ ] Suporte a gravação via serial port direto (sem mpremote)
- [ ] Verificação de firmware antes do provisionamento
- [ ] Logging detalhado de operações
- [ ] Suporte a lotes múltiplos
- [ ] Integração com banco de dados local para auditoria

## Referências

- [KodaBot I Specs](/src/routes/kodabot.tech-specs.tsx)
- [KodaOS Changelog](/src/routes/kodaos.changelog.tsx)
- [Supabase Docs](https://supabase.com/docs)
- [MicroPython mpremote](https://docs.micropython.org/en/latest/reference/mpremote.html)
