//webpack.config.js
const path = require('path');
const webpack = require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
// const mockUrlObj = require('./devServer.mock');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');//使用模块缓存



const UglifyJsPlugin = require('uglifyjs-webpack-plugin'); //多线程压缩
const ExtendedDefinePlugin = require('extended-define-webpack-plugin'); //全局变量

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin; //视图分析webpack情况

const HappyPack = require('happypack'); //多线程运行
var happyThreadPool = HappyPack.ThreadPool({ size: 4 });

const ExCss = require('extract-text-webpack-plugin')

const { argv } = process;
let env = 'development'; //默认是开发模式
let developmentMode = true;
argv.forEach(v => {
  if (v == 'production') {
    env = 'production';
    developmentMode = false;
  }
});


const plugins = [
  new CleanWebpackPlugin(['dist'], {
    root: __dirname,
  }),
  new CopyWebpackPlugin([
    { from: 'dll/Dll.js', to: path.resolve(__dirname, 'dist') },
  ]),

  new webpack.DllReferencePlugin({
    context: __dirname,
    manifest: require('./dll/manifest.json'),
  }),
  new HtmlWebpackPlugin({
    template: `${__dirname}/src/index.html`, //源html
    inject: 'body', //注入到哪里
    minify:{
        collapseWhitespace:false //折叠空白区域 也就是压缩代码
    },
    title:'I love China',
    filename: 'index.html', //输出后的名称
    hash: true, //为静态资源生成hash值
  }),
  new MiniCssExtractPlugin({
    //css添加hash
    // filename: '[name]-[hash].css',
    // chunkFilename: '[id][hash].css',
    chunkFilename: '[chunkhash].css',
  }),
  new HappyPack({
    //多线程运行 默认是电脑核数-1
    id: 'babel', //对于loaders id
    loaders: ['cache-loader', 'babel-loader?cacheDirectory'], //是用babel-loader解析
    threadPool: happyThreadPool,
    verboseWhenProfiling: true, //显示信息
  }),
  new webpack.HotModuleReplacementPlugin(),
  new webpack.BannerPlugin('@copy; 版权所有，翻版必究')
];
/*
[
    new CleanWebpackPlugin(['dist']), //传入数组,指定要删除的目录
    new HtmlWebpackPlugin({
      chunks:['main','index'],
      filename:'index.html',
      minify:{
          collapseWhitespace:false //折叠空白区域 也就是压缩代码
      },
      hash:true,
      title:'I love China',
      template: './public/index.html' //模板地址
    }),
    
    new webpack.ProvidePlugin({
        $:'jquery', //下载Jquery
        A:'angular' // 下载Angular
    }),
    
    // new config.optimization.splitChunks({ name: 'runtime' })
  ]*/
const configDev = {
  plugins: plugins.concat(
    new ExtendedDefinePlugin({
      //全局变量
      __LOCAL__: true,
    })
  ),
};
const configPro = {
  plugins: plugins.concat(
    new UglifyJsPlugin({
      sourceMap: true, //webpack会生成map，所以这里不需要
      parallel: 2,
      cache: true,
      uglifyOptions: {
        output: {
          comments: false,
          beautify: false,
        },
        compress: {
          drop_console: true,
          warnings: false,
          drop_debugger: true,
        },
      },
      exclude: /(node_modules|bower_components)/,
    }), //压缩，生成map
    new ExtendedDefinePlugin({
      //全局变量
      __LOCAL__: false,
    }),
    // new BundleAnalyzerPlugin({
    //   //另外一种方式
    //   analyzerMode: 'server',
    //   analyzerHost: '127.0.0.1',
    //   analyzerPort: 8889,
    //   reportFilename: 'report.html',
    //   defaultSizes: 'parsed',
    //   openAnalyzer: true,
    //   generateStatsFile: false,
    //   statsFilename: 'stats.json',
    //   statsOptions: null,
    //   logLevel: 'info',
    // })
  ),
};

const config = env == 'development' ? configDev : configPro;

module.exports = {
  entry:  {
    app: __dirname + "/app/main.js",
    react: ['react'],
    redom: ['react-dom']
    // vendor: ['react'],
  },//已多次提及的唯一入口文件
  performance: {
    maxEntrypointSize: 250000, //入口文件大小，性能指示
    maxAssetSize: 250000, //生成的最大文件
    hints: false, //依赖过大是否错误提示
    // assetFilter: function(assetFilename) {
    //   return assetFilename.endsWith('.js');
    // }
  },

  output: {
    path: __dirname + "/dist",//打包后的文件存放的地方
    //filename前面我们可以使用一个变量[name],这个就表示获取entry里面的key作为文件名加在前面
    //打出来是index-bundle.js
    //和index2-bundle.js
    filename:'[name].bundle.js',//[name].bundle.js

    //打包后输出文件的文件名
  },
  devServer:{
    // 设置服务器访问的基本目录
    contentBase:path.resolve(__dirname,'dist'), //最好设置成绝对路径
    // 设置服务器的ip地址,可以是localhost
    host:'localhost',
    // 设置端口
    port:8001,
    // 设置自动拉起浏览器
    open:true
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // get the name. E.g. node_modules/packageName/not/this/part.js
            // or node_modules/packageName
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];

            // npm package names are URL-safe, but some servers don't like @ symbols
            return `npm.${packageName.replace('@', '')}`;
          },
        },
        // aaa:{ // 键值可以自定义                
        //   chunks:'initial', //                 
        //   name:'jquery', // 入口的entry的key                
        //   enforce:true   // 强制             
        // },            
        // bbb:{                
        //   chunks:'initial',                
        //   name:'angular',                
        //   enforce:true            
        // }

      },
    },
  },
  plugins:config.plugins,
  resolve: {
    mainFields: ['jsnext:main', 'browser', 'main'], //npm读取先后方式  jsnext:main 是采用es6模块写法
    alias: {
      //快捷入口
      api: path.resolve(__dirname, 'src/api'),
      actions: path.resolve(__dirname, 'src/actions'),
      components: path.resolve(__dirname, 'src/components/'),
      pages: path.resolve(__dirname, 'src/pages/'),
      sources: path.resolve(__dirname, 'src/sources/'),
      stores: path.resolve(__dirname, 'src/stores/'),
      styles: path.resolve(__dirname, 'src/styles/'),
      lib: path.resolve(__dirname, 'src/lib/'),
      util: path.resolve(__dirname, 'src/lib/util.js'),
      server: path.resolve(__dirname, 'src/lib/server'),
      dingApi: path.resolve(__dirname, 'src/lib/dingApi.js'),
      'react/lib/ReactMount': 'react-dom/lib/ReactMount',
      svg: path.resolve(__dirname, 'src/images/svg/'),
      images: path.resolve(__dirname, 'src/images'),
      react: path.resolve(__dirname, 'node_modules/react/'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-redux': path.resolve(
        __dirname,
        'node_modules/react-redux/lib/index.js'
      ),
      antd: path.resolve(__dirname, 'node_modules/antd'), //快捷方式
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader',
            options: {
              modules: true,
              importLoaders: 1,
              localIdentName: '[name]_[local]_[hash:base64]',
              sourceMap: true,
              minimize: true
            }
          }]
      }
    ]
  },
}
