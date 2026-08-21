import { z } from 'zod';
import { MODEL_BY_ID, PROVIDER_IDS, SKILL_CATEGORIES, USER_STATUSES } from './catalogs.js';
import { allPermissionKeys } from './permissions.js';

/**
 * Request payloads, validated by the API and reused by the web client so a form
 * can never post a shape the server rejects.
 */

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const providerIdSchema = z.enum(PROVIDER_IDS as [string, ...string[]]);

export const modelIdSchema = z.string().refine((id) => id in MODEL_BY_ID, {
  message: 'Modelo desconhecido.',
});

export const idSchema = z.number().int().positive();

/* ── Auth ─────────────────────────────────────────────────────────────────── */

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

/** The one place the minimum is set. The web form enforces the same number. */
export const PASSWORD_MIN_LENGTH = 12;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});

/* ── Invitations and password resets ──────────────────────────────────────── */

/**
 * The token travels in the body, never in a path or a query, so it cannot end
 * up in an access log or a `Referer` header on the way to the server.
 */
export const claimTokenSchema = z.object({
  token: z.string().min(1).max(400),
});

export const claimPasswordSchema = z.object({
  token: z.string().min(1).max(400),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});

/**
 * Deliberately lax about what an e-mail address looks like: the answer is the
 * same either way, so rejecting a malformed one would be a way to learn that
 * the platform bothered to look.
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().min(1).max(200),
});

/* ── Agents ───────────────────────────────────────────────────────────────── */

export const agentInputSchema = z.object({
  name: trimmed(120),
  model: modelIdSchema,
  temp: z.number().min(0).max(2),
  desc: z.string().trim().max(600).default(''),
  prompt: z.string().max(20_000).default(''),
  skillIds: z.array(idSchema).max(50).default([]),
  knowIds: z.array(idSchema).max(50).default([]),
  toolIds: z.array(idSchema).max(50).default([]),
  limitRuns: z.number().int().min(0).max(1_000_000).default(0),
  limitBudgetCents: z.number().int().min(0).max(100_000_000).default(0),
});

export const agentStatusSchema = z.object({ status: z.enum(['ACTIVE', 'PAUSED']) });

/* ── Skills ───────────────────────────────────────────────────────────────── */

export const skillInputSchema = z.object({
  name: trimmed(120),
  cat: z.enum(SKILL_CATEGORIES as [string, ...string[]]),
  desc: z.string().trim().max(600).default(''),
  instr: z.string().max(20_000).default(''),
});

/* ── Workflows ────────────────────────────────────────────────────────────── */

export const workflowCreateSchema = z.object({
  name: trimmed(120),
  agentId: idSchema,
});

export const workflowUpdateSchema = z
  .object({
    name: trimmed(120).optional(),
    agentId: idSchema.optional(),
    steps: z.array(idSchema).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nada para atualizar.' });

/* ── Users ────────────────────────────────────────────────────────────────── */

export const userInviteSchema = z.object({
  name: trimmed(120),
  email: z.string().trim().email().max(200),
  roleId: idSchema,
});

export const userUpdateSchema = z
  .object({
    name: trimmed(120).optional(),
    roleId: idSchema.optional(),
    status: z.enum(USER_STATUSES as [string, ...string[]]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nada para atualizar.' });

/* ── Roles ────────────────────────────────────────────────────────────────── */

export const roleInputSchema = z.object({
  name: trimmed(120),
  desc: z.string().trim().max(600).default(''),
});

const permissionKeySchema = z.enum(allPermissionKeys() as [string, ...string[]]);

export const rolePermissionsSchema = z.object({
  /** The complete set of granted keys — sent whole, not as a diff. */
  permissions: z.array(permissionKeySchema).max(200),
});

/* ── Settings ─────────────────────────────────────────────────────────────── */

export const settingsUpdateSchema = z
  .object({
    provider: providerIdSchema.optional(),
    model: modelIdSchema.optional(),
    budgetCents: z.number().int().min(0).max(100_000_000).optional(),
    alertPct: z.number().int().min(1).max(100).optional(),
    hardStop: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nada para atualizar.' });

export const providerKeySchema = z.object({
  provider: providerIdSchema,
  /** Empty string clears the stored key. */
  key: z.string().max(500),
});

/* ── Runs ─────────────────────────────────────────────────────────────────── */

export const runCreateSchema = z.object({
  workflowId: idSchema,
  input: z.string().max(20_000).default(''),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AgentInput = z.infer<typeof agentInputSchema>;
export type SkillInput = z.infer<typeof skillInputSchema>;
export type WorkflowCreateInput = z.infer<typeof workflowCreateSchema>;
export type WorkflowUpdateInput = z.infer<typeof workflowUpdateSchema>;
export type UserInviteInput = z.infer<typeof userInviteSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type RoleInput = z.infer<typeof roleInputSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
export type ProviderKeyInput = z.infer<typeof providerKeySchema>;
export type RunCreateInput = z.infer<typeof runCreateSchema>;
