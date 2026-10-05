/**
 * Valida todo o registro: JSON Schema gerado do Zod (o mesmo que os editores
 * usam) e regras de coerência (pré-requisitos, ciclos, créditos).
 */
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lerInstituicoes, RAIZ_REGISTRO } from '../node';
import { montarPacotes, type Problema } from '../pacote';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const compilar = (nome: string) =>
  ajv.compile(
    JSON.parse(readFileSync(join(RAIZ_REGISTRO, 'schema', `${nome}.schema.json`), 'utf8')),
  );
const validadores = {
  instituicao: compilar('instituicao'),
  escala: compilar('escala'),
  matriz: compilar('matriz'),
  historico: compilar('historico-pdf'),
};

const problemas: Problema[] = [];
let matrizes = 0;

for (const arq of lerInstituicoes()) {
  const base = `instituicoes/${arq.pasta}`;
  const conferir = (v: ValidateFunction, dado: unknown, arquivo: string) => {
    if (v(dado)) return;
    for (const e of v.errors ?? []) {
      problemas.push({
        arquivo: `${base}/${arquivo}`,
        mensagem: `${e.instancePath || '/'} ${e.message ?? ''}`,
        grave: true,
      });
    }
  };
  conferir(validadores.instituicao, arq.instituicao, 'instituicao.yaml');
  conferir(validadores.escala, arq.escala, 'escala.yaml');
  if (arq.historicoPdf !== undefined) {
    conferir(validadores.historico, arq.historicoPdf, 'historico-pdf.yaml');
  }
  for (const [caminho, m] of Object.entries(arq.matrizes)) {
    conferir(validadores.matriz, m, caminho);
  }

  const r = montarPacotes(arq);
  problemas.push(...r.problemas);
  matrizes += r.entradas.length;
}

for (const p of problemas) {
  const linha = `${p.grave ? '✖' : '⚠'} ${p.arquivo}: ${p.mensagem}`;
  if (p.grave) console.error(linha);
  else console.warn(linha);
}
const graves = problemas.filter((p) => p.grave).length;
if (graves) {
  console.error(`\n${graves} problema(s) grave(s).`);
  process.exit(1);
}
console.info(`✔ Registro válido: ${matrizes} matriz(es).`);
