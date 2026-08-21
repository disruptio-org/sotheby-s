import { PlusIcon } from '../components/icons';

export function AppsScreen() {
  return (
    <div className="empty-state">
      <div className="empty-state__mark" aria-hidden>
        <PlusIcon />
      </div>
      <h2 className="empty-state__title">Ainda sem apps</h2>
      <p className="empty-state__text">
        Ferramentas internas à medida — relatórios de despesas, controlo de comissões, entrada de
        contratos — serão construídas aqui sobre os seus agentes e workflows.
      </p>
      <div className="empty-state__badge">Brevemente</div>
    </div>
  );
}
