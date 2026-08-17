# Frontend

Dashboard responsivo, sem dependências, para exibir a saúde do Supabase.

## Executar localmente

Com a API em execução na porta 8000, sirva esta pasta na porta 3000:

```powershell
cd frontend
npx serve . -l 3000
```

Abra `http://127.0.0.1:3000`. A tela consulta `http://127.0.0.1:8000/api/health` automaticamente. Para apontar para outra API, informe a URL na query string:

```text
http://127.0.0.1:3000/?api=http://outro-host:8000/api/health
```
