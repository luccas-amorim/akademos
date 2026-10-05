import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useFormatoNota } from './formato';
import { gravarPreferencia } from './preferencias';

afterEach(() => gravarPreferencia('ocultarNotas', null));

describe('modo Ocultar notas', () => {
  it('troca todos os valores de nota por •,• e volta', () => {
    const { result } = renderHook(() => useFormatoNota());
    expect(result.current.nota(7.8)).toBe('7,8');
    act(() => gravarPreferencia('ocultarNotas', '1'));
    expect(result.current.nota(7.8)).toBe('•,•');
    expect(result.current.intervalo({ min: 5.8, max: 6.9 })).toBe('•,• – •,•');
    act(() => gravarPreferencia('ocultarNotas', null));
    expect(result.current.nota(7.8)).toBe('7,8');
  });

  it('não esconde ausência de nota', () => {
    act(() => gravarPreferencia('ocultarNotas', '1'));
    const { result } = renderHook(() => useFormatoNota());
    expect(result.current.nota(null)).toBe('—');
  });
});
