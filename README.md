# 🔋 GrindSense - API Rest

![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![ElysiaJS](https://img.shields.io/badge/ElysiaJS-FFB7DE?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![Better-Auth](https://img.shields.io/badge/Better--Auth-000000?style=for-the-badge)

O **GrindSense** é o motor de back-end de um projeto de Iniciação Científica (IC) desenvolvido para o evento **NEXT 2026 (FIAP)**. Trata-se de uma plataforma de gamificação adaptativa que ajusta a carga de produtividade de estudantes com base nos seus dados biométricos (Variabilidade da Frequência Cardíaca - HRV e qualidade de sono), recolhidos via integração com dispositivos _wearables_ (Fitbit).

O objetivo principal é mitigar o _burnout_ académico, substituindo a gamificação punitiva (como a perda de _streaks_) por um sistema que respeita a recuperação fisiológica (Modo _Anti-Shame_).

---

## 🏗️ Arquitetura e Decisões de Engenharia

O projeto foi construído focando no **Estado da Arte** do ecossistema TypeScript moderno, garantindo performance, segurança e testabilidade:

- **Clean Architecture:** Separação estrita em camadas de Rotas, Controladores e Serviços (`Routes -> Controllers -> Services`), tornando as regras de negócio independentes do framework HTTP.
- **Runtime de Alta Performance:** Utilização do **Bun** e **ElysiaJS**, oferecendo tempos de resposta em microssigundos e validação estrita de esquemas na borda (_Edge Validation_).
- **Gestão de Sessões & Segurança:** Implementação do **Better-Auth** para gestão unificada de identidade, mitigando vulnerabilidades comuns de autenticação (rotação de tokens e invalidação de sessões).
- **Transações ACID:** Uso do **Drizzle ORM** com `db.transaction()` para garantir a consistência na distribuição de pontos de experiência (XP) e _status_ das tarefas diárias.
- **Deploy Imutável e Distroless:** Dockerização com compilação _standalone_ (_multi-stage build_). A imagem de produção baseia-se em `gcr.io/distroless/base-debian12`, removendo vulnerabilidades de _shell_ e garantindo um _cold start_ quase instantâneo.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos

- [Bun](https://bun.sh/) instalado localmente.
- [Docker](https://www.docker.com/) e Docker Compose instalados.
- Credenciais de Desenvolvedor da Fitbit (Client ID e Secret).

### 1. Variáveis de Ambiente

Crie um ficheiro `.env` na raiz do projeto com base no formato abaixo:

```env
# Base de Dados
DB_USER="admin"
DB_PASSWORD="admin_password"
DB_NAME="grindsense"
DB_HOST="localhost"
DB_PORT=5432
DATABASE_URL=postgresql://admin:admin_password@localhost:5432/grindsense
DATABASE_TEST_URL="postgresql://admin:admin_password@localhost:5432/grindsense_test"
PORT=3000

# Better Auth
BETTER_AUTH_SECRET=gerar_uma_chave_aleatoria_longa
BETTER_AUTH_URL=http://localhost:3000

# Cache/Redis Stream
REDIS_URL="redis://localhost:6379"

# OTEL
OTEL_SERVICE_NAME="grindsense-api"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/traces"
```

### 2. Executar com Docker Compose (Recomendado)

O ambiente Docker subirá a base de dados PostgreSQL, executará as migrações através de um _Init Container_ e iniciará a API de forma isolada e segura.

```bash
# Sobe toda a infraestrutura em background
docker-compose up -d
```

### 3. Executar Localmente (Modo de Desenvolvimento)

Caso queira correr o servidor localmente para desenvolvimento:

```bash
# Instala as dependências
bun install

# Sobe a base de dados, o worker e o redis via Docker
docker-compose up -d db grindsense-iot-worker redis

# Aplica as migrações na base de dados
bun run db:push

# Aplica o seed no banco
bun run db:seed

# Inicia o servidor em modo watch (hot-reload)
bun dev
```

### 4. Executar testes

```bash
# Sobe a base de dados, o worker e o redis via Docker
docker-compose up -d db grindsense-iot-worker redis

# Aplica as migrações na base de dados de teste
bun run tests:setup

# Executa os testes de integração
bun test
```

---

## 🔄 CI/CD Pipeline

Este repositório possui uma _pipeline_ configurada no **GitHub Actions**. A cada _push_ na _branch_ `main`:

1. O código é validado.
2. A imagem Docker é construída usando o _Dockerfile_ distroless otimizado.
3. A imagem é publicada automaticamente no **GitHub Container Registry (GHCR)**.

---

## 👨‍💻 Autores

Desenvolvido como projeto de Iniciação Científica para o **NEXT 2026 - FIAP**.
