import type { ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Button } from './components';

export interface ConfirmacaoProps {
  aberta: boolean;
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  rotuloCancelar: string;
  perigosa?: boolean;
  aoConfirmar: () => void;
  aoFechar: () => void;
}

/** Diálogo modal de confirmação (React Aria: foco preso, Esc fecha). */
export function Confirmacao({
  aberta,
  titulo,
  children,
  rotuloConfirmar,
  rotuloCancelar,
  perigosa,
  aoConfirmar,
  aoFechar,
}: ConfirmacaoProps) {
  return (
    <ModalOverlay
      isOpen={aberta}
      onOpenChange={(v) => !v && aoFechar()}
      isDismissable
      className="ak-modal-fundo"
    >
      <Modal className="ak-modal">
        <Dialog role="alertdialog" className="ak-dialogo">
          <Heading slot="title" className="ak-h2 ak-h2--sm">
            {titulo}
          </Heading>
          <div className="ak-dialogo__corpo">{children}</div>
          <div className="ak-dialogo__acoes">
            <Button variant="subtle" onPress={aoFechar} autoFocus>
              {rotuloCancelar}
            </Button>
            <Button
              variant="primary"
              onPress={aoConfirmar}
              style={perigosa ? { background: 'var(--danger)' } : undefined}
            >
              {rotuloConfirmar}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
