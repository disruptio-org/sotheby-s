import { MODELS, SKILL_CATEGORY_LABEL, type SkillCategory } from '@sothebys/domain';
import { useEffect, useId, type ReactNode } from 'react';
import { useStore } from '../state/store';
import type { ChipField, DrawerKind, TextField } from '../state/types';
import { DrawerCloseIcon } from './icons';

const TITLES: Record<DrawerKind, { create: string; edit: string }> = {
  agent: { create: 'Novo agente', edit: 'Configurar agente' },
  skill: { create: 'Nova skill', edit: 'Editar skill' },
  user: { create: 'Convidar utilizador', edit: 'Convidar utilizador' },
  workflow: { create: 'Novo workflow', edit: 'Novo workflow' },
  role: { create: 'Novo perfil', edit: 'Renomear perfil' },
};

const KICKERS: Record<DrawerKind, string> = {
  agent: 'Plataforma',
  skill: 'Plataforma',
  workflow: 'Plataforma',
  user: 'Gestão de utilizadores',
  role: 'Perfis & permissões',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field__label">{label}</div>
      {children}
    </div>
  );
}

export function Drawer() {
  const { state, dispatch, actions } = useStore();
  const drawer = state.drawer;
  const titleId = useId();

  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'drawer/close' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, dispatch]);

  if (!drawer) return null;

  const { kind, id, fields, error, busy } = drawer;
  const isEdit = id !== null;
  const setField = (field: TextField, value: string) =>
    dispatch({ type: 'drawer/setField', field, value });

  const saveLabel = isEdit ? 'Guardar alterações' : kind === 'user' ? 'Enviar convite' : 'Criar';

  return (
    <>
      <button
        type="button"
        className="scrim"
        aria-label="Fechar painel"
        onClick={() => dispatch({ type: 'drawer/close' })}
      />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="drawer__head">
          <div>
            <div className="drawer__kicker">{KICKERS[kind]}</div>
            <h2 className="drawer__title" id={titleId}>
              {isEdit ? TITLES[kind].edit : TITLES[kind].create}
            </h2>
          </div>
          <button
            type="button"
            className="drawer__close"
            aria-label="Fechar"
            onClick={() => dispatch({ type: 'drawer/close' })}
          >
            <DrawerCloseIcon />
          </button>
        </div>

        <div className="drawer__body">
          <Field label="Nome">
            <input
              className="input"
              value={fields.name}
              autoFocus
              onChange={(event) => setField('name', event.target.value)}
            />
          </Field>

          {kind === 'user' && (
            <>
              <Field label="E-mail">
                <input
                  className="input"
                  value={fields.email}
                  placeholder="nome@sothebysrealty.pt"
                  onChange={(event) => setField('email', event.target.value)}
                />
              </Field>
              <Field label="Perfil">
                <select
                  className="select"
                  value={fields.roleId}
                  onChange={(event) => setField('roleId', event.target.value)}
                >
                  {state.roles.map((role) => (
                    <option key={role.id} value={String(role.id)}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="note">
                A conta é criada sem palavra-passe. O convite segue por e-mail e é quem o recebe
                que define a sua própria palavra-passe.
              </p>
            </>
          )}

          {kind === 'agent' && (
            <>
              <Field label="Modelo">
                <select
                  className="select"
                  value={fields.model}
                  onChange={(event) => setField('model', event.target.value)}
                >
                  {(state.catalog?.models ?? MODELS).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="field">
                <div className="range-head">
                  <div className="field__label" style={{ marginBottom: 0 }}>
                    Temperatura
                  </div>
                  <div className="range-head__value">{fields.temp}</div>
                </div>
                <input
                  className="range"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={fields.temp}
                  aria-label="Temperatura"
                  onChange={(event) => setField('temp', event.target.value)}
                />
              </div>

              <Field label="Descrição">
                <textarea
                  className="textarea"
                  rows={2}
                  value={fields.desc}
                  onChange={(event) => setField('desc', event.target.value)}
                />
              </Field>

              <Field label="Prompt de sistema">
                <textarea
                  className="textarea"
                  rows={4}
                  value={fields.prompt}
                  onChange={(event) => setField('prompt', event.target.value)}
                />
              </Field>

              <ChipGroup
                label="Skills associadas"
                field="skillIds"
                selected={fields.skillIds}
                options={state.skills}
              />
              <ChipGroup
                label="Conhecimento · ficheiros"
                field="knowIds"
                selected={fields.knowIds}
                options={state.catalog?.knowledgeFiles ?? []}
              />
              <ChipGroup
                label="Ferramentas & APIs"
                field="toolIds"
                selected={fields.toolIds}
                options={state.catalog?.tools ?? []}
              />

              <div className="field" style={{ marginBottom: 8 }}>
                <div className="field__label" style={{ marginBottom: 10 }}>
                  Limites de utilização
                </div>
                <div className="field-pair">
                  <div>
                    <div className="field__sublabel">Execuções / mês (0 = sem limite)</div>
                    <input
                      className="input input--compact"
                      type="number"
                      value={fields.limitRuns}
                      onChange={(event) => setField('limitRuns', event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="field__sublabel">Orçamento mensal (€)</div>
                    <input
                      className="input input--compact"
                      type="number"
                      value={fields.limitBudget}
                      onChange={(event) => setField('limitBudget', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {kind === 'skill' && (
            <>
              <Field label="Categoria">
                <select
                  className="select"
                  value={fields.cat}
                  onChange={(event) => setField('cat', event.target.value)}
                >
                  {(Object.keys(SKILL_CATEGORY_LABEL) as SkillCategory[]).map((category) => (
                    <option key={category} value={category}>
                      {SKILL_CATEGORY_LABEL[category]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descrição">
                <textarea
                  className="textarea"
                  rows={2}
                  value={fields.desc}
                  onChange={(event) => setField('desc', event.target.value)}
                />
              </Field>
              <Field label="Instruções">
                <textarea
                  className="textarea"
                  rows={5}
                  placeholder="O que esta skill faz, passo a passo, e o formato de saída esperado."
                  value={fields.instr}
                  onChange={(event) => setField('instr', event.target.value)}
                />
              </Field>
            </>
          )}

          {kind === 'workflow' && (
            <>
              <Field label="Agente executor">
                <select
                  className="select"
                  value={fields.agentId}
                  onChange={(event) => setField('agentId', event.target.value)}
                >
                  {state.agents.map((agent) => (
                    <option key={agent.id} value={String(agent.id)}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="note">
                Os passos são adicionados e ordenados no canvas do workflow depois de criado.
              </p>
            </>
          )}

          {kind === 'role' && (
            <>
              <Field label="Descrição">
                <textarea
                  className="textarea"
                  rows={3}
                  value={fields.desc}
                  onChange={(event) => setField('desc', event.target.value)}
                />
              </Field>
              <p className="note">
                As permissões são atribuídas ação a ação na matriz, depois de o perfil ser guardado.
              </p>
            </>
          )}

          {error && (
            <div className="drawer__error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="drawer__foot">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => void actions.saveDrawer()}
          >
            {busy ? 'A guardar…' : saveLabel}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy}
            onClick={() => dispatch({ type: 'drawer/close' })}
          >
            Cancelar
          </button>
        </div>
      </aside>
    </>
  );
}

function ChipGroup({
  label,
  field,
  selected,
  options,
}: {
  label: string;
  field: ChipField;
  selected: number[];
  options: { id: number; name: string }[];
}) {
  const { dispatch } = useStore();

  return (
    <div className="field">
      <div className="field__label" style={{ marginBottom: 10 }}>
        {label}
      </div>
      <div className="chip-row">
        {options.map((option) => {
          const on = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              className={`pill-toggle${on ? ' pill-toggle--on' : ''}`}
              onClick={() => dispatch({ type: 'drawer/toggleChip', field, id: option.id })}
            >
              {option.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
