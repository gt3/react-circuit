import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import replace from 'rollup-plugin-replace'
//const minify = process.env.DIST === 'true'

const lib = {
  entry: './src/index.js',
  globals: { 'react': 'react', 'prop-types': 'PropTypes', 'js-csp': 'csp' },
  external: ['react','js-csp','prop-types'],
  plugins: [
    babel({exclude: 'node_modules/**'}),
    replace({'process.env.NODE_ENV': JSON.stringify('development')}),
    resolve({}),
    commonjs({})
  ],
  targets: [
    { format: 'es', dest: './lib/react-circuit.es.js' },
    { format: 'umd', dest: './lib/react-circuit.js', moduleId: 'react-circuit', moduleName: 'circuit' }
  ]
}

export default lib
