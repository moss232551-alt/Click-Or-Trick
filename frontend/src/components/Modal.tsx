import { PropsWithChildren, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/modal.css';
import { useLanguage } from '../context/LanguageContext';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
};

const Modal = ({ open, title, onClose, children }: PropsWithChildren<ModalProps>) => {
  const { strings } = useLanguage();

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div className="modal-overlay" role="presentation" onMouseDown={handleOverlayClick}>
      <div className="modal-shell" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={strings.modal.closeLabel}>
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
