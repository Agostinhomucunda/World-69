const languageLabels = {
  logic: 'Lógica',
  javascript: 'JavaScript',
  python: 'Python',
  cpp: 'C++'
};

function sourceFor(language, blocks) {
  return blocks[language];
}

function buildExercise(trackId, tier, mode, sequence, values) {
  const { a, b, c, n, values: numbers, threshold } = values;
  const executable = trackId === 'javascript' || trackId === 'python';
  const language = languageLabels[trackId] ? trackId : 'logic';
  const finish = (config) => ({
    ...config,
    kind: language === 'python' ? 'python' : 'code',
    language,
    verifySource: !executable
  });

  if (tier === 0 && mode === 0) {
    const expected = String(a + b);
    return finish({
      title: 'Soma com variáveis',
      objective: 'Guardar valores e calcular um total.',
      lesson: 'Uma variável dá nome a um valor. Podes reutilizá-la numa expressão e mostrar o resultado.',
      story: 'O placar tem pontos guardados e recebeu um pequeno bónus.',
      prompt: `Altera o programa para mostrar ${expected}.`,
      starter: sourceFor(language, {
        javascript: `var total = ${a};\nconsole.log(total);`,
        python: `total = ${a}\nprint(total)`,
        cpp: `int total = ${a};\ncout << total << endl;`,
        logic: `total = ${a}\nmostrar(total)`
      }),
      solution: sourceFor(language, {
        javascript: `var total = ${a};\nconsole.log(total + ${b});`,
        python: `total = ${a}\nprint(total + ${b})`,
        cpp: `int total = ${a};\ncout << total + ${b} << endl;`,
        logic: `total = ${a} + ${b}\nmostrar(total)`
      }),
      expected,
      hints: [`A primeira variável já guarda ${a}.`, `Mostra a soma de total com ${b}.`]
    });
  }

  if (tier === 0 && mode === 1) {
    const expected = 'meta atingida';
    return finish({
      title: 'Escolhe o caminho',
      objective: 'Usar uma condição para tomar uma decisão.',
      lesson: 'Uma condição compara valores e escolhe um caminho. O sinal >= inclui também o próprio limite.',
      story: `O jogador tem exatamente ${threshold} pontos e quer atingir a meta.`,
      prompt: 'Corrige a condição para o programa mostrar “meta atingida”.',
      starter: sourceFor(language, {
        javascript: `var pontos = ${threshold};\nif (pontos > ${threshold}) {\n  console.log("meta atingida");\n} else {\n  console.log("continua");\n}`,
        python: `pontos = ${threshold}\nif pontos > ${threshold}:\n    print("meta atingida")\nelse:\n    print("continua")`,
        cpp: `int pontos = ${threshold};\nif (pontos > ${threshold}) {\n  cout << "meta atingida";\n} else {\n  cout << "continua";\n}`,
        logic: `pontos = ${threshold}\nse pontos > ${threshold}:\n  mostrar("meta atingida")\nsenao:\n  mostrar("continua")`
      }),
      solution: sourceFor(language, {
        javascript: `var pontos = ${threshold};\nif (pontos >= ${threshold}) {\n  console.log("meta atingida");\n} else {\n  console.log("continua");\n}`,
        python: `pontos = ${threshold}\nif pontos >= ${threshold}:\n    print("meta atingida")\nelse:\n    print("continua")`,
        cpp: `int pontos = ${threshold};\nif (pontos >= ${threshold}) {\n  cout << "meta atingida";\n} else {\n  cout << "continua";\n}`,
        logic: `pontos = ${threshold}\nse pontos >= ${threshold}:\n  mostrar("meta atingida")\nsenao:\n  mostrar("continua")`
      }),
      expected,
      hints: ['O valor é igual ao limite, não maior.', 'Usa um operador que aceite igualdade.']
    });
  }

  if (tier === 0 && mode === 2) {
    const message = `Olá, explorador ${sequence + 1}!`;
    return finish({
      title: 'A mensagem certa',
      objective: 'Apresentar uma mensagem no ecrã.',
      lesson: 'Texto fica entre aspas e a instrução de saída apresenta-o. Troca só a mensagem, mantendo a estrutura.',
      story: 'Uma pequena mensagem de boas-vindas precisa de chegar ao ecrã.',
      prompt: `Faz o programa mostrar exatamente: ${message}`,
      starter: sourceFor(language, {
        javascript: 'console.log("Olá!");',
        python: 'print("Olá!")',
        cpp: 'cout << "Olá!" << endl;',
        logic: 'mostrar("Olá!")'
      }),
      solution: sourceFor(language, {
        javascript: `console.log("${message}");`,
        python: `print("${message}")`,
        cpp: `cout << "${message}" << endl;`,
        logic: `mostrar("${message}")`
      }),
      expected: message,
      hints: ['Procura o texto que já está entre aspas.', 'Substitui “Olá!” pela frase pedida sem remover as aspas.']
    });
  }

  if (tier === 1 && mode === 0) {
    const expected = String(n * (n + 1) / 2);
    return finish({
      title: 'Soma com um ciclo',
      objective: `Somar os números de 1 até ${n}.`,
      lesson: 'Um ciclo repete uma operação. A condição do ciclo precisa incluir o último valor que queremos somar.',
      story: `O contador tem de somar cada número desde 1 até ${n}.`,
      prompt: `Corrige o limite do ciclo para mostrar a soma ${expected}.`,
      starter: sourceFor(language, {
        javascript: `var total = 0;\nfor (var i = 1; i < ${n}; i++) {\n  total += i;\n}\nconsole.log(total);`,
        python: `total = 0\nfor numero in range(1, ${n}):\n    total += numero\nprint(total)`,
        cpp: `int total = 0;\nfor (int i = 1; i < ${n}; i++) {\n  total += i;\n}\ncout << total << endl;`,
        logic: `total = 0\npara i de 1 até antes de ${n}:\n  total = total + i\nmostrar(total)`
      }),
      solution: sourceFor(language, {
        javascript: `var total = 0;\nfor (var i = 1; i <= ${n}; i++) {\n  total += i;\n}\nconsole.log(total);`,
        python: `total = 0\nfor numero in range(1, ${n + 1}):\n    total += numero\nprint(total)`,
        cpp: `int total = 0;\nfor (int i = 1; i <= ${n}; i++) {\n  total += i;\n}\ncout << total << endl;`,
        logic: `total = 0\npara i de 1 até ${n}:\n  total = total + i\nmostrar(total)`
      }),
      expected,
      hints: [`O limite atual pára antes de ${n}.`, 'Inclui o último número na condição do ciclo.']
    });
  }

  if (tier === 1 && mode === 1) {
    const sum = numbers.reduce((total, value) => total + value, 0);
    const list = numbers.join(', ');
    return finish({
      title: 'Percorre a lista',
      objective: 'Visitar todos os valores e calcular a soma.',
      lesson: 'Uma lista guarda vários valores. Um ciclo pode visitar cada posição e acumular o resultado.',
      story: `Uma lista contém os valores ${list}.`,
      prompt: `Completa o ciclo para mostrar a soma ${sum}.`,
      starter: sourceFor(language, {
        javascript: `var valores = [${list}];\nconsole.log(valores[0]);`,
        python: `valores = [${list}]\nprint(valores[0])`,
        cpp: `int valores[] = {${list}};\ncout << valores[0] << endl;`,
        logic: `valores = [${list}]\nmostrar(valores[0])`
      }),
      solution: sourceFor(language, {
        javascript: `var valores = [${list}];\nvar total = 0;\nfor (var i = 0; i < valores.length; i++) {\n  total += valores[i];\n}\nconsole.log(total);`,
        python: `valores = [${list}]\ntotal = 0\nfor valor in valores:\n    total += valor\nprint(total)`,
        cpp: `int valores[] = {${list}};\nint total = 0;\nfor (int i = 0; i < ${numbers.length}; i++) {\n  total += valores[i];\n}\ncout << total << endl;`,
        logic: `valores = [${list}]\ntotal = 0\npara cada valor em valores:\n  total = total + valor\nmostrar(total)`
      }),
      expected: String(sum),
      hints: ['O código só está a mostrar o primeiro valor.', 'Começa total em zero e soma cada elemento da lista.']
    });
  }

  if (tier === 1 && mode === 2) {
    const expected = String(a * 2);
    return finish({
      title: 'Cria uma função útil',
      objective: 'Definir e chamar uma função que transforma um valor.',
      lesson: 'Uma função recebe um valor, aplica uma regra e devolve um resultado. O return define o valor devolvido.',
      story: `A função recebe ${a} e deve devolver o dobro.`,
      prompt: `Corrige a função para mostrar ${expected}.`,
      starter: sourceFor(language, {
        javascript: `function dobrar(valor) {\n  return valor;\n}\nconsole.log(dobrar(${a}));`,
        python: `def dobrar(valor):\n    return valor\n\nprint(dobrar(${a}))`,
        cpp: `int dobrar(int valor) {\n  return valor;\n}\ncout << dobrar(${a}) << endl;`,
        logic: `funcao dobrar(valor):\n  devolver valor\nmostrar(dobrar(${a}))`
      }),
      solution: sourceFor(language, {
        javascript: `function dobrar(valor) {\n  return valor * 2;\n}\nconsole.log(dobrar(${a}));`,
        python: `def dobrar(valor):\n    return valor * 2\n\nprint(dobrar(${a}))`,
        cpp: `int dobrar(int valor) {\n  return valor * 2;\n}\ncout << dobrar(${a}) << endl;`,
        logic: `funcao dobrar(valor):\n  devolver valor * 2\nmostrar(dobrar(${a}))`
      }),
      expected,
      hints: ['A função já recebe o número correto.', 'Multiplica valor por 2 antes de devolver.']
    });
  }

  if (tier === 2 && mode === 0) {
    const sum = numbers.filter((value) => value % 2 === 0).reduce((total, value) => total + value, 0);
    const list = numbers.join(', ');
    return finish({
      title: 'Filtra antes de somar',
      objective: 'Combinar repetição e condição numa lista.',
      lesson: 'Podes percorrer uma lista, testar cada elemento e só acumular os que respeitam a condição.',
      story: `A lista é [${list}]. Soma apenas os valores pares.`,
      prompt: `Corrige o filtro para mostrar ${sum}.`,
      starter: sourceFor(language, {
        javascript: `var valores = [${list}];\nvar total = 0;\nfor (var i = 0; i < valores.length; i++) {\n  if (valores[i] % 2 !== 0) total += valores[i];\n}\nconsole.log(total);`,
        python: `valores = [${list}]\ntotal = 0\nfor valor in valores:\n    if valor % 2 != 0:\n        total += valor\nprint(total)`,
        cpp: `int valores[] = {${list}};\nint total = 0;\nfor (int i = 0; i < ${numbers.length}; i++) {\n  if (valores[i] % 2 != 0) total += valores[i];\n}\ncout << total << endl;`,
        logic: `valores = [${list}]\ntotal = 0\npara cada valor em valores:\n  se valor resto 2 diferente de 0: total = total + valor\nmostrar(total)`
      }),
      solution: sourceFor(language, {
        javascript: `var valores = [${list}];\nvar total = 0;\nfor (var i = 0; i < valores.length; i++) {\n  if (valores[i] % 2 === 0) total += valores[i];\n}\nconsole.log(total);`,
        python: `valores = [${list}]\ntotal = 0\nfor valor in valores:\n    if valor % 2 == 0:\n        total += valor\nprint(total)`,
        cpp: `int valores[] = {${list}};\nint total = 0;\nfor (int i = 0; i < ${numbers.length}; i++) {\n  if (valores[i] % 2 == 0) total += valores[i];\n}\ncout << total << endl;`,
        logic: `valores = [${list}]\ntotal = 0\npara cada valor em valores:\n  se valor resto 2 igual a 0: total = total + valor\nmostrar(total)`
      }),
      expected: String(sum),
      hints: ['Mantém o ciclo; só tens de corrigir a condição.', 'Um número par tem resto 0 quando dividido por 2.']
    });
  }

  if (tier === 2 && mode === 1) {
    const thresholdValue = threshold;
    const numbersWithBoundary = [thresholdValue - 1, thresholdValue, thresholdValue + 2, thresholdValue + 4];
    const list = numbersWithBoundary.join(', ');
    const expected = '3';
    return finish({
      title: 'Conta com um limite',
      objective: 'Contar todos os valores que atingem um limite, incluindo a igualdade.',
      lesson: 'A diferença entre > e >= é importante: >= também conta um valor exatamente igual ao limite.',
      story: `Os valores são [${list}] e o limite é ${thresholdValue}.`,
      prompt: `Corrige a condição para contar os valores iguais ou superiores ao limite. O resultado é ${expected}.`,
      starter: sourceFor(language, {
        javascript: `var valores = [${list}];\nvar total = 0;\nfor (var i = 0; i < valores.length; i++) {\n  if (valores[i] > ${thresholdValue}) total++;\n}\nconsole.log(total);`,
        python: `valores = [${list}]\ntotal = 0\nfor valor in valores:\n    if valor > ${thresholdValue}:\n        total += 1\nprint(total)`,
        cpp: `int valores[] = {${list}};\nint total = 0;\nfor (int i = 0; i < ${numbersWithBoundary.length}; i++) {\n  if (valores[i] > ${thresholdValue}) total++;\n}\ncout << total << endl;`,
        logic: `valores = [${list}]\ntotal = 0\npara cada valor em valores:\n  se valor > ${thresholdValue}: total = total + 1\nmostrar(total)`
      }),
      solution: sourceFor(language, {
        javascript: `var valores = [${list}];\nvar total = 0;\nfor (var i = 0; i < valores.length; i++) {\n  if (valores[i] >= ${thresholdValue}) total++;\n}\nconsole.log(total);`,
        python: `valores = [${list}]\ntotal = 0\nfor valor in valores:\n    if valor >= ${thresholdValue}:\n        total += 1\nprint(total)`,
        cpp: `int valores[] = {${list}};\nint total = 0;\nfor (int i = 0; i < ${numbersWithBoundary.length}; i++) {\n  if (valores[i] >= ${thresholdValue}) total++;\n}\ncout << total << endl;`,
        logic: `valores = [${list}]\ntotal = 0\npara cada valor em valores:\n  se valor >= ${thresholdValue}: total = total + 1\nmostrar(total)`
      }),
      expected,
      hints: ['O segundo valor da lista é igual ao limite.', 'Usa >= para incluir igualdade.']
    });
  }

  const sum = Math.max(...numbers);
  const list = numbers.join(', ');
  return finish({
    title: 'Encontra o maior valor',
    objective: 'Percorrer uma lista e atualizar o maior valor encontrado.',
    lesson: 'Começa por guardar o primeiro elemento. Depois percorre o resto da lista e atualiza o máximo quando encontrares um valor maior.',
    story: `A lista tem os valores [${list}].`,
    prompt: `Completa a procura e mostra o maior valor: ${sum}.`,
    starter: sourceFor(language, {
      javascript: `var valores = [${list}];\nvar maior = valores[0];\nconsole.log(maior);`,
      python: `valores = [${list}]\nmaior = valores[0]\nprint(maior)`,
      cpp: `int valores[] = {${list}};\nint maior = valores[0];\ncout << maior << endl;`,
      logic: `valores = [${list}]\nmaior = valores[0]\nmostrar(maior)`
    }),
    solution: sourceFor(language, {
      javascript: `var valores = [${list}];\nvar maior = valores[0];\nfor (var i = 1; i < valores.length; i++) {\n  if (valores[i] > maior) maior = valores[i];\n}\nconsole.log(maior);`,
      python: `valores = [${list}]\nmaior = valores[0]\nfor valor in valores[1:]:\n    if valor > maior:\n        maior = valor\nprint(maior)`,
      cpp: `int valores[] = {${list}};\nint maior = valores[0];\nfor (int i = 1; i < ${numbers.length}; i++) {\n  if (valores[i] > maior) maior = valores[i];\n}\ncout << maior << endl;`,
      logic: `valores = [${list}]\nmaior = valores[0]\npara cada valor restante em valores:\n  se valor > maior: maior = valor\nmostrar(maior)`
    }),
    expected: String(sum),
    hints: ['O programa só mostra o primeiro item.', 'Percorre os itens seguintes e atualiza maior quando encontra um valor superior.']
  });
}

export function createEndlessMission(trackId, sequence = 0) {
  const step = Math.max(0, Math.floor(Number(sequence) || 0));
  const tierIndex = Math.floor(step / 12);
  const tier = Math.min(2, tierIndex);
  const mode = Math.floor((step % 12) / 4);
  const a = 3 + ((step * 5 + 2) % 17);
  const b = 2 + ((step * 7 + 1) % 11);
  const c = 4 + ((step * 3 + 5) % 13);
  const n = 4 + ((step * 3 + 2) % 7) + tier;
  const numbers = [a, b, c, a + 2];
  const threshold = 5 + ((step * 7 + 3) % 19);
  const exercise = buildExercise(trackId, tier, mode, step, { a, b, c, n, values: numbers, threshold });
  const level = tier === 0 ? 'Básico' : tier === 1 ? 'Intermédio' : 'Avançado';
  return {
    id: `endless-${trackId}-${step + 1}`,
    ...exercise,
    title: `Desafio ${step + 1} · ${exercise.title}`,
    duration: 5,
    level,
    endless: true,
    success: 'Muito bem! O desafio ficou concluído. A seguir vem uma nova prática desta linguagem.',
    verifySource: exercise.verifySource
  };
}
