# API de Importação e Gerenciamento de Boletos GreenPark

## Descrição

Esta API gerencia a importação de boletos a partir de arquivos CSV e PDF, permitindo também a listagem e a geração de relatórios em PDF dos boletos cadastrados no sistema. O projeto utiliza Docker e Docker Compose para facilitar a configuração e execução do ambiente de desenvolvimento, incluindo banco de dados PostgreSQL, migrations e seeds automáticas.

## Funcionalidades Principais

* **Importação de CSV:** Recebe um arquivo CSV com dados de boletos, valida, mapeia o ID do lote (baseado no nome da unidade/lote formatado) e insere os boletos em lote no banco de dados.
* **Importação e Divisão de PDF:** Recebe um arquivo PDF multi-página único contendo boletos. Baseado em uma **ordem pré-definida** de nomes, o sistema divide o PDF em arquivos individuais (um por página) e salva cada um com o ID do boleto correspondente no banco de dados.
* **Listagem de Boletos:** Endpoint `GET /boletos` que retorna a lista de boletos cadastrados, com suporte a filtros por nome do sacado (parcial, case-insensitive), faixa de valor (`valor_inicial`, `valor_final`) e ID do lote (`id_lote`).
* **Geração de Relatório PDF:** O endpoint `GET /boletos` pode gerar um relatório em PDF (codificado em Base64) dos boletos filtrados ao passar o parâmetro `?relatorio=1`.

## Tecnologias Utilizadas

* **Backend:** Node.js, Fastify
* **Linguagem:** TypeScript
* **Banco de Dados:** PostgreSQL
* **ORM:** Sequelize
* **Containerização:** Docker, Docker Compose
* **Manipulação de PDF:** `pdf-lib` (para divisão), `pdfmake` (para geração de relatórios)
* **Parsing CSV:** `csv-parser`
* **Outros:** `@fastify/multipart`, `@fastify/cors`, `dotenv`, `pg`, `pg-hstore`

## Pré-requisitos

Antes de começar, garanta que você tenha instalado em sua máquina:

* [Node.js](https://nodejs.org/) (Versão LTS recomendada, ex: v18, v20)
* [npm](https://www.npmjs.com/) ou [Yarn](https://yarnpkg.com/)
* [Docker](https://www.docker.com/products/docker-desktop/)
* [Docker Compose](https://docs.docker.com/compose/install/) (geralmente vem com o Docker Desktop)

## Configuração e Instalação

Siga estes passos para configurar e rodar o projeto localmente:

1.  **Clone o Repositório:**
    ```bash
    git clone <url-do-seu-repositorio>
    cd <nome-da-pasta-do-projeto>
    ```

2.  **Crie o Arquivo de Ambiente (`.env`):**
    * Copie o arquivo de exemplo `.env.example` para um novo arquivo chamado `.env` na raiz do projeto.
        ```bash
        cp .env.example .env
        ```
    * **Edite o arquivo `.env`** e preencha as variáveis de ambiente necessárias, principalmente as credenciais do banco de dados. Elas serão usadas pelo Docker Compose para criar o banco e pela aplicação para se conectar a ele.
        ```dotenv
        # Exemplo de .env
        PORT=3333 # Porta onde a API Fastify irá rodar

        # Configurações do Banco de Dados (usadas pelo Docker Compose e pela App)
        DB_NAME=greenparkdb
        DB_USER=admin
        DB_PASSWORD=secret
        DB_HOST=db # Nome do serviço do banco no docker-compose.yml
        DB_PORT=5432
        DB_DIALECT=postgres

        NODE_ENV=development
        ```

3.  **Suba os Containers com Docker Compose:**
    * Este comando irá construir as imagens (se ainda não existirem), baixar a imagem do Postgres, criar os volumes, iniciar o container do banco de dados, aguardar o banco ficar pronto, rodar as migrations e seeds automaticamente (via serviço `migrate-seed`), e finalmente iniciar a API Fastify.
    ```bash
    docker-compose up --build -d
    ```
    * `--build`: Força a reconstrução das imagens caso haja alterações no `Dockerfile` ou no código fonte copiado.
    * `-d`: Executa os containers em modo "detached" (segundo plano).

## Executando o Projeto

* **Iniciar:** `docker-compose up -d` (se já tiver feito o build e setup inicial).
* **Parar:** `docker-compose down` (para os containers).
* **Parar e Remover Volumes:** `docker-compose down -v` (para os containers e **remove** o volume do banco de dados, apagando todos os dados).

## Banco de Dados

O setup do banco de dados (criação das tabelas e população inicial) é gerenciado automaticamente pelo serviço `migrate-seed` no `docker-compose.yml`.

* **Migrations:** Os arquivos de criação/alteração de tabelas estão em `/migrations`. São executados por `npx sequelize-cli db:migrate`.
* **Seeders:** Os arquivos para popular o banco com dados iniciais (como os lotes com nomes formatados) estão em `/seeders`. São executados por `npx sequelize-cli db:seed:all`.

## Testando a API com Postman

Para facilitar os testes dos endpoints, uma coleção do Postman está incluída na raiz do projeto:

* **Arquivo:** `GreenPark.postman_collection.json`

**Como usar:**

1.  Abra o Postman.
2.  Clique em "Import".
3.  Selecione o arquivo `GreenPark.postman_collection.json` do seu projeto.
4.  Uma nova coleção chamada "GreenPark" (ou similar) aparecerá no Postman.
5.  A coleção contém exemplos de requisições para os principais endpoints da API. A URL base utilizada geralmente será `http://localhost:PORT` (substitua `PORT` pelo valor definido no seu `.env`, ex: `http://localhost:3333`).

**Endpoints Principais (Exemplos na Coleção):**

* `POST /import/csv`: Faz upload de um arquivo CSV para importar boletos. Requer um arquivo `multipart/form-data` com a chave `file`.
* `POST /import/pdf`: Faz upload de um arquivo PDF multi-página para dividir e salvar boletos individuais. Requer um arquivo `multipart/form-data` com a chave `file`.
* `GET /boletos`: Lista os boletos.
    * Exemplo com filtros: `GET /boletos?nome=SILVA&valor_final=200`
    * Exemplo de relatório: `GET /boletos?relatorio=1` (retorna JSON com `{ "base64": "..." }`)
