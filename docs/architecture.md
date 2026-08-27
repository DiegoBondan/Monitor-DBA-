# Arquitetura inicial

O cliente acessa a API FastAPI, que consulta `GET /auth/v1/settings` no projeto Supabase e retorna o estado normalizado.

```text
Dashboard -> FastAPI /api/health -> Supabase Auth settings
                         |
                         +-> banco de histórico
```

A API consulta o Supabase e registra as verificações automáticas no histórico por meio do serviço de persistência. A tabela `monitoramento` deve estar criada no banco para que o histórico seja salvo.

## Estados

- `online`: resposta HTTP 2xx.
- `degraded`: o Supabase respondeu com erro HTTP.
- `offline`: falha de rede, DNS ou timeout.
- `not_configured`: credenciais de desenvolvimento ainda não foram informadas.
