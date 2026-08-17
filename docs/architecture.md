# Arquitetura inicial

O cliente acessa a API FastAPI, que consulta `GET /auth/v1/settings` no projeto Supabase e retorna o estado normalizado.

```text
Dashboard (futuro) -> FastAPI /api/health -> Supabase Auth settings
                              |
                              +-> banco de histórico (fase futura)
```

Na primeira versão, a API apenas consulta o Supabase. A tabela `monitoramento` foi preparada para persistência futura, que deve ser feita por um job interno e com políticas RLS definidas.

## Estados

- `online`: resposta HTTP 2xx.
- `degraded`: o Supabase respondeu com erro HTTP.
- `offline`: falha de rede, DNS ou timeout.
- `not_configured`: credenciais de desenvolvimento ainda não foram informadas.
