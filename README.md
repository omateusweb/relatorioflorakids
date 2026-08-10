# EcomReports · Flora Kids

Evolução React/Vite do relatório financeiro com marketing, sessões e atribuição de pedidos Nuvemshop.

## Ativação

1. Copie `.env.example` para o ambiente da Vercel e preencha as variáveis.
2. Aplique `supabase/migrations/202608100001_tracking_attribution.sql` no projeto Supabase existente.
3. Registre `https://SEU-DOMINIO/api/webhooks/nuvemshop` para `order/paid`.
4. Instale na loja: `<script defer src="https://SEU-DOMINIO/tracker.js" data-endpoint="https://SEU-DOMINIO/api/track"></script>`.

O webhook aceita assinatura HMAC em hexadecimal ou base64, grava cada evento com chave única e faz upsert do pedido. A atribuição exata usa `ecom_session_id` quando esse valor for anexado ao pedido/checkout.

## O que falta para produção

- URL e chave anônima do Supabase para a interface.
- URL e service-role do Supabase somente no servidor.
- App ID, client secret, access token e store ID da Nuvemshop.
- Domínio real da loja em `TRACKING_ALLOWED_ORIGINS`.
- Confirmar como a loja permite persistir `ecom_session_id` no checkout/pedido (script, campo adicional ou app Nuvemshop).
- Mapear a tabela atual `reports` para migrar o dashboard financeiro; o app publicado expõe apenas essa tabela, mas o schema/repositório não está disponível localmente.
