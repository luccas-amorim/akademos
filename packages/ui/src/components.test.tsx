// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Filters, Kpi } from './components';

afterEach(cleanup);

describe('componentes', () => {
  it('Button dispara onPress', () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Continuar</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('Kpi expõe a barra como medidor acessível', () => {
    render(<Kpi label="Integralizado" value="48%" progress={48} />);
    expect(screen.getByRole('meter', { name: 'Integralizado' })).toBeTruthy();
    expect(screen.getByText('48%')).toBeTruthy();
  });

  it('Filters mantém seleção única', () => {
    const onChange = vi.fn();
    render(
      <Filters
        label="Tipo"
        value="todos"
        onChange={onChange}
        options={[
          { id: 'todos', label: 'Todos' },
          { id: 'risco', label: 'Risco' },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Risco' }));
    expect(onChange).toHaveBeenCalledWith('risco');
  });
});
