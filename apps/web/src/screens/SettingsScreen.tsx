import { MODELS_BY_PROVIDER, PROVIDERS, PROVIDER_NAME } from '@sothebys/domain';
import { CheckIcon } from '../components/icons';
import { useStore } from '../state/store';
import { euros } from '../utils/format';

export function SettingsScreen() {
  const { state, dispatch, actions, can } = useStore();
  const { settings, settingsDraft, settingsBusy } = state;
  const canEdit = can('settings.edit');

  if (!settings) {
    return <p className="cell-muted">{state.loading ? 'A carregar…' : 'Definições indisponíveis.'}</p>;
  }

  const used = settings.spentCents;
  const pct = Math.min(100, Math.round((used / (settings.budgetCents || 1)) * 100));
  const barColor =
    pct >= 100 ? 'var(--danger)' : pct >= settings.alertPct ? 'var(--warn)' : 'var(--ink)';

  const keyConfigured = settings.keyConfigured[settings.provider];
  const keyColor = keyConfigured ? 'var(--ok)' : 'var(--warn)';
  const providerName = PROVIDER_NAME[settings.provider];

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
              onClick={() => void actions.updateSettings({ provider: provider.id })}
            >
              <div className="provider-card__name">{provider.name}</div>
              <div className="provider-card__vendor">{provider.vendor}</div>
              {settings.keyConfigured[provider.id] && (
                <span className="provider-card__keyed" title="Chave configurada" aria-hidden />
              )}
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
            onChange={(event) => void actions.updateSettings({ model: event.target.value })}
          >
            {MODELS_BY_PROVIDER[settings.provider].map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
          <div className="field__hint">
            Aplicado a novos agentes — cada agente pode ser ajustado individualmente.
          </div>
        </div>

        <div className="settings-block">
          <label className="settings-block__label" htmlFor="api-key">
            Chave de API · {providerName}
          </label>
          <div className="key-row">
            <input
              id="api-key"
              className="input"
              type="password"
              autoComplete="off"
              placeholder={keyConfigured ? 'Substituir a chave guardada' : 'Colar chave de API'}
              value={settingsDraft.key}
              disabled={!canEdit || settingsBusy}
              onChange={(event) =>
                dispatch({ type: 'settings/setDraft', field: 'key', value: event.target.value })
              }
            />
            {canEdit && (
              <button
                type="button"
                className="btn btn--outline"
                // Empty field with no key on file is a no-op, not a removal.
                disabled={settingsBusy || (!settingsDraft.key.trim() && !keyConfigured)}
                onClick={() => void actions.saveKey()}
              >
                {settingsDraft.key.trim() ? 'Guardar' : 'Remover'}
              </button>
            )}
            {canEdit && keyConfigured && (
              <button
                type="button"
                className="btn btn--outline"
                disabled={settingsBusy}
                onClick={() => void actions.testKey()}
              >
                Testar
              </button>
            )}
          </div>
          <div className="key-status" style={{ color: keyColor }}>
            <span className="key-status__dot" />
            {keyConfigured
              ? 'Chave configurada — guardada cifrada no servidor'
              : 'Sem chave — execuções indisponíveis neste fornecedor'}
          </div>
        </div>
      </section>

      <section className="panel panel--settings">
        <div className="section-label">Créditos &amp; limites</div>

        <div className="usage-head">
          <div className="usage-total">{euros(used)}</div>
          <div className="usage-sub">
            de {euros(settings.budgetCents)} este mês · {pct}%
          </div>
        </div>
        <div className="meter">
          <div className="meter__fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>

        <div className="cost-list">
          {state.agents.map((agent) => {
            const share = used ? Math.round((agent.spentCents / used) * 100) : 0;
            return (
              <div key={agent.id}>
                <div className="cost-row__head">
                  <div className="cost-row__name">{agent.name}</div>
                  <div className="cost-row__value">{euros(agent.spentCents)}</div>
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
              min="0"
              value={settingsDraft.budget}
              disabled={!canEdit}
              onChange={(event) =>
                dispatch({ type: 'settings/setDraft', field: 'budget', value: event.target.value })
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
              min="0"
              max="100"
              value={settingsDraft.alertPct}
              disabled={!canEdit}
              onChange={(event) =>
                dispatch({ type: 'settings/setDraft', field: 'alertPct', value: event.target.value })
              }
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!canEdit}
          aria-pressed={settings.hardStop}
          className={`toggle-chip hardstop${settings.hardStop ? ' toggle-chip--on' : ''}`}
          onClick={() => void actions.updateSettings({ hardStop: !settings.hardStop })}
        >
          <span className="checkbox">{settings.hardStop && <CheckIcon stroke="#FFFFFF" />}</span>
          Suspender execuções ao atingir o orçamento
        </button>

        {canEdit && (
          <button
            type="button"
            className="btn btn--primary settings-save"
            disabled={settingsBusy}
            onClick={() => void actions.saveSettingsNumbers()}
          >
            {settingsBusy ? 'A guardar…' : 'Guardar definições'}
          </button>
        )}
      </section>
    </div>
  );
}
