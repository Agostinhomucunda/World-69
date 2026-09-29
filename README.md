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

## Como o catálogo automático funciona

A rotina consulta a API pública de pesquisa do GitHub por tópicos de desenvolvimento, design, produtividade, segurança, educação, IA, vídeo, áudio e outros. Só aceita repositórios públicos, ativos, não-forks, com descrição, pelo menos 20 estrelas e licença SPDX reconhecida. Cada cartão aponta para o site oficial (quando informado), inclui a origem do projeto e identifica a licença. Os produtos existentes são preservados; identificadores estáveis, cursores por tópico e filtragem de duplicados tornam os lotes idempotentes.

- O primeiro lote acrescenta mais de 100 recursos quando as fontes públicas têm resultados suficientes.
- A rotina agendada acrescenta até 40 recursos por execução horária e para ao atingir o limite de 1.000 recursos no total (incluindo a lista curada original).
- A agenda do GitHub Actions é de melhor esforço: o GitHub pode atrasar execuções em períodos de alta carga. O prazo de cerca de um dia para alcançar o limite depende da disponibilidade e da diversidade de itens nas fontes; não é uma garantia de horário.
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

Abra `http://localhost:4173`. O Firebase continua a ser configurado nos módulos HTML existentes. Nunca coloque credenciais privadas no repositório; a chave do navegador Firebase é pública e deve ser protegida por regras adequadas no Firebase.
