export const tracks = [
  {
    id: 'logic', title: 'Lógica de programação', subtitle: 'Pensa como quem resolve problemas', icon: '◇', level: 'Primeiros passos', minutes: 25,
    description: 'Aprende a transformar uma ideia numa sequência que um computador consegue seguir.', color: 'lime',
    lessons: [
      { id: 'logic-sequence', title: 'A receita perfeita', duration: 5, kind: 'choice', objective: 'Ordenar instruções para resolver uma tarefa.', story: 'A Sara vai preparar uma sandes. O computador só sabe seguir passos claros.', lesson: 'Um algoritmo é uma sequência de instruções. A ordem importa: primeiro preparar os materiais, depois executar cada passo e, no fim, confirmar o resultado.', prompt: 'Qual é a ordem mais lógica para fazer uma sandes?', options: ['Comer → abrir o pão → colocar o recheio', 'Abrir o pão → colocar o recheio → fechar e servir', 'Colocar o recheio → ir comprar o pão → fechar'], answer: 'Abrir o pão → colocar o recheio → fechar e servir', success: 'Boa! Organizar os passos evita que o algoritmo tente fazer algo antes de estar pronto.', hints: ['Imagina o que precisas ter preparado antes de poderes colocar o recheio.'] },
      { id: 'logic-condition', title: 'Se acontecer isto…', duration: 6, kind: 'choice', objective: 'Usar uma condição para escolher uma ação.', story: 'A porta da sala abre apenas quando a pessoa tem um convite válido.', lesson: 'Uma condição verifica se algo é verdadeiro ou falso. Se for verdadeiro, executamos uma ação; caso contrário, podemos escolher outra.', prompt: 'A regra é: se há convite válido, entrar; caso contrário, pedir ajuda. A pessoa não tem convite. O que o sistema deve fazer?', options: ['Entrar na mesma', 'Pedir ajuda', 'Desligar o computador'], answer: 'Pedir ajuda', success: 'Certo! A condição “há convite válido?” é falsa, então o programa segue o caminho alternativo.', hints: ['Lê a regra como duas estradas: uma para SIM e outra para NÃO.'] },
      { id: 'logic-loop', title: 'Repetir sem cansar', duration: 7, kind: 'choice', objective: 'Reconhecer quando usar uma repetição.', story: 'Um robô precisa regar cinco plantas da mesma maneira.', lesson: 'Um ciclo repete instruções. Em vez de escrever “regar” cinco vezes, indicamos “repete 5 vezes: regar uma planta”.', prompt: 'Qual instrução representa melhor a tarefa?', options: ['Regar uma planta e parar', 'Repetir 5 vezes: regar uma planta', 'Repetir para sempre: regar a mesma planta'], answer: 'Repetir 5 vezes: regar uma planta', success: 'Perfeito. O ciclo faz o mesmo trabalho com menos instruções e um fim definido.', hints: ['A tarefa tem uma quantidade conhecida de plantas, por isso a repetição também deve ter um limite.'] },
      { id: 'logic-plan', title: 'Desenha a solução', duration: 7, kind: 'choice', objective: 'Combinar sequência, decisão e repetição.', story: 'O teu primeiro mini-projeto: um plano para uma aplicação que recomenda uma pausa.', lesson: 'Problemas maiores ficam mais simples quando os dividimos em pequenas decisões: medir o tempo, verificar uma condição e mostrar uma mensagem.', prompt: 'A aplicação deve sugerir uma pausa depois de 25 minutos. Qual plano faz sentido?', options: ['Repetir a cada minuto: verificar o tempo; se chegou a 25, sugerir pausa', 'Sugerir pausa antes de começar', 'Esperar para sempre sem verificar o tempo'], answer: 'Repetir a cada minuto: verificar o tempo; se chegou a 25, sugerir pausa', success: 'Missão concluída! Já pensas em passos, decisões e ciclos como um programador.', hints: ['A aplicação precisa verificar o relógio regularmente e decidir quando chegou ao limite.'] }
    ]
  },
  {
    id: 'javascript', title: 'JavaScript', subtitle: 'Dá vida às páginas e às ideias', icon: 'JS', level: 'Iniciante', minutes: 32,
    description: 'Escreve pequenas instruções e vê o resultado imediatamente num ambiente de treino controlado.', color: 'blue',
    lessons: [
      { id: 'js-output', title: 'A tua primeira mensagem', duration: 6, kind: 'code', language: 'javascript', objective: 'Mostrar uma mensagem com console.log.', story: 'A missão é ensinar o computador a dizer olá a quem acabou de chegar.', lesson: 'A função `console.log(...)` mostra uma mensagem na área de resultado. O texto precisa de estar entre aspas.', prompt: 'Altera o código para mostrar exatamente: Olá, futuro programador!', starter: 'console.log("Olá, mundo!");', expected: 'Olá, futuro programador!', success: 'A mensagem apareceu. Acabaste de dar a tua primeira instrução ao computador!', hints: ['Procura o texto entre aspas dentro de console.log.', 'Troca apenas o texto; mantém as aspas e os parênteses.'], solution: 'console.log("Olá, futuro programador!");' },
      { id: 'js-variables', title: 'Guarda uma pontuação', duration: 7, kind: 'code', language: 'javascript', objective: 'Guardar e usar valores numa variável.', story: 'O placar de um jogo precisa somar pontos sem os perder pelo caminho.', lesson: 'Uma variável guarda um valor com um nome. Com `var pontos = 8;` guardamos o número 8. Depois podemos usá-lo em contas.', prompt: 'Cria a variável `pontos`, soma 4 e mostra o total. O resultado deve ser 12.', starter: `var pontos = 8;
console.log(pontos);`, expected: '12', success: 'Boa! A variável guardou o valor e o programa calculou o total.', hints: ['Guarda 8 na variável pontos.', 'Mostra `pontos + 4` com console.log.'], solution: `var pontos = 8;
console.log(pontos + 4);` },
      { id: 'js-condition', title: 'Decisão no jogo', duration: 8, kind: 'code', language: 'javascript', objective: 'Tomar uma decisão com if e else.', story: 'O personagem encontrou uma chave. Será que já pode abrir a porta?', lesson: 'Com `if` verificamos uma condição. Se for verdadeira, executa-se o primeiro bloco; `else` define o que fazer no outro caso.', prompt: 'Completa o programa. Como tem chave, deve mostrar “Porta aberta”.', starter: `var temChave = true;
if (temChave) {
  // escreve aqui a mensagem
} else {
  console.log("Procura uma chave");
}`, expected: 'Porta aberta', success: 'Conseguiste! O programa tomou uma decisão com base no valor da variável.', hints: ['A condição já está preparada: temChave é true.', 'Dentro do primeiro bloco, usa console.log com a mensagem pedida.'], solution: `var temChave = true;
if (temChave) {
  console.log("Porta aberta");
} else {
  console.log("Procura uma chave");
}` },
      { id: 'js-loop', title: 'Uma repetição útil', duration: 10, kind: 'code', language: 'javascript', objective: 'Usar um ciclo para mostrar vários valores.', story: 'Um drone vai verificar três pontos de controlo antes de terminar a rota.', lesson: 'Um ciclo `for` repete um bloco. Podemos usar uma variável de contagem e uma condição de paragem para saber quando terminar.', prompt: 'Usa um ciclo para mostrar 1, depois 2 e depois 3 — um número em cada linha.', starter: `for (var i = 1; i <= 3; i++) {
  // mostra o número atual
}`, expected: ['1', '2', '3'].join('\n'), success: 'Rota completa. O ciclo repetiu a instrução três vezes e terminou no momento certo.', hints: ['O ciclo já conta de 1 até 3.', 'Usa console.log(i) dentro das chavetas.'], solution: `for (var i = 1; i <= 3; i++) {
  console.log(i);
}` }
    ]
  },
  {
    id: 'python', title: 'Python', subtitle: 'Automatiza tarefas com código claro', icon: 'Py', level: 'Iniciante', minutes: 28,
    description: 'Aprende uma linguagem muito usada em automação, dados, ciência e inteligência artificial.', color: 'gold',
    lessons: [
      { id: 'py-output', title: 'Fala com o computador', duration: 6, kind: 'python', language: 'python', objective: 'Usar print para apresentar uma mensagem.', story: 'Vamos criar um pequeno programa de boas-vindas para uma nova turma.', lesson: 'Em Python, `print("Olá!")` mostra texto no ecrã. O texto fica entre aspas e dentro dos parênteses.', prompt: 'Faz o programa mostrar exatamente: Olá, mundo!', starter: 'print("Olá, Python!")', expected: 'Olá, mundo!', success: 'O Python apresentou a mensagem. Primeiro programa concluído!', hints: ['A função chama-se print.', 'Troca apenas o conteúdo entre aspas.'], solution: 'print("Olá, mundo!")' },
      { id: 'py-variables', title: 'Variáveis no dia a dia', duration: 7, kind: 'python', language: 'python', objective: 'Guardar um valor e reutilizá-lo.', story: 'Uma aplicação de estudo soma minutos de prática em cada sessão.', lesson: 'Em Python, `minutos = 10` guarda um valor. Depois podes usar esse nome numa conta ou mensagem.', prompt: 'Guarda 10 em `minutos`, soma 5 e mostra o total: 15.', starter: `minutos = 10
print(minutos)`, expected: '15', success: 'Certo! A variável guardou os minutos e o programa calculou a soma.', hints: ['Mantém o valor 10 em minutos.', 'Mostra minutos + 5 com print.'], solution: `minutos = 10
print(minutos + 5)` },
      { id: 'py-condition', title: 'Uma escolha inteligente', duration: 8, kind: 'python', language: 'python', objective: 'Criar uma condição if/else.', story: 'Uma aplicação escolhe uma mensagem de acordo com o nível de energia.', lesson: 'A instrução `if` verifica uma condição. Em Python, os dois pontos `:` e a indentação mostram o que pertence a cada bloco.', prompt: 'Como energia é “alta”, mostra “Vamos avançar!”.', starter: `energia = "alta"
if energia == "alta":
    # escreve a mensagem aqui
else:
    print("Faz uma pausa")`, expected: 'Vamos avançar!', success: 'Excelente! A condição escolheu a mensagem certa.', hints: ['A comparação usa dois sinais de igual: ==.', 'Escreve print dentro do bloco if e respeita a indentação.'], solution: `energia = "alta"
if energia == "alta":
    print("Vamos avançar!")
else:
    print("Faz uma pausa")` },
      { id: 'py-loop', title: 'Repetir uma tarefa', duration: 7, kind: 'python', language: 'python', objective: 'Usar um ciclo for com range.', story: 'Um robô vai contar três passos na direção do objetivo.', lesson: '`for numero in range(1, 4):` repete o bloco para 1, 2 e 3. O limite final de range não é incluído.', prompt: 'Completa o ciclo para mostrar 1, 2 e 3, cada um numa linha.', starter: `for numero in range(1, 4):
    # mostra o número`, expected: ['1', '2', '3'].join('\n'), success: 'Missão completa! Usaste um ciclo para repetir sem copiar a mesma linha.', hints: ['O range já fornece os números 1, 2 e 3.', 'Usa print(numero) no bloco do ciclo.'], solution: `for numero in range(1, 4):
    print(numero)` }
    ]
  },
  {
    id: 'cpp', title: 'C++', subtitle: 'Lê código por dentro', icon: 'C++', level: 'Fundamentos', minutes: 24,
    description: 'Treina variáveis, condições e ciclos com exemplos C++ curtos. Estes primeiros desafios são guiados por escolha; um compilador online seguro fica para uma fase com sandbox remoto.', color: 'gold',
    lessons: [
      { id: 'cpp-output', title: 'O computador responde', duration: 5, kind: 'choice', language: 'cpp', objective: 'Reconhecer como C++ apresenta texto.', story: 'Um pequeno programa de boas-vindas precisa mostrar uma mensagem no ecrã.', lesson: 'Em C++, `cout << "Olá!" << endl;` envia texto para a saída. A biblioteca `iostream` fornece cout e endl.', prompt: 'Que linha mostra “Olá, mundo!” em C++?', options: ['cout << "Olá, mundo!" << endl;', 'print("Olá, mundo!")', 'console.log("Olá, mundo!")'], answer: 'cout << "Olá, mundo!" << endl;', success: 'Isso mesmo! C++ usa cout e o operador << para enviar texto para a saída.', hints: ['Em C++, a saída chama-se cout.', 'Procura a opção com `cout <<` e a mensagem entre aspas.'] },
      { id: 'cpp-variables', title: 'Uma pontuação guardada', duration: 6, kind: 'choice', language: 'cpp', objective: 'Ler uma variável e calcular um resultado.', story: 'Um jogo guarda os pontos do jogador e adiciona um bónus.', lesson: 'A instrução `int pontos = 8;` guarda um número inteiro. A expressão `pontos + 4` vale 12.', prompt: 'Com `int pontos = 8;`, o que mostra `cout << pontos + 4;`?', options: ['4', '12', '84'], answer: '12', success: 'Correto! A variável contém 8 e a soma adiciona 4.', hints: ['A variável guarda o valor numérico 8.', 'Faz a conta 8 + 4 antes de escolher.'] },
      { id: 'cpp-condition', title: 'Escolhe um caminho', duration: 6, kind: 'choice', language: 'cpp', objective: 'Seguir o ramo correto de um if/else.', story: 'Uma porta abre para quem tem pelo menos 10 moedas.', lesson: 'Em C++, `if (condição) { ... } else { ... }` escolhe um dos blocos. O operador `>=` significa “maior ou igual”.', prompt: 'Se `int moedas = 8;`, qual mensagem sai deste programa? `if (moedas >= 10) cout << "Nível desbloqueado"; else cout << "Falta pouco";`', options: ['Nível desbloqueado', 'Falta pouco', 'Ambas ao mesmo tempo'], answer: 'Falta pouco', success: 'Boa leitura! 8 não é maior nem igual a 10, por isso o programa segue o else.', hints: ['Compara 8 com 10 usando `>=`.', 'A condição é falsa, então lê a mensagem no bloco else.'] },
      { id: 'cpp-loop', title: 'Conta os passos', duration: 7, kind: 'choice', language: 'cpp', objective: 'Prever os valores produzidos por um ciclo for.', story: 'Um robô anuncia os três passos que vai dar.', lesson: 'Um ciclo `for` tem início, condição e atualização. Com `passo++`, o valor aumenta de um em um.', prompt: 'Que números aparecem? `for (int passo = 1; passo <= 3; passo++) cout << passo << " ";`', options: ['0 1 2', '1 2 3', '1 2 3 4'], answer: '1 2 3', success: 'Perfeito! Começa em 1, repete enquanto passo <= 3 e termina depois do 3.', hints: ['O ciclo começa com passo = 1.', 'A condição inclui o 3, mas exclui o 4.'] }
    ]
  }
];


