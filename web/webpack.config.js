const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const paths = {
  src: path.resolve(__dirname, 'src'),
  build: path.resolve(__dirname, 'dist'),
  html: path.resolve(__dirname, 'src/index.html'),
  icon: path.resolve(__dirname, 'src/favicon.ico'),
  node_modules: path.resolve(__dirname, 'node_modules'),
};

function common() {
  return {
    target: 'web',
    entry: [paths.src],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      modules: [paths.src, paths.node_modules],
      fallback: {
        fs: false,
        buffer: false,
        crypto: false,
        stream: false,
        path: require.resolve('path-browserify'),
      },
    },
    experiments: { asyncWebAssembly: true },
    module: {
      rules: [
        { test: /\.tsx?$/, loader: 'ts-loader', options: { transpileOnly: true } },
        {
          test: /\.svg$/,
          use: [
            {
              loader: '@svgr/webpack',
              options: {
                svgo: false,
                ref: true,
              },
            },
            {
              loader: 'file-loader',
              options: {
                name: 'static/assets/[name].[ext]',
                esModule: false,
              },
            },
          ],
          exclude: paths.node_modules,
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: paths.html, favicon: paths.icon }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(paths.node_modules, '@biosensesignal/web-sdk/dist'),
            to: path.resolve(paths.build),
            globOptions: {
              ignore: ['**/main.*'],
            },
          },
        ],
      }),
    ],
  };
}

function production() {
  return {
    mode: 'production',
    output: {
      filename: 'static/js/[name].js',
      publicPath: '/',
      path: paths.build,
      clean: true,
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
    ],
  };
}

function development() {
  return {
    mode: 'development',
    devtool: 'cheap-module-source-map',
    output: {
      filename: 'static/js/[name].js',
      publicPath: '/',
      path: paths.build,
    },
    devServer: {
      hot: true,
      port: 8000,
      https: true,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  };
}

module.exports = () =>
  process.env.NODE_ENV === 'production'
    ? merge(common(), production())
    : merge(common(), development());
