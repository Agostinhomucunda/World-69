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

export const placementQuestions = [
  { id: 'q1', question: 'O que guarda uma variável?', options: ['Uma fotografia sempre', 'Um valor com um nome', 'Uma ligação à Internet'], answer: 1 },
  { id: 'q2', question: 'Para que serve uma condição?', options: ['Apagar todos os ficheiros', 'Mudar a cor do teclado', 'Decidir entre caminhos'], answer: 2 },
  { id: 'q3', question: 'O que faz um ciclo?', options: ['Repete instruções', 'Cria uma conta de email', 'Desliga sempre o programa'], answer: 0 },
  { id: 'q4', question: 'Se queres mostrar a mesma mensagem 5 vezes, qual ideia ajuda?', options: ['Fechar a aplicação', 'Escrever a mensagem uma vez dentro de uma repetição', 'Apagar a mensagem'], answer: 1 }
];