// Advanced path: extra missions keep each track growing beyond the first steps.
const advancedLessons = {
  "logic": [
    {
      "id": "logic-input-output",
      "title": "Entrada, processo e saída",
      "duration": 8,
      "kind": "choice",
      "language": null,
      "objective": "Identificar as três partes de um problema",
      "story": "Uma aplicação recebe dados, transforma-os e apresenta um resultado.",
      "lesson": "Um programa precisa de uma entrada antes de conseguir transformar e devolver uma saída.",
      "prompt": "Qual é a ordem mais clara?",
      "options": [
        "Mostrar o resultado → receber dados → transformar",
        "Receber dados → transformar → mostrar resultado",
        "Transformar sem receber dados"
      ],
      "answer": "Receber dados → transformar → mostrar resultado",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "logic-pseudocode",
      "title": "Escreve antes do código",
      "duration": 8,
      "kind": "choice",
      "language": null,
      "objective": "Traduzir uma ideia para pseudocódigo",
      "story": "Antes da sintaxe, descreve a solução com palavras simples.",
      "lesson": "O pseudocódigo deixa a ordem e os dados visíveis antes da linguagem.",
      "prompt": "Qual pseudocódigo calcula o total com desconto?",
      "options": [
        "receber preço; calcular desconto; mostrar total",
        "mostrar total; depois perguntar o preço",
        "repetir sem nunca calcular"
      ],
      "answer": "receber preço; calcular desconto; mostrar total",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "logic-boolean",
      "title": "Verdadeiro ou falso",
      "duration": 8,
      "kind": "choice",
      "language": null,
      "objective": "Usar valores booleanos",
      "story": "Uma regra de acesso depende de duas respostas.",
      "lesson": "Com E/AND, todas as condições precisam ser verdadeiras.",
      "prompt": "Se tem bilhete é verdadeiro e é maior de idade é falso, pode entrar?",
      "options": [
        "Sim, porque uma regra chega",
        "Não, porque as duas condições são necessárias",
        "Sempre, sem verificar"
      ],
      "answer": "Não, porque as duas condições são necessárias",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "logic-data",
      "title": "Escolhe a estrutura",
      "duration": 8,
      "kind": "choice",
      "language": null,
      "objective": "Distinguir lista, fila e mapa",
      "story": "Uma biblioteca precisa relacionar o ISBN ao título de cada livro.",
      "lesson": "Uma associação chave-valor torna a procura pelo ISBN direta.",
      "prompt": "Qual estrutura representa melhor ISBN → título?",
      "options": [
        "Mapa/dicionário",
        "Lista sem posições",
        "Ciclo infinito"
      ],
      "answer": "Mapa/dicionário",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "logic-debug",
      "title": "O erro é uma pista",
      "duration": 8,
      "kind": "choice",
      "language": null,
      "objective": "Seguir uma estratégia de depuração",
      "story": "Um contador mostra 11 quando deveria mostrar 10.",
      "lesson": "Depurar é transformar um erro grande numa pergunta pequena e verificável.",
      "prompt": "Qual é o primeiro passo útil?",
      "options": [
        "Mudar tudo ao mesmo tempo",
        "Reproduzir, observar a entrada e isolar o passo errado",
        "Ignorar o resultado"
      ],
      "answer": "Reproduzir, observar a entrada e isolar o passo errado",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "logic-complexity",
      "title": "Pensar no custo",
      "duration": 8,
      "kind": "choice",
      "language": null,
      "objective": "Comparar soluções por eficiência",
      "story": "Duas soluções procuram um nome numa lista: uma verifica item a item; outra usa um índice.",
      "lesson": "A escolha da estrutura de dados muda o trabalho necessário para cada procura.",
      "prompt": "Qual tende a ser mais rápida para muitas procuras?",
      "options": [
        "A lista sem índice sempre",
        "A estrutura com índice",
        "As duas são sempre iguais"
      ],
      "answer": "A estrutura com índice",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "logic-recursion",
      "title": "Uma ideia dentro dela",
      "duration": 8,
      "kind": "choice",
      "language": null,
      "objective": "Reconhecer recursão",
      "story": "Uma pasta pode conter ficheiros e outras pastas.",
      "lesson": "Recursão resolve uma versão menor do mesmo problema e precisa de uma condição de paragem.",
      "prompt": "Que estratégia visita todos os níveis?",
      "options": [
        "Visitar a pasta e repetir a mesma regra nas subpastas",
        "Parar sempre na primeira pasta",
        "Apagar as subpastas"
      ],
      "answer": "Visitar a pasta e repetir a mesma regra nas subpastas",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "logic-project",
      "title": "Planeia um mini-projeto",
      "duration": 8,
      "kind": "choice",
      "language": null,
      "objective": "Combinar requisitos, dados e testes",
      "story": "Vais criar uma lista de tarefas que permite adicionar, concluir e filtrar itens.",
      "lesson": "Um projeto sólido nasce de requisitos claros e de pequenas verificações contínuas.",
      "prompt": "Qual plano é mais completo?",
      "options": [
        "Definir dados, ações, estados e testes pequenos",
        "Começar pelo visual e ignorar regras",
        "Guardar tudo numa variável sem formato"
      ],
      "answer": "Definir dados, ações, estados e testes pequenos",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    }
  ],
  "javascript": [
    {
      "id": "js-types",
      "title": "Tipos e conversões",
      "duration": 8,
      "kind": "choice",
      "language": "javascript",
      "objective": "Distinguir texto, número e booleano",
      "story": "Uma idade chega como texto de um formulário e precisa entrar numa conta.",
      "lesson": "Dados vindos de formulários são frequentemente texto; Number() permite tratá-los como número.",
      "prompt": "Que operação prepara esse valor?",
      "options": [
        "Somar texto diretamente",
        "Converter o texto para número",
        "Apagar o valor"
      ],
      "answer": "Converter o texto para número",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "js-arrays",
      "title": "Coleções úteis",
      "duration": 8,
      "kind": "choice",
      "language": "javascript",
      "objective": "Ler e alterar arrays",
      "story": "Uma lista de compras precisa de receber e remover itens.",
      "lesson": "push adiciona ao final; pop remove o último item.",
      "prompt": "Qual método acrescenta um item ao fim?",
      "options": [
        "push()",
        "pop()",
        "slice()"
      ],
      "answer": "push()",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "js-objects",
      "title": "Descrever entidades",
      "duration": 8,
      "kind": "choice",
      "language": "javascript",
      "objective": "Usar objetos e propriedades",
      "story": "Um perfil tem nome, nível e pontos.",
      "lesson": "Objetos agrupam propriedades nomeadas e tornam os dados legíveis.",
      "prompt": "Qual representação é mais adequada?",
      "options": [
        "{ nome: \"Kito\", nivel: 2 }",
        "[nome, nivel] sem contexto",
        "\"perfil\" apenas"
      ],
      "answer": "{ nome: \"Kito\", nivel: 2 }",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "js-functions",
      "title": "Criar funções reutilizáveis",
      "duration": 8,
      "kind": "choice",
      "language": "javascript",
      "objective": "Definir parâmetros e retorno",
      "story": "A mesma regra de desconto é usada em vários produtos.",
      "lesson": "Uma função recebe dados, executa uma tarefa e pode devolver um resultado.",
      "prompt": "O que evita duplicar a regra?",
      "options": [
        "Uma função com preço como parâmetro",
        "Copiar a regra em cada botão",
        "Um comentário sem código"
      ],
      "answer": "Uma função com preço como parâmetro",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "js-dom",
      "title": "Ligar código à página",
      "duration": 8,
      "kind": "choice",
      "language": "javascript",
      "objective": "Selecionar e atualizar elementos DOM",
      "story": "Um botão deve alterar o texto de uma mensagem.",
      "lesson": "Selecionamos o elemento e atualizamos o seu conteúdo sem reconstruir toda a página.",
      "prompt": "Qual combinação faz sentido?",
      "options": [
        "querySelector e textContent",
        "console.log e Math.random",
        "localStorage e alert apenas"
      ],
      "answer": "querySelector e textContent",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "js-events",
      "title": "Responder a ações",
      "duration": 8,
      "kind": "choice",
      "language": "javascript",
      "objective": "Trabalhar com eventos",
      "story": "O formulário deve validar os dados antes de recarregar a página.",
      "lesson": "O evento submit permite validar e preventDefault impede o envio automático.",
      "prompt": "Que evento e ação são adequados?",
      "options": [
        "submit e preventDefault",
        "load e apagar formulário",
        "scroll e recarregar sempre"
      ],
      "answer": "submit e preventDefault",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "js-async",
      "title": "Esperar por dados",
      "duration": 8,
      "kind": "choice",
      "language": "javascript",
      "objective": "Entender Promises e async/await",
      "story": "Uma aplicação consulta uma API antes de desenhar os resultados.",
      "lesson": "await torna a sequência assíncrona mais legível; a função precisa ser async.",
      "prompt": "Por que usar await?",
      "options": [
        "Para esperar o resultado sem bloquear a leitura da função",
        "Para esconder todos os erros",
        "Para transformar CSS em JavaScript"
      ],
      "answer": "Para esperar o resultado sem bloquear a leitura da função",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "js-modules",
      "title": "Dividir o projeto",
      "duration": 8,
      "kind": "choice",
      "language": "javascript",
      "objective": "Usar import e export",
      "story": "O catálogo e a interface devem ser módulos separados.",
      "lesson": "Módulos ajudam a organizar, reutilizar e testar partes do sistema.",
      "prompt": "Qual vantagem existe?",
      "options": [
        "Responsabilidades menores e dependências explícitas",
        "Todos os ficheiros ficam globais",
        "O navegador deixa de executar código"
      ],
      "answer": "Responsabilidades menores e dependências explícitas",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    }
  ],
  "python": [
    {
      "id": "py-types",
      "title": "Tipos que contam",
      "duration": 8,
      "kind": "choice",
      "language": "python",
      "objective": "Distinguir strings, números e booleanos",
      "story": "Um relatório soma minutos e apresenta uma frase.",
      "lesson": "Aspas criam texto; sem aspas, 30 é um inteiro que pode entrar numa soma.",
      "prompt": "Qual valor é numérico?",
      "options": [
        "\"30\"",
        "30",
        "\"minutos\""
      ],
      "answer": "30",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "py-lists",
      "title": "Trabalhar com listas",
      "duration": 8,
      "kind": "choice",
      "language": "python",
      "objective": "Indexar e modificar listas",
      "story": "Uma fila de tarefas precisa de ser percorrida e atualizada.",
      "lesson": "Listas começam no índice zero; append adiciona elementos ao final.",
      "prompt": "Como obter o primeiro item?",
      "options": [
        "tarefas[0]",
        "tarefas[-0]()",
        "first(tarefas)"
      ],
      "answer": "tarefas[0]",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "py-dicts",
      "title": "Guardar por chave",
      "duration": 8,
      "kind": "choice",
      "language": "python",
      "objective": "Usar dicionários",
      "story": "Cada aluno tem um nome e uma nota associados.",
      "lesson": "Dicionários representam relações chave-valor e permitem procurar pela chave.",
      "prompt": "Que estrutura combina com essa relação?",
      "options": [
        "{\"Ana\": 18}",
        "[\"Ana\", 18] sem chave",
        "(\"Ana\" + 18)"
      ],
      "answer": "{\"Ana\": 18}",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "py-functions",
      "title": "Encapsular uma regra",
      "duration": 8,
      "kind": "choice",
      "language": "python",
      "objective": "Criar funções com parâmetros",
      "story": "A mesma conversão de minutos aparece em vários relatórios.",
      "lesson": "Funções dão nome a uma operação e podem devolver o seu resultado com return.",
      "prompt": "Como evitar repetição?",
      "options": [
        "definir uma função que recebe minutos",
        "copiar a conta em todo o programa",
        "guardar a conta num comentário"
      ],
      "answer": "definir uma função que recebe minutos",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "py-files",
      "title": "Ler informação local",
      "duration": 8,
      "kind": "choice",
      "language": "python",
      "objective": "Entender abertura segura de ficheiros",
      "story": "Um programa precisa ler notas guardadas num ficheiro.",
      "lesson": "O bloco with gere o ciclo de vida do ficheiro mesmo quando ocorre um erro.",
      "prompt": "Qual prática fecha o ficheiro automaticamente?",
      "options": [
        "with open(...) as arquivo:",
        "open(...) e nunca fechar",
        "print(...)"
      ],
      "answer": "with open(...) as arquivo:",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "py-errors",
      "title": "Tratar falhas",
      "duration": 8,
      "kind": "choice",
      "language": "python",
      "objective": "Usar try e except",
      "story": "Uma entrada pode não ser um número válido.",
      "lesson": "Tratamento específico mostra uma mensagem útil sem esconder erros diferentes.",
      "prompt": "Como evitar que o programa termine sem explicação?",
      "options": [
        "try a conversão e except ValueError",
        "ignorar sempre a entrada",
        "usar um ciclo infinito"
      ],
      "answer": "try a conversão e except ValueError",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "py-comprehensions",
      "title": "Transformar coleções",
      "duration": 8,
      "kind": "choice",
      "language": "python",
      "objective": "Ler list comprehensions",
      "story": "Queres os quadrados dos números pares de 0 a 5.",
      "lesson": "A expressão combina ciclo e filtro numa nova lista de forma concisa.",
      "prompt": "Que ideia representa isso?",
      "options": [
        "[n*n for n in range(6) if n % 2 == 0]",
        "[n for n in 6]",
        "square = 0"
      ],
      "answer": "[n*n for n in range(6) if n % 2 == 0]",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "py-classes",
      "title": "Modelar objetos",
      "duration": 8,
      "kind": "choice",
      "language": "python",
      "objective": "Reconhecer classes e métodos",
      "story": "Um jogo tem vários jogadores com nome e pontos.",
      "lesson": "Classes juntam dados e comportamentos de objetos semelhantes.",
      "prompt": "Qual ideia organiza esse estado?",
      "options": [
        "Uma classe Jogador com atributos e métodos",
        "Uma string gigante para todos",
        "Variáveis globais sem relação"
      ],
      "answer": "Uma classe Jogador com atributos e métodos",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    }
  ],
  "cpp": [
    {
      "id": "cpp-types",
      "title": "Tipos com intenção",
      "duration": 8,
      "kind": "choice",
      "language": "cpp",
      "objective": "Escolher tipos numéricos",
      "story": "Uma aplicação guarda a idade e a média de um aluno.",
      "lesson": "O tipo comunica que valores e operações são esperados.",
      "prompt": "Que combinação faz sentido?",
      "options": [
        "int para idade e double para média",
        "string para tudo",
        "bool para a média"
      ],
      "answer": "int para idade e double para média",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "cpp-arrays",
      "title": "Vários valores",
      "duration": 8,
      "kind": "choice",
      "language": "cpp",
      "objective": "Percorrer um array",
      "story": "Um sensor entrega cinco leituras.",
      "lesson": "Um ciclo usa o índice para visitar cada elemento dentro dos limites.",
      "prompt": "Que ferramenta percorre todas as posições?",
      "options": [
        "for com índice",
        "if sem repetição",
        "cout apenas uma vez"
      ],
      "answer": "for com índice",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "cpp-strings",
      "title": "Trabalhar com texto",
      "duration": 8,
      "kind": "choice",
      "language": "cpp",
      "objective": "Usar std::string",
      "story": "O programa junta nome e mensagem de boas-vindas.",
      "lesson": "std::string oferece operações próprias para guardar e combinar texto.",
      "prompt": "Qual tipo representa texto moderno em C++?",
      "options": [
        "std::string",
        "int",
        "bool"
      ],
      "answer": "std::string",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "cpp-functions",
      "title": "Separar responsabilidades",
      "duration": 8,
      "kind": "choice",
      "language": "cpp",
      "objective": "Definir funções em C++",
      "story": "A conta do dano de um jogo aparece em vários locais.",
      "lesson": "Funções reduzem duplicação e tornam a intenção do programa explícita.",
      "prompt": "Qual solução é mais reutilizável?",
      "options": [
        "uma função calcularDano com parâmetros",
        "copiar a expressão em cada lugar",
        "um comentário com a fórmula"
      ],
      "answer": "uma função calcularDano com parâmetros",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "cpp-references",
      "title": "Evitar cópias",
      "duration": 8,
      "kind": "choice",
      "language": "cpp",
      "objective": "Entender referências",
      "story": "Uma função precisa alterar o contador original.",
      "lesson": "A referência liga o parâmetro ao objeto original; const impede alterações.",
      "prompt": "Que parâmetro permite alterar o original?",
      "options": [
        "int& contador",
        "int contador sempre",
        "const int sem retorno"
      ],
      "answer": "int& contador",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "cpp-structs",
      "title": "Agrupar dados",
      "duration": 8,
      "kind": "choice",
      "language": "cpp",
      "objective": "Usar struct",
      "story": "Um ponto tem coordenadas x e y.",
      "lesson": "struct cria um tipo com campos relacionados e legíveis.",
      "prompt": "Como representar o ponto?",
      "options": [
        "struct Ponto { double x; double y; };",
        "duas strings sem nome",
        "um ciclo for"
      ],
      "answer": "struct Ponto { double x; double y; };",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "cpp-pointers",
      "title": "Conhecer endereços",
      "duration": 8,
      "kind": "choice",
      "language": "cpp",
      "objective": "Distinguir ponteiro e valor",
      "story": "Uma função recebe o endereço de um valor.",
      "lesson": "O ponteiro guarda um endereço; o operador * acede ao valor nesse endereço.",
      "prompt": "O que *ponteiro representa?",
      "options": [
        "o valor apontado",
        "o nome do ficheiro",
        "um ciclo"
      ],
      "answer": "o valor apontado",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    },
    {
      "id": "cpp-design",
      "title": "Construir por partes",
      "duration": 8,
      "kind": "choice",
      "language": "cpp",
      "objective": "Aplicar encapsulamento",
      "story": "Um sistema de conta deve proteger o saldo.",
      "lesson": "Encapsulamento concentra regras e evita alterações inválidas ao estado.",
      "prompt": "Que desenho protege melhor o estado?",
      "options": [
        "classe com saldo privado e métodos controlados",
        "saldo público alterável por todos",
        "uma variável global"
      ],
      "answer": "classe com saldo privado e métodos controlados",
      "success": "Boa leitura! O conceito ficou claro e já podes aplicá-lo numa missão.",
      "hints": [
        "Lê cada opção e procura a que representa exatamente a regra.",
        "Explica a tua escolha em voz alta antes de confirmar."
      ]
    }
  ]
};
for (const track of tracks) track.lessons.push(...(advancedLessons[track.id] || []));

