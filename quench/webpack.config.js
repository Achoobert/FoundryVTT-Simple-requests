import { fileURLToPath } from 'url'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import developmentOptions from './fvtt.config.js'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'

const rootFolder = path.dirname(fileURLToPath(import.meta.url))

/** Set the run mode for @constant bundleScript */
const buildMode = process.argv[3] === 'production' ? 'production' : 'development'

/**
 * Get the user data path for Foundry VTT, based on what is configured on key
 * userDataPath inside fvtt.config.js
 */
function buildDestination() {
  try {
    const { userDataPath } = developmentOptions
    let check = ''
    if (fs.existsSync(check = rootFolder + '/module/module.json')) {
      const json = JSON.parse(fs.readFileSync(check, 'utf8'))
      if (typeof json.id !== 'undefined') {
        if (fs.existsSync(userDataPath)) {
          return path.join(userDataPath, 'Data', 'modules', json.id)
        }
      }
    }
  } catch (e) {
    //
  }
  return path.join(rootFolder, 'build/')
}

function copyList() {
  const list = []
  if (fs.existsSync('module/assets/')) {
    list.push({ from: 'module/assets/', to: 'assets/' })
  }
  if (fs.existsSync('module/lang/')) {
    list.push({ from: 'module/lang/', to: 'lang/' })
  }
  if (fs.existsSync('module/packs/')) {
    list.push({ from: 'module/packs/', to: 'packs/' })
  }
  if (fs.existsSync('module/templates/')) {
    list.push({ from: 'module/templates/', to: 'templates/' })
  }
  if (fs.existsSync('module/README.md')) {
    list.push({ from: 'module/README.md', to: 'README.md' })
  }
  // Licence is required
  list.push({ from: 'module/LICENSE', to: 'LICENSE', toType: 'file' })
  list.push({ from: 'module/module.json', to: 'module.json' })
  return list
}

/** Set optimization options for when @constant buildMode is `production` */
const optimization =
  buildMode === 'production'
    ? {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            mangle: false
          }
        }),
        new CssMinimizerPlugin()
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            name: 'main',
            test: 'module/src/index.js'
          }
        }
      }
    }
    : undefined

/**
 * The nerve center. Here are all the settings for compiling bundles:
 * production and development
 */
const bundleScript = {
  bail: buildMode === 'production',
  context: rootFolder,
  entry: './module/src/index.js',
  devtool: 'inline-source-map',
  mode: buildMode,
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              url: false,
              sourceMap: true
            }
          },
          {
            loader: 'less-loader',
            options: { sourceMap: true }
          }
        ]
      },
      {
        loader: 'thread-loader',
        options: {
          workers: os.cpus().length + 1,
          poolRespawn: false,
          poolTimeout: buildMode === 'production' ? 500 : Infinity
        }
      }
    ]
  },
  optimization,
  output: {
    clean: true,
    path: buildDestination(),
    filename: 'module.js'
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: copyList()
    }),
    new MiniCssExtractPlugin({
      filename: 'module.css',
      insert: 'head'
    })
  ],
  resolve: {
    extensions: ['.js']
  },
  watch: buildMode === 'development'
}

export default bundleScript
