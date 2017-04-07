import babel from 'rollup-plugin-babel'
import babili from 'rollup-plugin-babili'

const minify = process.env.DIST === 'true'

const lib = {
  entry: './src/index.js',
  plugins: [
    babel({exclude: 'node_modules/**'})
  ],
  targets: [
    { format: 'es', dest: './lib/react-circuit.mjs' },
    { format: 'umd', dest: './lib/react-circuit.js', moduleId: 'react-circuit', moduleName: 'Circuit' }
  ]
}

const dist = {
  entry: './lib/react-circuit.js',
  plugins: [
    babili()
  ],
  targets: [
    { format: 'umd', dest: './dist/react-circuit.min.js', moduleId: 'react-circuit', moduleName: 'Circuit' }
  ]
}

export default minify ? dist: lib
