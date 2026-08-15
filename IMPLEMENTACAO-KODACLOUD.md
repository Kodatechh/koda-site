# Implementação KodaCloud

Esta versão prepara a conta única da Koda para site, ativação, garantia, suporte e dispositivos.

## 1. Banco de dados

Aplique a migration:

```text
supabase/migrations/20260815163200_kodacloud_devices.sql
```

Ela cria:

- `profiles`
- `devices`
- `device_activation_secrets`
- `device_activation_sessions`
- `device_events`
- `support_cases`
- RLS para proprietários e administradores
- RPCs para fábrica e ativação

## 2. Conta de fábrica

A interface não libera o Menu de Fábrica comparando um e-mail no navegador. A autorização real usa a role `admin` no banco.

A migration tenta conceder a role automaticamente à conta confirmada:

```text
Kodatechproducts@gmail.com
```

Se essa conta for criada ou confirmada depois da migration, execute uma vez no SQL Editor do Supabase:

```sql
insert into public.user_roles(user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = 'kodatechproducts@gmail.com'
on conflict (user_id, role) do nothing;
```

Depois, saia e entre novamente no site para o menu `Fábrica` aparecer.

## 3. Fluxo de fábrica

Em `/fabrica`:

1. Cadastre o número de série.
2. Escolha o modelo.
3. Informe as datas e versão inicial do software, quando existirem.
4. O navegador gera uma credencial aleatória de ativação.
5. O banco guarda somente o hash dessa credencial.
6. A credencial em texto deve ser provisionada no KodaBot durante a fabricação.
7. O dispositivo nasce com status `not_activated` e sem proprietário.

A credencial não deve ser impressa na carcaça nem mostrada ao comprador.

## 4. Fluxo de ativação no KodaBot

Depois de concluir o Wi-Fi durante o primeiro setup, o firmware deve chamar a RPC `begin_device_activation` usando:

- número de série do próprio aparelho;
- credencial de ativação provisionada na fábrica.

A resposta inclui:

- `session_id`
- `activation_code`
- `expires_at`

O KODA OS deve então abrir ou apresentar ao usuário o endereço:

```text
https://SEU-DOMINIO/ativar?code=ACTIVATION_CODE
```

A sessão expira em 15 minutos.

## 5. Conta do comprador

Em `/ativar?code=...`:

- se o comprador não estiver autenticado, o site pede login ou criação de Conta KodaCloud;
- o retorno do login mantém a sessão de ativação;
- estando autenticado, o site chama `claim_device_activation`;
- o KodaBot passa para `activated`;
- `owner_user_id` recebe o usuário;
- `activated_at` é gravado;
- o dispositivo aparece automaticamente em `/conta`.

O cliente não reivindica o aparelho digitando apenas o serial.

## 6. Confirmação pelo firmware

O firmware pode consultar `check_device_activation` com o `session_id`, serial e credencial de fábrica. Quando `device_activated` se tornar `true`, o setup pode avançar para a tela final.

## 7. Google Login

O botão de Google já existe no frontend, mas o provedor precisa ser habilitado em:

```text
Supabase Dashboard → Authentication → Providers → Google
```

Cadastre também os domínios/redirect URLs usados em produção e desenvolvimento.

## 8. Variáveis de ambiente

O frontend espera as variáveis existentes do projeto:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Não coloque service role/secret key em variáveis `VITE_*`.

## 9. Fotos oficiais

A ativação e o KodaCloud não dependem das fotos. Os espaços reservados podem ser trocados por material oficial depois sem alterar essa arquitetura.
