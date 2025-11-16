const fs = require('fs');
const path = require('path');
const { withDangerousMod, withPodfile, withXcodeProject } = require('@expo/config-plugins');

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

const getReactNativeVersion = (projectRoot) => {
  const reactNativePkgPath = require.resolve('react-native/package.json', {
    paths: [projectRoot],
  });

  const pkg = JSON.parse(fs.readFileSync(reactNativePkgPath, 'utf8'));
  return pkg.version || '0.0.0';
};

const buildStubSpec = (version) => {
  const headerSearchPaths = [
    '"$(PODS_ROOT)/boost"',
    '"$(PODS_ROOT)/RCT-Folly"',
    '"$(PODS_ROOT)/DoubleConversion"',
    '"$(PODS_ROOT)/fmt/include"',
    '"$(PODS_ROOT)/Headers/Public/React-Codegen/react/renderer/components"',
    '"$(PODS_ROOT)/Headers/Private/React-Fabric"',
    '"$(PODS_ROOT)/Headers/Private/React-RCTFabric"',
    '"$(PODS_ROOT)/Headers/Private/Yoga"',
    '"$(PODS_TARGET_SRCROOT)"',
  ];

  return {
    name: 'React-Codegen',
    version,
    summary: 'Stub podspec for Expo development builds with codegen disabled.',
    homepage: 'https://expo.dev',
    license: 'MIT',
    authors: 'Meta Platforms, Inc.',
    compiler_flags:
      '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -Wno-comma -Wno-shorten-64-to-32',
    source: { git: '' },
    header_mappings_dir: './',
    platforms: { ios: '13.4' },
    source_files: [],
    pod_target_xcconfig: {
      HEADER_SEARCH_PATHS: headerSearchPaths.join(' '),
      FRAMEWORK_SEARCH_PATHS: [],
    },
    dependencies: {
      'React-jsiexecutor': [],
      'RCT-Folly': [],
      RCTRequired: [],
      RCTTypeSafety: [],
      'React-Core': [],
      'React-jsi': [],
      'ReactCommon/turbomodule/bridging': [],
      'ReactCommon/turbomodule/core': [],
      'React-NativeModulesApple': [],
      glog: [],
      DoubleConversion: [],
      'React-graphics': [],
      'React-rendererdebug': [],
      'React-Fabric': [],
      'React-FabricImage': [],
      'React-debug': [],
      'React-utils': [],
      'React-featureflags': [],
    },
  };
};

const ensureReactCodegenStub = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, 'ios');

      if (!fs.existsSync(iosDir)) {
        return cfg;
      }

      const generatedDir = path.join(iosDir, 'build', 'generated', 'ios');
      fs.mkdirSync(generatedDir, { recursive: true });

      const specPath = path.join(generatedDir, 'React-Codegen.podspec.json');
      const version = getReactNativeVersion(projectRoot);
      const spec = buildStubSpec(version);
      fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);

      return cfg;
    },
  ]);

const withCodegenDisabled = (config) =>
  withPodfile(config, (cfg) => {
    if (cfg.modResults?.contents) {
      cfg.modResults.contents = ensureCodegenDisabled(cfg.modResults.contents);
    }

    return cfg;
  });

module.exports = (config) => ensureReactCodegenStub(withCodegenDisabled(withScriptPhaseOutputs(config)));
