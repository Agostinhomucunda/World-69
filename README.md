# World 69

Montra digital em português para descobrir ferramentas, software e recursos úteis — com curadoria pública e uma seleção premium gerida no painel.

## Estrutura

- `index.html` — catálogo público, pesquisa, filtros, cursos, modal e integração Firestore para produtos pagos.
- `free-products.js` — 18 recursos gratuitos já curados; mantidos e preservados.
- `catalog.generated.json` — recursos adicionais descobertos automaticamente.
- `free-products.generated.js` — módulo JavaScript gerado a partir do JSON para carregar os recursos no site.
- `catalog-progress.json` — cursores da recolha para continuar de onde o lote anterior parou e evitar repetições.
- `scripts/update_catalog.py` — coletor determinístico da API pública do GitHub.
- `.github/workflows/catalog-collector.yml` — execução agendada do coletor.
- `style.css` — sistema visual responsivo.
- `login.html`, `admin.html`, `admin.css` — autenticação e gestão de produtos premium.
- `codelab.html`, `codelab.css`, `codelab.js` — sala interativa de aprendizagem, perfil, diagnóstico e trilhas.
- `codelab-curriculum.js` — conteúdos de lógica, JavaScript, Python e C++ guiado.
- `codelab-runner.js` — executor de JavaScript limitado ao interpretador educativo.
- `codelab-python-sandbox.html` — executor Python Pyodide em iframe isolado com CSP.

## Como o catálogo automático funciona

A rotina consulta a API pública de pesquisa do GitHub por tópicos de desenvolvimento, design, produtividade, segurança, educação, IA, vídeo, áudio e outros. Só aceita repositórios públicos, ativos, não-forks, com descrição, pelo menos 20 estrelas e licença SPDX reconhecida. Cada cartão aponta para o site oficial (quando informado), inclui a origem do projeto e identifica a licença. Os produtos existentes são preservados; identificadores estáveis, cursores por tópico e filtragem de duplicados tornam os lotes idempotentes.

- O primeiro lote acrescenta mais de 100 recursos quando as fontes públicas têm resultados suficientes.
- A rotina agendada acrescenta até 40 recursos por execução horária e para ao atingir o limite de 1.000 recursos no total (incluindo a lista curada original).
- A agenda do GitHub Actions é de melhor esforço: o GitHub pode atrasar execuções em períodos de alta carga. O prazo de cerca de um dia para alcançar o limite depende da disponibilidade e da diversidade de itens nas fontes; não é uma garantia de horário.
- O módulo do catálogo usa uma versão de cache por minuto para que os lotes publicados não fiquem presos a uma cópia antiga do navegador.
- O processo não usa scraping de páginas privadas, não exige chave de terceiros e não publica links sem origem. Só os dados do catálogo e o cursor são gravados pelo workflow.
- Para iniciar um lote manual no GitHub, use **Actions → Atualizar catálogo World 69 → Run workflow**.

Para executar localmente, com `gh` autenticado ou `GITHUB_TOKEN` definido:

```bash
python3 scripts/update_catalog.py --batch-size 120 --target 1000 --per-source 10
```

## Desenvolvimento local

```bash
python3 -m http.server 4173
```

Abra `http://localhost:4173`. A autenticação Firebase permanece apenas na área administrativa. Nunca coloque credenciais privadas no repositório; qualquer chave de navegador deve ser protegida por regras adequadas no Firebase.

### CodeLab

Abre `codelab.html`. A experiência inclui diagnóstico de nível sem nota, avatar, quatro trilhas, missões curtas, dicas e progresso local no navegador. JavaScript é interpretado num Web Worker com acesso apenas a `console.log`/`print`, sem o DOM nem APIs de rede. Python corre localmente com Pyodide num iframe de origem isolada; o primeiro carregamento precisa de Internet. A trilha C++ começa com desafios guiados de leitura e lógica; ainda não envia código dos alunos a um compilador remoto.

A área do aluno é totalmente local e não usa Firebase Authentication. O perfil, progresso, rascunhos e missões concluídas são guardados no IndexedDB do navegador, com fallback para localStorage. Não há login nem sincronização entre dispositivos; a área administrativa continua com o seu fluxo de autenticação separado. Não foram encontradas regras Firestore próprias para estudantes, por isso o CodeLab não escreve na base de dados nem modifica o sistema de produtos/admin. Para sincronizar ou oferecer um tutor de IA/compilador C++ remoto, primeiro definir regras por UID, limites/custos e isolamento do executor; as notas estão em `CODELAB-TECH-NOTES.md`.



## Firebase atual

A aplicação usa agora o projeto Firebase `world-69` através de `firebase-config.js`. A configuração Web (`apiKey`, `authDomain`, `projectId`, `appId`) não é uma chave privada; a segurança depende dos providers ativos e das regras do Firestore.

- `conta.html` é a conta do aluno: login anónimo, Google, criação/login por email e senha, redefinição de senha e logout.
- `login.html` e `admin.html` continuam reservados à administração e usam email/senha no mesmo projeto Firebase.
- Para o login Google funcionar em produção, adicionar `agostinhomucunda.github.io` em **Authentication → Settings → Authorized domains**.
- Em **Authentication → Sign-in method**, ativar **Anonymous**, **Google** e **Email/Password**.
- Criar o utilizador administrador em **Authentication → Users → Add user**. O Gmail proprietário do projeto é a conta de gestão do Console; não é automaticamente um utilizador com senha para entrar no site.
- O snippet `firebase-admin` com `serviceAccountKey.json` é código de backend/servidor e não deve ser colocado no GitHub Pages nem no browser. O painel atual usa o SDK Web apenas para autenticação e Firestore.
- Antes de publicar produtos no novo projeto, confirmar as regras do Firestore para permitir apenas utilizadores admin; uma verificação de email no cliente, sozinha, não é segurança suficiente.

O próximo passo recomendado é criar regras owner-only e, depois, transferir/sincronizar o progresso do CodeLab por `request.auth.uid`, sem misturar a coleção `products` com os dados privados dos alunos.
