# World 69

Marketplace digital em português para descobrir ferramentas, conteúdos e soluções úteis.

## Estrutura

- `index.html` — catálogo público, pesquisa, filtros, modal e integração Firestore para produtos pagos.
- `free-products.js` — catálogo local de recursos gratuitos com links e imagens oficiais.
- `style.css` — sistema visual responsivo do catálogo.
- `login.html` — autenticação Firebase do administrador.
- `admin.html` / `admin.css` — gestão autenticada de produtos pagos.

## Catálogo

Os recursos gratuitos são apresentados a partir de uma lista curada e mantida localmente, com link para a página oficial de download/uso, fonte e licença. O Firestore é usado apenas para os produtos pagos adicionados no painel.

## Desenvolvimento local

```bash
python3 -m http.server 4173
```

O Firebase continua a ser configurado diretamente nos módulos HTML existentes. Nunca colocar credenciais privadas no repositório.
