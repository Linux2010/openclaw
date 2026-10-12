// Live tool-owner reuse for plugin tool assembly. Metadata completion can
// surface owners that a narrowed prepared generation never admitted; without
// this, every assembly would classify those owners as missing and re-import
// already-admitted plugins synchronously on the caller's thread through the
// discovery path (toolDiscovery disables runtime-registration borrowing and
// uses a different cache identity), rebuilding their stores each time.
import {
  createRuntimePluginManifestLookup,
  getLoadedRuntimePluginRegistry,
} from "./active-runtime-registry.js";
import type { PluginManifestRecord } from "./manifest-registry.js";
import { getPluginInstance } from "./plugin-instance-scope.js";
import type { PluginRegistry } from "./registry-types.js";

/**
 * Collect live registrations for the requested plugin ids, preferring the
 * serving registry and then the host's retained full registry (the Gateway's
 * startup registrations). Owners already registered by the host resolve through
 * that retained registry; the discovery-path cold load stays reserved for
 * genuinely absent standalone owners.
 */
export function collectRetainedToolOwners(params: {
  onlyPluginIds: readonly string[];
  snapshotPlugins: readonly PluginManifestRecord[];
  runtimeRegistry?: PluginRegistry;
  preparedRegistry?: PluginRegistry;
  workspaceDir: string;
}): Map<string, { registry: PluginRegistry }> {
  const retainedRegistry =
    params.runtimeRegistry && params.runtimeRegistry === params.preparedRegistry
      ? getLoadedRuntimePluginRegistry({ workspaceDir: params.workspaceDir })
      : undefined;
  const sources = [
    ...(params.runtimeRegistry
      ? [
          {
            registry: params.runtimeRegistry,
            lookup: createRuntimePluginManifestLookup(
              params.runtimeRegistry,
              params.snapshotPlugins,
            ),
          },
        ]
      : []),
    ...(retainedRegistry && retainedRegistry !== params.runtimeRegistry
      ? [
          {
            registry: retainedRegistry,
            lookup: createRuntimePluginManifestLookup(retainedRegistry, params.snapshotPlugins),
          },
        ]
      : []),
  ];
  const owners = new Map<string, { registry: PluginRegistry }>();
  for (const pluginId of params.onlyPluginIds) {
    for (const source of sources) {
      const record = source.lookup(pluginId);
      const instance = record && getPluginInstance(record);
      if (
        instance &&
        (instance.toolRegistrationComplete ||
          source.registry.tools.some((entry) => entry.pluginId === pluginId))
      ) {
        owners.set(pluginId, { registry: source.registry });
        break;
      }
    }
  }
  return owners;
}
