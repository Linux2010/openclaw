import { normalizeLowercaseStringOrEmpty } from "@openclaw/normalization-core/string-coerce";
import { resolveAgentConfig } from "../agents/agent-scope-config.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import type { ModelRef } from "../agents/model-ref-shared.js";
import {
  buildModelAliasIndex,
  inferUniqueProviderFromConfiguredModels,
  isCliProvider,
  normalizeStoredOverrideModel,
  parseModelRef,
  resolvePersistedSelectedModelRef,
  type CliProviderClassifier,
} from "../agents/model-selection.js";
import { resolveAgentModelPrimaryValue } from "../config/model-input.js";
import type { SessionEntry } from "../config/sessions/types.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";

type SessionDisplayModelRow = Pick<
  SessionEntry,
  "model" | "modelProvider" | "modelOverride" | "providerOverride"
> & {
  key: string;
};

function resolveSessionDisplayDefaults(cfg: OpenClawConfig, agentId?: string): ModelRef {
  const primary =
    (agentId
      ? resolveAgentModelPrimaryValue(resolveAgentConfig(cfg, agentId)?.model)
      : undefined) ??
    resolveAgentModelPrimaryValue(cfg.agents?.defaults?.model) ??
    DEFAULT_MODEL;
  // A bare primary (typically a configured alias such as "opus") must resolve
  // through the alias index the same way the runtime does; otherwise sessions
  // without a persisted model display a provider/model pair that does not
  // exist in the configuration (#177311).
  if (!primary.includes("/")) {
    const aliasIndex = buildModelAliasIndex({
      cfg,
      agentId,
      defaultProvider: DEFAULT_PROVIDER,
    });
    const aliasMatch = aliasIndex.byAlias.get(normalizeLowercaseStringOrEmpty(primary));
    if (aliasMatch) {
      return { provider: aliasMatch.ref.provider, model: aliasMatch.ref.model };
    }
  }
  return (
    parseModelRef(primary, DEFAULT_PROVIDER, {
      allowManifestNormalization: false,
      allowPluginNormalization: false,
    }) ?? { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL }
  );
}

function normalizeCliRuntimeDisplayRef(
  cfg: OpenClawConfig,
  agentId: string | undefined,
  ref: ModelRef,
  defaultRef: ModelRef,
  classifyCliProvider: CliProviderClassifier,
): ModelRef {
  if (!classifyCliProvider(ref.provider)) {
    return ref;
  }
  const parsed = parseModelRef(ref.model, defaultRef.provider, {
    allowManifestNormalization: false,
    allowPluginNormalization: false,
  });
  if (ref.model.includes("/") && parsed) {
    // CLI runtimes can store the real provider/model inside the model field;
    // prefer that embedded provider when it is not another CLI runtime alias.
    if (!classifyCliProvider(parsed.provider)) {
      return parsed;
    }
  }
  const inferredProvider = inferUniqueProviderFromConfiguredModels({
    cfg,
    model: ref.model,
    agentId,
  });
  if (inferredProvider && !classifyCliProvider(inferredProvider)) {
    return { provider: inferredProvider, model: ref.model };
  }
  // If the CLI runtime model cannot be mapped to a concrete provider, fall
  // back to the configured default provider so rows stay comparable.
  if (parsed && !classifyCliProvider(parsed.provider)) {
    return parsed;
  }
  return {
    provider: defaultRef.provider || ref.provider,
    model: parsed?.model || ref.model,
  };
}

/** Resolves provider/model display metadata for a session row. */
export function resolveSessionDisplayModelRef(
  cfg: OpenClawConfig,
  row: SessionDisplayModelRow,
  classifyCliProvider: CliProviderClassifier = (provider) => isCliProvider(provider, cfg),
  ownerAgentId?: string,
): ModelRef {
  const agentId =
    ownerAgentId ?? (row.key.startsWith("agent:") ? row.key.split(":")[1] : undefined);
  const defaultRef = resolveSessionDisplayDefaults(cfg, agentId);
  const normalizedOverride = normalizeStoredOverrideModel({
    providerOverride: row.providerOverride,
    modelOverride: row.modelOverride,
  });
  const persistedRef = resolvePersistedSelectedModelRef({
    defaultProvider: defaultRef.provider,
    runtimeProvider: row.modelProvider,
    runtimeModel: row.model,
    overrideProvider: normalizedOverride.providerOverride,
    overrideModel: normalizedOverride.modelOverride,
    allowManifestNormalization: false,
    allowPluginNormalization: false,
  });
  if (!persistedRef) {
    return defaultRef;
  }
  return normalizedOverride.modelOverride
    ? persistedRef
    : normalizeCliRuntimeDisplayRef(cfg, agentId, persistedRef, defaultRef, classifyCliProvider);
}