// Expand the guided progression into real, trackable practical missions.
const missionBank = {
  logic: ['Entrada, processo e saída', 'Pseudocódigo', 'Booleanos', 'Tabelas de decisão', 'Validação de dados', 'Contadores', 'Acumuladores', 'Ciclos aninhados', 'Busca linear', 'Ordenação', 'Modularização', 'Contratos de função', 'Casos extremos', 'Testes manuais', 'Depuração por etapas', 'Complexidade', 'Recursão', 'Estruturas de dados', 'Filas', 'Pilhas', 'Mapas', 'Grafos', 'Caminhos', 'Árvores', 'Modelação de domínio', 'Separação de responsabilidades', 'Refatoração', 'Reutilização', 'Documentação', 'Requisitos', 'Plano de implementação', 'Prototipagem', 'Feedback', 'Tratamento de falhas', 'Segurança de entradas', 'Desempenho', 'Manutenção', 'Colaboração', 'Revisão de solução'],
  javascript: ['Valores e tipos', 'Conversões', 'Comparações', 'Operadores lógicos', 'Arrays', 'Métodos de array', 'Objetos', 'Desestruturação', 'Funções', 'Arrow functions', 'Escopo', 'Closures', 'DOM', 'Seletores', 'Eventos', 'Formulários', 'Validação', 'LocalStorage', 'JSON', 'Fetch', 'Promises', 'Async e await', 'Tratamento de erros', 'Módulos', 'Classes', 'Herança', 'Map e Set', 'Iteradores', 'Generators', 'Expressões regulares', 'Debounce', 'Acessibilidade', 'Web APIs', 'Performance', 'Segurança XSS', 'Testes', 'Debugging', 'Arquitetura', 'Projeto final'],
  python: ['Valores e tipos', 'Conversões', 'Operadores', 'Condições compostas', 'Listas', 'Tuplos', 'Dicionários', 'Conjuntos', 'Slices', 'Funções', 'Parâmetros', 'Escopo', 'Compreensões', 'Lambda', 'Iteradores', 'Generators', 'Módulos', 'Pacotes', 'Exceções', 'Ficheiros', 'CSV', 'JSON', 'Datas', 'Expressões regulares', 'Testes', 'Dataclasses', 'Classes', 'Herança', 'Polimorfismo', 'Type hints', 'Decorators', 'Context managers', 'APIs', 'Requests', 'Dados tabulares', 'Performance', 'Debugging', 'Automação', 'Projeto final'],
  cpp: ['Tipos e conversões', 'Operadores', 'Condições compostas', 'Arrays', 'Strings', 'Vectors', 'Iteradores', 'Funções', 'Parâmetros', 'Referências', 'Const correctness', 'Structs', 'Classes', 'Encapsulamento', 'Construtores', 'Destrutores', 'Herança', 'Polimorfismo', 'Templates', 'STL', 'Map e Set', 'Filas', 'Pilhas', 'Algoritmos', 'Lambdas', 'Ponteiros', 'Memória dinâmica', 'Smart pointers', 'Move semantics', 'Exceções', 'Ficheiros', 'Namespaces', 'Cabeçalhos', 'Compilação', 'Debugging', 'Testes', 'Performance', 'Design', 'Projeto final']
};
const missionLanguage = { logic: null, javascript: 'javascript', python: 'python', cpp: 'cpp' };
for (const track of tracks) {
  const existing = new Set(track.lessons.map((lesson) => lesson.id));
  for (const [index, topic] of (missionBank[track.id] || []).entries()) {
    if (track.lessons.length >= 50) break;
    const id = `${track.id}-practice-${index + 1}`;
    if (existing.has(id)) continue;
    const language = missionLanguage[track.id];
    const concept = topic.toLowerCase();
    const executable = track.id === 'javascript' || track.id === 'python';
    const code = track.id === 'python' ? `print("Prática: ${topic}")` : `console.log("Prática: ${topic}");`;
    const expected = `Prática: ${topic}`;
    track.lessons.push({
      id, title: `${topic} · prática`, duration: 8, kind: executable ? (track.id === 'python' ? 'python' : 'code') : 'choice', language,
      objective: `Aplicar ${concept} numa situação concreta.`,
      story: `Nesta missão vais consolidar ${concept} com código e uma decisão objetiva.`,
      lesson: `Lê o exemplo, identifica ${concept} e depois escreve ou escolhe uma solução que respeite o problema.`,
      prompt: executable ? `Escreve um programa que mostre exatamente: ${expected}` : `Qual abordagem demonstra melhor que entendeste ${concept}?`,
      ...(executable ? { starter: code, expected, solution: code } : {
        codeExample: track.id === 'cpp' ? `int resultado = 2 + 3;\ncout << resultado;` : `se (condicao) {\n  executar();\n}`,
        options: [`Aplicar ${concept} com uma regra clara`, 'Ignorar os dados e escolher ao acaso', 'Repetir o mesmo passo sem verificar o resultado'],
        answer: `Aplicar ${concept} com uma regra clara`
      }),
      success: `Boa! A missão de ${concept} foi concluída. Agora podes avançar para a próxima.`,
      hints: [`Lê o objetivo e procura a opção ou o código que usa ${concept} de forma explícita.`, 'Experimenta em passos pequenos antes de confirmar.']
    });
    existing.add(id);
  }
}

