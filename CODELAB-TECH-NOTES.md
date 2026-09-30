# CodeLab — notas técnicas e segurança

## Conteúdo e execução

- A primeira versão é estática e compatível com GitHub Pages; não instala código no dispositivo do aluno.
- JavaScript é interpretado com [JS-Interpreter](https://github.com/aminmarashi/JS-Interpreter), pacote `js-interpreter` 6.0.2, licenciado Apache-2.0. O ambiente do interpretador recebe somente `console.log`/`print`, não o DOM, credenciais Firebase ou APIs de rede. A biblioteca e os avisos de terceiros estão em `assets/vendor/`.
- Python usa [Pyodide](https://pyodide.org/) 314.0.7 em `codelab-python-sandbox.html`, dentro de um iframe com `sandbox="allow-scripts"` e origem opaca. A política CSP permite carregar o runtime apenas do CDN fixado `cdn.jsdelivr.net`; o executor não recebe perfil, estado de conta ou tokens. O host valida a origem por `event.source`, nonce por execução e renderiza a saída como texto. O host elimina o iframe após a execução/timeout.
- O código Python é interpretado no dispositivo do próprio aluno; não é enviado a uma API de IA nem a um servidor de avaliação. O primeiro carregamento do runtime pode demorar e usar dados móveis.
- A trilha C++ é composta por desafios guiados de leitura e previsão de saída; não há compilador C++ embutido nesta versão. Executar C++ exigiria um compilador WASM bem empacotado ou um serviço remoto isolado e limitado; não encaminhar o código do aluno para APIs públicas sem informá-lo e definir limites/retensão.
- Esta proteção reduz a exposição da conta principal, mas não transforma o browser num serviço de execução remota apropriado para avaliar dados secretos ou código hostil em contexto de servidor. Não acrescentar tokens/API keys ao iframe.

## Autenticação e progresso

- A autenticação de estudante usa o projeto Firebase já usado pelo site (SDK Web 10.7.1), numa app Firebase com nome próprio (`World69CodeLab`), isolada da sessão `[DEFAULT]` usada pelo admin; oferece Google e email/senha. O site nunca recolhe senha do Google; usa o fluxo oficial Firebase Auth.
- Login Google requer o provider Google ativo e o domínio `agostinhomucunda.github.io` autorizado no Firebase Authentication. Email/senha também precisa de estar ativo. A interface deve dar uma mensagem clara caso algum provider ainda não esteja configurado.
- Verificação pública em 30-09-2026: `agostinhomucunda.github.io` não aparece nos `authorizedDomains` do projeto; a consulta de configuração não expôs flags confiáveis de Google/email. Portanto, não declarar o login do site público como pronto: adicionar o domínio no Firebase Console e confirmar/ativar os providers antes do anúncio do login.
- Dados locais de perfil, diagnósticos e missões ficam no IndexedDB do navegador, com fallback local; progresso de convidado e de cada UID tem chaves distintas.
- Não foram encontradas regras Firestore versionadas. Portanto, não ativar sincronização Firestore nem publicar uma regra genérica que possa sobrescrever as permissões do catálogo/admin. Sincronização multi-dispositivo só deve ser ativada após definir regras owner-only para um namespace exclusivo do CodeLab e testar a autorização.

## Fontes

- [Pyodide — Using Pyodide in a web worker](https://pyodide.org/en/stable/usage/webworker.html): exemplo oficial de inicialização com `loadPyodide`, mensagens e execução assíncrona. Esta implementação prefere um iframe de origem opaca para separar o contexto do estudante do site autenticado.
- [Firebase — Authenticate Using Google with JavaScript](https://firebase.google.com/docs/auth/web/google-signin): provider Google, popup/redirect e gestão do fluxo de autenticação.
- [Firebase — Firestore security rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions): controlo por `request.auth.uid`; referência para sincronização futura com isolamento por utilizador.
