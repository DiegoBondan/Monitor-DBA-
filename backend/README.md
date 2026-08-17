# Backend

API FastAPI responsável por consultar a saúde do Supabase.

- `app/api/routes`: camada HTTP.
- `app/services`: consulta externa ao Supabase.
- `app/models`: formatos de resposta da API.
- `app/core`: leitura de variáveis de ambiente.

O endpoint `GET /api/health` não falha quando o `.env` ainda não foi configurado: ele retorna `not_configured`. Isso deixa a documentação e o servidor acessíveis desde o primeiro clone.