// The practical area is code-first: every mission is written and run by the learner.
for (const track of tracks) {
  for (const lesson of track.lessons) {
    if (lesson.kind !== 'choice') continue;
    const language = track.id === 'javascript' ? 'javascript' : track.id === 'python' ? 'python' : track.id;
    const output = `Missão: ${lesson.title}`;
    const starter = lesson.codeExample || (language === 'python'
      ? `print("${output}")`
      : language === 'javascript'
        ? `console.log("${output}");`
        : `// escreve uma solução para: ${lesson.title}\nresultado = true;\nmostrar(resultado);`);
    lesson.kind = language === 'python' ? 'python' : 'code';
    lesson.language = language;
    lesson.prompt = `Escreve um exemplo de código que mostre exatamente: ${output}`;
    lesson.starter = starter;
    lesson.solution = starter;
    lesson.expected = output;
    delete lesson.options;
    delete lesson.answer;
  }
}


export const placementQuestions = [
  { id: 'q1', question: 'O que guarda uma variável?', options: ['Uma fotografia sempre', 'Um valor com um nome', 'Uma ligação à Internet'], answer: 1 },
  { id: 'q2', question: 'Para que serve uma condição?', options: ['Apagar todos os ficheiros', 'Mudar a cor do teclado', 'Decidir entre caminhos'], answer: 2 },
  { id: 'q3', question: 'O que faz um ciclo?', options: ['Repete instruções', 'Cria uma conta de email', 'Desliga sempre o programa'], answer: 0 },
  { id: 'q4', question: 'Se queres mostrar a mesma mensagem 5 vezes, qual ideia ajuda?', options: ['Fechar a aplicação', 'Escrever a mensagem uma vez dentro de uma repetição', 'Apagar a mensagem'], answer: 1 }
];
