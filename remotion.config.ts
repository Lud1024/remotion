import {Config} from '@remotion/cli/config';

/**
 * The portable robot core uses ".js" import suffixes. Resolve these to their
 * TypeScript sources in Studio, while keeping the core independently compilable.
 */
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    extensionAlias: {
      ...(config.resolve?.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    },
  },
}));

Config.setVideoImageFormat('png');   // png => yuv420p output (jpeg frames yield yuvj420p, less compatible)
Config.setCodec('h264');
Config.setOverwriteOutput(true);
// Stay conservative with parallel tabs on this workstation.
Config.setConcurrency(3);
