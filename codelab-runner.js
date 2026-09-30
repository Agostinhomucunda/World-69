importScripts('./assets/vendor/js-interpreter.min.js');

const MAX_SOURCE_LENGTH = 5000;
const MAX_STEPS = 30000;
const MAX_OUTPUT_LINES = 20;
const MAX_OUTPUT_CHARS = 1200;

self.onmessage = ({ data }) => {
  if (!data || data.type !== 'run') return;
  const { runId, source } = data;
  if (typeof source !== 'string' || source.length > MAX_SOURCE_LENGTH) {
    self.postMessage({ type: 'error', runId, message: 'O código é demasiado longo para este desafio.' });
    return;
  }

  const output = [];
  let outputLength = 0;
  let interpreter;
  try {
    interpreter = new self.Interpreter(source, (runtime, scope) => {
      const consoleObject = runtime.createObject(runtime.OBJECT);
      const write = runtime.createNativeFunction((...values) => {
        if (output.length >= MAX_OUTPUT_LINES || outputLength >= MAX_OUTPUT_CHARS) return undefined;
        const line = values.map(value => String(value)).join(' ');
        const remaining = MAX_OUTPUT_CHARS - outputLength;
        const safeLine = line.slice(0, remaining);
        output.push(safeLine);
        outputLength += safeLine.length;
        return undefined;
      });
      runtime.setProperty(consoleObject, 'log', write);
      runtime.setProperty(scope, 'console', consoleObject);
      runtime.setProperty(scope, 'print', write);
    });
  } catch (error) {
    self.postMessage({ type: 'error', runId, message: 'Não consegui ler o código. Confere parênteses, aspas e chavetas.' });
    return;
  }

  let steps = 0;
  const runBatch = () => {
    try {
      let batch = 0;
      let done = false;
      while (batch < 1500 && steps < MAX_STEPS) {
        if (!interpreter.step()) {
          done = true;
          break;
        }
        batch += 1;
        steps += 1;
      }
      if (done) {
        self.postMessage({ type: 'result', runId, output: output.join('\n').slice(0, MAX_OUTPUT_CHARS), steps });
        return;
      }
      if (steps >= MAX_STEPS) {
        self.postMessage({ type: 'error', runId, message: 'Este código ficou a repetir demasiadas instruções. Revê a condição do ciclo e tenta novamente.' });
        return;
      }
      setTimeout(runBatch, 0);
    } catch (error) {
      self.postMessage({ type: 'error', runId, message: 'O programa encontrou um erro. Revê a mensagem e experimenta outra vez.' });
    }
  };
  runBatch();
};
