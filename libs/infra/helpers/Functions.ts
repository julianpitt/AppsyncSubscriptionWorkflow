import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { BundlingOptions, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';

export const bundling = (): Partial<BundlingOptions> => {
  const baseConfig = {
    minify: true, // minify code, defaults to false
    sourceMap: true, // include source map, defaults to false
    sourceMapMode: SourceMapMode.INLINE, // defaults to nodeLambda.SourceMapMode.DEFAULT
    sourcesContent: false, // do not include original source into source map, defaults to true
    target: 'es2020',
    externalModules: ['aws-sdk'],
  };

  if (process.env['NODE_ENV'] && process.env['NODE_ENV'] === 'development') {
    console.log('Development mode');
    baseConfig.minify = false;
    baseConfig.sourcesContent = true;
  }

  return baseConfig;
};

export const defaultFunctionProps = () => ({
  memorySize: 512,
  timeout: Duration.seconds(30),
  runtime: Runtime.NODEJS_LATEST,
  handler: 'handler',
  environment: {
    NODE_OPTIONS: '--enable-source-maps',
  },
  bundling: {
    ...bundling(),
  },
});
