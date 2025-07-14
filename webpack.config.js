const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // Importez MiniCssExtractPlugin

module.exports = {
    mode: 'development',

    entry: {
        main: path.resolve(__dirname, './src/script.js'),
        walletSetup: path.resolve(__dirname, './src/walletSetup.js'),
    },

    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].bundle.js',
        publicPath: '/', // Assurez-vous que le publicPath est correct pour le chargement des ressources
        clean: true, // Nettoie le dossier dist avant chaque build
    },

    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader, // Utilisez le loader d'extraction de CSS ici
                    'css-loader'
                ],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
                type: 'asset/resource', // Gère les images et les copie dans le dossier de sortie
                generator: {
                    filename: 'img/[name][ext][query]' // Sort les images dans un sous-dossier 'img'
                }
            },
            {
                test: /\.mjs$/, // Pour les modules .mjs qui sont parfois utilisés dans node_modules
                include: /node_modules/,
                type: 'javascript/auto'
            }
        ],
    },

    plugins: [
        new CleanWebpackPlugin(), // Nettoie le dossier de sortie

        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, './src/html.html'), // Chemin vers votre fichier HTML source
            filename: 'index.html', // Nom du fichier HTML de sortie dans le dossier 'dist'
            chunks: ['main', 'walletSetup'], // Spécifie quels bundles JS injecter dans cet HTML
            // HtmlWebpackPlugin injecte les balises <script> et <link> automatiquement.
            // Cependant, nous avons ajouté la balise <link> pour le CSS manuellement dans html.html
            // pour garantir le chargement des styles.
            // inject: 'body', // Commenté car nous gérons les scripts en defer et la balise link manuellement
            // scriptLoading: 'defer', // Commenté pour la même raison
        }),

        // --- Plugins pour les polyfills Node.js ---
        // Expose 'Buffer' globalement pour les bibliothèques qui en dépendent (comme bitcoinjs-lib)
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        // Expose 'process' globalement si nécessaire par certaines bibliothèques
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),

        new MiniCssExtractPlugin({ // Instanciez le plugin pour générer le fichier CSS
            filename: '[name].bundle.css', // Le nom du fichier CSS de sortie (ex: main.bundle.css)
        }),
    ],

    resolve: {
        fallback: {
            "buffer": require.resolve("buffer/"),
            "stream": require.resolve("stream-browserify"),
            "crypto": require.resolve("crypto-browserify"),
            "util": require.resolve("util/"),
            "assert": require.resolve("assert/"),
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "os": require.resolve("os-browserify/browser"),
            "url": require.resolve("url/"),
            "process": require.resolve("process/browser"),
            "path": require.resolve("path-browserify"),
            "bip39": require.resolve("bip39"), // Ajouté pour s'assurer que bip39 est résolu correctement
        }
    }
};