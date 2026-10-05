import type { Insight } from '@akademos/core';
import { Link } from '@tanstack/react-router';
import { corDoInsight, ROTA_DO_DESTINO, ROTULO_FONTE } from './insight';
import s from './CartaoInsight.module.css';

export function CartaoInsight({ insight: i, largo }: { insight: Insight; largo?: boolean }) {
  const rotulo = (
    <span className={s.rotulo} style={{ color: corDoInsight(i) }}>
      {i.rotulo}
    </span>
  );
  const acao = i.acao && (
    <Link to={ROTA_DO_DESTINO[i.acao.destino]} className={s.acao}>
      {i.acao.rotulo} →
    </Link>
  );
  if (!largo) {
    return (
      <article className={s.cartao}>
        {rotulo}
        <h3 className={s.titulo} style={{ fontFamily: 'inherit' }}>
          {i.titulo}
        </h3>
        <p className={s.texto}>{i.texto}</p>
        {/* Regra 5: todo insight exibido mostra motivo e fonte. */}
        <span className={s.fonte}>
          {ROTULO_FONTE[i.fonte]} · {i.motivo}
        </span>
        {acao}
      </article>
    );
  }
  return (
    <article className={`${s.cartao} ${s.largo}`}>
      {rotulo}
      <div className={s.corpo}>
        <h3 className={s.titulo} style={{ fontFamily: 'inherit' }}>
          {i.titulo}
        </h3>
        <p className={s.texto}>{i.texto}</p>
        <div className={s.rodape}>
          {acao}
          <span className={s.fonte}>
            {ROTULO_FONTE[i.fonte]} · {i.motivo}
          </span>
        </div>
      </div>
    </article>
  );
}
