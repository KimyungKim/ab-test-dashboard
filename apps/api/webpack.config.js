const nodeExternals = require('webpack-node-externals')
const path = require('path')

module.exports = (options) => ({
  ...options,
  externals: [
    nodeExternals({
      // pnpm monorepo: node_modules는 모노레포 루트에 있음
      modulesDir: path.resolve(__dirname, '../../node_modules'),
      additionalModuleDirs: [
        path.resolve(__dirname, 'node_modules'),
      ],
      allowlist: [/^@ab-test-dashboard\//],
    }),
  ],
})
