# mnil.ink — Encurtador de Links

Encurtador de links com domínio customizado, deploy no Vercel e banco MySQL.

## Tecnologias

- **Frontend:** React + Vite + TailwindCSS v4 + tRPC + shadcn/ui
- **Backend:** Express.js (deployado como Vercel Function)
- **Database:** MySQL (PlanetScale, Railway, ou qualquer MySQL)
- **ORM:** Drizzle ORM
- **Auth:** JWT + Session Cookies (registro/login por email)

## Variáveis de Ambiente

Configure no painel do Vercel (Settings > Environment Variables):

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão MySQL | `mysql://user:pass@host:3306/mnil_ink` |
| `JWT_SECRET` | Secret para JWT (gerar com `openssl rand -hex 32`) | `a1b2c3d4e5f6...` |

## Deploy no Vercel

### 1. Preparar o Banco de Dados

O projeto precisa de um banco MySQL. Opções gratuitas:

- **PlanetScale** (plano gratuito): https://planetscale.com
- **Railway** (US$5/mês): https://railway.app
- **Azure MySQL** (trial): https://azure.microsoft.com

Execute as migrações SQL no seu banco:

```sql
-- Migração 1: Tabela users
CREATE TABLE `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

-- Migração 2: Tabela links
CREATE TABLE `links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slug` varchar(64) NOT NULL,
  `url` text NOT NULL,
  `userId` int,
  `clickCount` bigint NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `links_id` PRIMARY KEY(`id`),
  CONSTRAINT `links_slug_unique` UNIQUE(`slug`)
);
```

### 2. Configurar o Vercel

1. Push este repo para o GitHub
2. No Vercel, clique em "New Project" e importe o repo
3. Configure as variáveis de ambiente (DATABASE_URL e JWT_SECRET)
4. O Vercel detectará automaticamente o `vercel.json` e fará o deploy

### 3. Configurar o Domínio mnil.ink

1. No painel do Vercel, vá em **Settings > Domains**
2. Adicione `mnil.ink` como domínio customizado
3. No Porkbun, atualize o DNS:
   - **ALIAS/A record** para `76.76.21.21` (Vercel)
   - Ou configure os nameservers do Vercel:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`
4. O Vercel provisiona o SSL automaticamente

### 4. Funcionalidades

- Encurtar links com slug aleatório ou personalizado
- Registro e login por email
- Histórico de links criados
- Contagem de cliques
- Deletar links
- Contador de cliques atualizado automaticamente

### Desenvolvimento Local

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```
