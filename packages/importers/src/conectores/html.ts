import { parse, type HTMLElement } from 'node-html-parser';

/** Utilidades de raspagem comuns aos conectores (sem DOM do navegador). */
export function analisar(html: string): HTMLElement {
  return parse(html, { comment: false });
}

export function texto(el: HTMLElement | null | undefined): string {
  return (el?.text ?? '').replace(/\s+/g, ' ').trim();
}

/** Campos de um formulário (inputs e o primeiro option de cada select, ou o selecionado). */
export function camposDoFormulario(form: HTMLElement): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const input of form.querySelectorAll('input')) {
    const nome = input.getAttribute('name');
    const tipo = (input.getAttribute('type') ?? 'text').toLowerCase();
    if (!nome || tipo === 'submit' || tipo === 'button') continue;
    campos[nome] = input.getAttribute('value') ?? '';
  }
  for (const select of form.querySelectorAll('select')) {
    const nome = select.getAttribute('name');
    if (!nome) continue;
    const opcao = select.querySelector('option[selected]') ?? select.querySelector('option');
    campos[nome] = opcao?.getAttribute('value') ?? '';
  }
  return campos;
}

/** Resolve o `action` de um formulário contra a URL da página. */
export function acaoDoFormulario(form: HTMLElement, urlPagina: string): string {
  return new URL(form.getAttribute('action') ?? urlPagina, urlPagina).toString();
}
