const { withXcodeProject } = require('@expo/config-plugins');

const SCRIPT_PHASE_NAMES = [
  '[CP-User] [Hermes] Replace Hermes for the right configuration, if needed',
  '[CP-User] [RN]Check rncore',
  '[CP-User] Generate app.config for prebuilt Constants.manifest',
];

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'script-phase';

const quote = (value) => (value.startsWith('"') ? value : `"${value}"`);

const normalizeName = (phase) => {
  const rawName =
    (typeof phase.name === 'string' && phase.name) ||
    (typeof phase.comment === 'string' && phase.comment) ||
    '';

  return rawName.replace(/"/g, '');
};

module.exports = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const phases = project?.hash?.project?.objects?.PBXShellScriptBuildPhase ?? {};

    Object.values(phases).forEach((phase) => {
      if (!phase || phase.isa !== 'PBXShellScriptBuildPhase') {
        return;
      }

      const normalizedName = normalizeName(phase);

      if (!SCRIPT_PHASE_NAMES.includes(normalizedName)) {
        return;
      }

      const existingOutputs = Array.isArray(phase.outputPaths)
        ? phase.outputPaths
        : typeof phase.outputPaths === 'string'
          ? [phase.outputPaths]
          : [];

      if (existingOutputs.length > 0) {
        return;
      }

      const outputPath = `$(DERIVED_FILE_DIR)/${slugify(normalizedName)}.stamp`;
      phase.outputPaths = [quote(outputPath)];
    });

    return cfg;
  });
