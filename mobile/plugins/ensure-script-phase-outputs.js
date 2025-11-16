const { withPodfile, withXcodeProject } = require('@expo/config-plugins');

const SCRIPT_PHASE_NAMES = [
  '[CP-User] [Hermes] Replace Hermes for the right configuration, if needed',
  '[CP-User] [RN]Check rncore',
  '[CP-User] Generate app.config for prebuilt Constants.manifest',
];

const DISABLE_CODEGEN_SNIPPET = "ENV['DISABLE_CODEGEN'] ||= '1'";

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

const ensureCodegenDisabled = (podfileContents) => {
  if (!podfileContents || podfileContents.includes(DISABLE_CODEGEN_SNIPPET)) {
    return podfileContents;
  }

  const envAnchor =
    "ENV['EX_DEV_CLIENT_NETWORK_INSPECTOR'] = podfile_properties['EX_DEV_CLIENT_NETWORK_INSPECTOR']";

  if (podfileContents.includes(envAnchor)) {
    return podfileContents.replace(envAnchor, `${envAnchor}\n${DISABLE_CODEGEN_SNIPPET}`);
  }

  return `${DISABLE_CODEGEN_SNIPPET}\n${podfileContents}`;
};

const withScriptPhaseOutputs = (config) =>
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

const withCodegenDisabled = (config) =>
  withPodfile(config, (cfg) => {
    if (cfg.modResults?.contents) {
      cfg.modResults.contents = ensureCodegenDisabled(cfg.modResults.contents);
    }

    return cfg;
  });

module.exports = (config) => withCodegenDisabled(withScriptPhaseOutputs(config));
