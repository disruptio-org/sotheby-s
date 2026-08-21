import { CheckIcon } from '../components/icons';
import {
  COST_PER_RUN,
  MODELS_BY_PROVIDER,
  PROVIDERS,
  PROVIDER_NAME,
} from '../domain/catalogs';
import { messages } from '../state/messages';
import { useStore } from '../state/store';
import { euros } from '../utils/format';

/** A key shorter than this reads as a placeholder rather than a real secret. */
const MIN_KEY_LENGTH = 8;

export function SettingsScreen() {
  const { state, dispatch, can } = useStore();
  const { settings } = state;
  const canEdit = can('settings.edit');

  const costOf = (runs: number) => Math.round(runs * COST_PER_RUN);
  const used = state.agents.reduce((total, agent) => total + costOf(agent.runs), 0);
  const pct = Math.min(100, Math.round((used / (settings.budget || 1)) * 100));
  const barColor =
    pct >= 100 ? 'var(--danger)' : pct >= settings.alertPct ? 'var(--warn)' : 'var(--ink)';

  const key = settings.keys[settings.provider] ?? '';
  const keyConfigured = key.length >= MIN_KEY_LENGTH;
  const keyColor = keyConfigured ? 'var(--ok)' : 'var(--warn)';

  return (
    <div className="settings-grid">
      <section className="panel panel--settings">
        <div className="section-label">Fornecedor de LLM</div>
        <div className="provider-grid">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={!canEdit}
              aria-pressed={settings.provider === provider.id}
              className={`provider-card${
                settings.provider === provider.id ? ' provider-card--active' : ''
              }`}
              onClick={() => dispatch({ type: 'settings/setProvider', provider: provider.id })}
            >
              <div className="provider-card__name">{provider.name}</div>
              <div className="provider-card__vendor">{provider.vendor}</div>
            </button>
          ))}
        </div>

        <div className="settings-block">
          <label className="settings-block__label" htmlFor="default-model">
            Modelo predefinido
          </label>
          <select
            id="default-model"
            className="select"
            value={settings.model}
            disabled={!canEdit}
            onChange={(event) => dispatch({ type: 'settings/setModel', model: event.target.value })}
          >
            {MODELS_BY_PROVIDER[settings.provider].map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          <div className="field__hint">
            Aplicado a novos agentes — cada agente pode ser ajustado individualmente.
          </div>
        </div>

        <div className="settings-block">
          <label className="settings-block__label" htmlFor="api-key">
            Chave de API · {PROVIDER_NAME[settings.provider]}
          </label>
          <div className="key-row">
            <input
              id="api-key"
              className="input"
              type="password"
              autoComplete="off"
              placeholder="Colar chave de API"
              value={key}
              disabled={!canEdit}
              onChange={(event) => dispatch({ type: 'settings/setKey', value: event.target.value })}
            />
            {canEdit && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() =>
                  dispatch({
                    type: 'toast/push',
                    message: messages.keyVerified(PROVIDER_NAME[settings.provider]),
                  })
                }
              >
                Testar
              </button>
            )}
          </div>
          <div className="key-status" style={{ color: keyColor }}>
            <span className="key-status__dot" />
            {keyConfigured
              ? 'Chave configurada'
              : 'Sem chave — execuções indisponíveis neste fornecedor'}
          </div>
        </div>
      </section>

      <section className="panel panel--settings">
        <div className="section-label">Créditos &amp; limites</div>

        <div className="usage-head">
          <div className="usage-total">{euros(used)}</div>
          <div className="usage-sub">
            de {euros(settings.budget)} este mês · {pct}%
          </div>
        </div>
        <div className="meter">
          <div className="meter__fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>

        <div className="cost-list">
          {state.agents.map((agent) => {
            const cost = costOf(agent.runs);
            const share = used ? Math.round((cost / used) * 100) : 0;
            return (
              <div key={agent.id}>
                <div className="cost-row__head">
                  <div className="cost-row__name">{agent.name}</div>
                  <div className="cost-row__value">{euros(cost)}</div>
                </div>
                <div className="cost-bar">
                  <div className="cost-bar__fill" style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="settings-numbers">
          <div>
            <label className="field__sublabel" htmlFor="budget">
              Orçamento mensal (€)
            </label>
            <input
              id="budget"
              className="input input--compact"
              type="number"
              value={String(settings.budget)}
              disabled={!canEdit}
              onChange={(event) =>
                dispatch({
                  type: 'settings/setNumber',
                  field: 'budget',
                  value: Number(event.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <label className="field__sublabel" htmlFor="alert-pct">
              Alerta a (%)
            </label>
            <input
              id="alert-pct"
              className="input input--compact"
              type="number"
              value={String(settings.alertPct)}
              disabled={!canEdit}
              onChange={(event) =>
                dispatch({
                  type: 'settings/setNumber',
                  field: 'alertPct',
                  value: Number(event.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!canEdit}
          aria-pressed={settings.hardStop}
          className={`toggle-chip hardstop${settings.hardStop ? ' toggle-chip--on' : ''}`}
          onClick={() => dispatch({ type: 'settings/toggleHardStop' })}
        >
          <span className="checkbox">{settings.hardStop && <CheckIcon stroke="#FFFFFF" />}</span>
          Suspender execuções ao atingir o orçamento
        </button>

        {canEdit && (
          <button
            type="button"
            className="btn btn--primary settings-save"
            onClick={() => dispatch({ type: 'toast/push', message: messages.settingsSaved })}
          >
            Guardar definições
          </button>
        )}
      </section>
    </div>
  );
}
