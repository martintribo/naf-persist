const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './src/index',
    output: {
        filename: 'build/bundle.js',
    },
    devtool: 'eval',
    // devServer: {
    //     contentBase: path.join(__dirname, 'test');
    // }

    // plugins: [
    //     new webpack.optimize.ModuleConcatenationPlugin()
    // ]
};