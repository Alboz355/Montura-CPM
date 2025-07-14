// script.js

// Importations des bibliothèques nécessaires
import './style.css';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';
import authModule from './modules/auth';
import transactionsModule from './modules/transactions';
import notifications from './modules/notifications';
import validation from './modules/validation';
import appSettings from './modules/appSettings';

// Initialiser les modules
notifications.init();
appSettings.loadSettings();
import errorHandler from './modules/errorHandler';

// Configuration des providers avec gestion d'erreurs
let providers = {
    sepolia: null,
    polygon: null
};

try {
    providers.sepolia = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/1a4de03f9f7e4f62be8166c7a3b6d159");
    providers.polygon = new ethers.JsonRpcProvider("https://polygon-mainnet.infura.io/v3/1a4de03f9f7e4f62be8166c7a3b6d159");
} catch (error) {
    errorHandler.handleError(error, 'Configuration des providers');
    throw new Error('Impossible de configurer les providers');
}

// Déclarations des variables globales pour l'application
let app = {
    pin: '',
    currentMode: 'wallet',
    currentView: 'dashboard',
    selectedCurrency: 'CHF',
    selectedCrypto: 'BTC', // Crypto par défaut pour le TPE
    balance: {
        CHF: 25420.50, // Solde Fiat
        CHFM: 0,
        BTC: 0,
        LIGHTNING: 0,
        ETH: 0,
        USDC: 0,
        USDT: 0,
        MATIC: 0,
        SUI: 0,
        ALGO: 0,
        XRP: 0,
        BNB: 0,
        ADA: 0,
        DOT: 0,
        LINK: 0
    },
    cryptoPrices: {
        CHF: 1,
        CHFM: 1.00,
        BTC: 0,
        LIGHTNING: 0,
        ETH: 0,
        USDC: 0,
        USDT: 0,
        MATIC: 0,
        SUI: 0,
        ALGO: 0,
        XRP: 0,
        BNB: 0,
        ADA: 0,
        DOT: 0,
        LINK: 0
    },
    activities: [],
    tpeTransactions: [],
    pendingSwaps: [],
    swapsRealized: [],
    settings: {
        userName: 'Leart',
        hasWallet: false,
        pinLength: 5,
        pin: '12345', // PIN par défaut, sera mis à jour par le setup du wallet
        autoLock: true,
        notifications: true,
        darkMode: true,
        currency: 'CHF',
        language: 'fr',
        encryptedWalletData: null,
        publicAddresses: {}
    },
    activeWallets: {
        ethereum: null,
        bitcoin: null // Maintenu pour la cohérence, mais la logique de reconstruction est dans checkPin
    },
    configuredChains: []
};

// Providers Ethers.js pour les réseaux EVM
const sepoliaProvider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/1a4de03f9f7e4f62be8166c7a3b6d159");
const polygonMainnetProvider = new ethers.JsonRpcProvider("https://polygon-mainnet.infura.io/v3/1a4de03f9f7e4f62be8166c7a3b6d159");
const USD_TO_CHF_RATE = 0.89;

// Fonction pour appliquer le thème
const applyTheme = (theme) => {
    try {
        const root = document.documentElement;
        const themes = {
            dark: {
                '--bg-color': '#1a1a1a',
                '--text-color': '#ffffff',
                '--card-bg': '#2a2a2a',
                '--border-color': '#3a3a3a',
                '--hover-color': '#3a3a3a',
                '--shadow-color': 'rgba(0, 0, 0, 0.3)'
            },
            light: {
                '--bg-color': '#ffffff',
                '--text-color': '#000000',
                '--card-bg': '#f5f5f5',
                '--border-color': '#e0e0e0',
                '--hover-color': '#e8e8e8',
                '--shadow-color': 'rgba(0, 0, 0, 0.1)'
            }
        };

        const themeStyles = themes[theme] || themes.light;
        Object.entries(themeStyles).forEach(([prop, value]) => {
            root.style.setProperty(prop, value);
        });

        document.body.className = theme;
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'application du thème:', error);
        throw error;
    }
};
window.applyTheme = applyTheme;

// Fonction pour mettre à jour les paramètres TPE
const updateTPESettings = (settings) => {
    if (!settings) return;
    app.settings.tpeSettings = {
        ...app.settings.tpeSettings,
        ...settings
    };
    saveAppSettings(true);
};
window.updateTPESettings = updateTPESettings;

// Définition de loadAppSettings avant son utilisation
async function loadAppSettings() {
    try {
        console.log('Chargement des paramètres...');
        const savedSettings = localStorage.getItem('appSettings');
        let settings = savedSettings ? JSON.parse(savedSettings) : null;

        if (!settings) {
            console.log('Aucun paramètre trouvé, initialisation avec les valeurs par défaut');
            settings = {
                theme: 'light',
                language: 'fr',
                pinLength: 5,
                tpe: {
                    acceptedCryptos: [
                        { symbol: 'BTC', name: 'Bitcoin', enabled: true },
                        { symbol: 'ETH', name: 'Ethereum', enabled: true },
                        { symbol: 'XRP', name: 'Ripple', enabled: true },
                        { symbol: 'SUI', name: 'Sui', enabled: true },
                        { symbol: 'MATIC', name: 'Polygon', enabled: true },
                        { symbol: 'ARB', name: 'Arbitrum', enabled: true },
                        { symbol: 'USDC', name: 'USD Coin', enabled: true },
                        { symbol: 'USDT', name: 'Tether', enabled: true },
                        { symbol: 'CHFM', name: 'CHF Montura', enabled: true },
                        { symbol: 'ALGO', name: 'Algorand', enabled: true }
                    ],
                    autoConvert: true,
                    conversionTarget: 'CHFM',
                    convertTiming: 'endOfDay',
                    minAmount: 10,
                    maxAmount: 10000,
                    defaultCurrency: 'CHF'
                }
            };
            console.log('Paramètres par défaut initialisés:', settings);
        } else {
            console.log('Paramètres chargés depuis le stockage local');
        }

        // Fusionner avec les paramètres existants si nécessaire
        if (!app.settings) {
            app.settings = settings;
        } else {
            // Ne pas écraser les paramètres existants si le stockage local est vide
            if (savedSettings) {
                app.settings = { ...app.settings, ...settings };
            }
        }

        // Initialiser les paramètres TPE s'ils n'existent pas
        if (!app.settings.tpe) {
            app.settings.tpe = {
                acceptedCryptos: [
                    { symbol: 'BTC', name: 'Bitcoin', enabled: true },
                    { symbol: 'ETH', name: 'Ethereum', enabled: true },
                    { symbol: 'XRP', name: 'Ripple', enabled: true },
                    { symbol: 'SUI', name: 'Sui', enabled: true },
                    { symbol: 'MATIC', name: 'Polygon', enabled: true },
                    { symbol: 'ARB', name: 'Arbitrum', enabled: true },
                    { symbol: 'USDC', name: 'USD Coin', enabled: true },
                    { symbol: 'USDT', name: 'Tether', enabled: true },
                    { symbol: 'CHFM', name: 'CHF Montura', enabled: true },
                    { symbol: 'ALGO', name: 'Algorand', enabled: true }
                ],
                autoConvert: true,
                conversionTarget: 'CHFM',
                convertTiming: 'endOfDay',
                minAmount: 10,
                maxAmount: 10000,
                defaultCurrency: 'CHF'
            };
        }

        applyTheme(app.settings.theme);
        updateTPESettings();
        console.log('Paramètres chargés avec succès');
    } catch (error) {
        errorHandler.handleError(error, 'Chargement des paramètres');
        // En cas d'erreur, on garde les paramètres existants
        if (!app.settings) {
            app.settings = {
                theme: 'light',
                language: 'fr',
                pinLength: 5,
                tpe: {
                    acceptedCryptos: [
                        { symbol: 'BTC', name: 'Bitcoin', enabled: true },
                        { symbol: 'ETH', name: 'Ethereum', enabled: true },
                        { symbol: 'XRP', name: 'Ripple', enabled: true },
                        { symbol: 'SUI', name: 'Sui', enabled: true },
                        { symbol: 'MATIC', name: 'Polygon', enabled: true },
                        { symbol: 'ARB', name: 'Arbitrum', enabled: true },
                        { symbol: 'USDC', name: 'USD Coin', enabled: true },
                        { symbol: 'USDT', name: 'Tether', enabled: true },
                        { symbol: 'CHFM', name: 'CHF Montura', enabled: true },
                        { symbol: 'ALGO', name: 'Algorand', enabled: true }
                    ],
                    autoConvert: true,
                    conversionTarget: 'CHFM',
                    convertTiming: 'endOfDay',
                    minAmount: 10,
                    maxAmount: 10000,
                    defaultCurrency: 'CHF'
                }
            };
        }
    }
}

// Exporter la fonction pour qu'elle soit disponible globalement
window.loadAppSettings = loadAppSettings;

/* ----- Fonctions Globales pour Notification et Clipboard ----- */
export const showNotification = (title, message, type = 'info', options = {}) => {
    return notifications.createNotification(title, message, type, options);
};
window.showNotification = showNotification;

export const copyToClipboard = (text, successMessage = 'Copié!') => {
    navigator.clipboard.writeText(text).then(() => showNotification('Succès', successMessage, 'success'))
    .catch(err => showNotification('Erreur', 'Copie échouée.', 'error'));
};
window.copyToClipboard = copyToClipboard; // Exposer globalement


/* ----- Gestion du PIN et Authentification (Déplacé ici pour être global plus tôt) ----- */
const updatePinDots = () => {
    console.log("[script.js/updatePinDots] Mise à jour des points du PIN");
    const dotsContainer = document.getElementById('pinDotsContainer');
    if (!dotsContainer) {
        console.warn("[script.js/updatePinDots] Container des points non trouvé");
        return;
    }

    // Vider le container
    dotsContainer.innerHTML = '';
    
    // Créer les points
    for (let i = 0; i < app.settings.pinLength; i++) {
        const dot = document.createElement('div');
        dot.className = 'pin-dot' + (i < (app.pin?.length || 0) ? ' filled' : '');
        dotsContainer.appendChild(dot);
    }
};
window.updatePinDots = updatePinDots; // Exposer globalement

const addPin = async (digit) => {
    console.log("[script.js/addPin] Ajout d'un chiffre au PIN:", digit);
    if (!app.pin) app.pin = '';
    
    // Vérifier si on peut ajouter un chiffre
    if (app.pin.length < app.settings.pinLength) {
        app.pin += digit;
        console.log("[script.js/addPin] PIN actuel:", app.pin);
        
        // Mettre à jour l'affichage des points
        const dots = document.querySelectorAll('#pinDotsContainer .pin-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('filled', index < app.pin.length);
        });
        
        // Si le PIN est complet, vérifier
        if (app.pin.length === app.settings.pinLength) {
            console.log("[script.js/addPin] PIN complet, vérification...");
            await checkPin();
        }
    } else {
        console.log("[script.js/addPin] PIN déjà complet, impossible d'ajouter plus de chiffres");
    }
};
window.addPin = addPin;

const deletePin = () => {
    console.log("[script.js/deletePin] Suppression du dernier chiffre du PIN");
    if (app.pin && app.pin.length > 0) {
        app.pin = app.pin.slice(0, -1);
        console.log("[script.js/deletePin] PIN après suppression:", app.pin);
        
        // Mettre à jour l'affichage des points
        const dots = document.querySelectorAll('#pinDotsContainer .pin-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('filled', index < app.pin.length);
        });
    } else {
        console.log("[script.js/deletePin] PIN vide, rien à supprimer");
    }
};
window.deletePin = deletePin;


async function checkPin() {
    console.log("CHECKPIN: Fonction checkPin appelée.");
    console.log("CHECKPIN: PIN entré (app.pin):", app.pin);
    console.log("CHECKPIN: PIN sauvegardé (app.settings.pin):", app.settings.pin);

    if (app.pin === app.settings.pin) {
        console.log("CHECKPIN: PIN correspond ! Tentative de déchiffrement.");
        try {
            if (!app.settings.encryptedWalletData) {
                throw new Error("Aucune donnée de portefeuille chiffrée trouvée.");
            }

            const decryptedWalletData = await authModule.decryptData(app.settings.encryptedWalletData, app.pin);
            console.log("CHECKPIN: Wallet déchiffré avec succès ! Contenu partiel:", decryptedWalletData ? Object.keys(decryptedWalletData) : 'null');
            console.log("CHECKPIN: Clés privées déchiffrées (longueur):", Object.keys(decryptedWalletData.privateKeys || {}).length);


            app.activeWallets = {};
            for (const chainId of app.configuredChains) {
                    const privateKey = decryptedWalletData.privateKeys[chainId];
                console.log(`CHECKPIN: Tentative de reconstruction pour ${chainId}. Clé présente: ${!!privateKey}`);

                if (privateKey) {
                    try {
                        switch (chainId) {
                            case 'ethereum':
                            case 'arbitrum':
                            case 'optimism':
                            case 'polygon':
                            case 'base':
                            case 'avalanche':
                            case 'binance':
                                app.activeWallets[chainId] = new ethers.Wallet(privateKey);
                                console.log(`CHECKPIN: Wallet EVM (${chainId}) reconstruit. Adresse: ${app.activeWallets[chainId].address}`);
                                break;
                            case 'bitcoin':
                                if (typeof bitcoin !== 'undefined' && typeof bitcoin.ECPair !== 'undefined') {
                            app.activeWallets[chainId] = bitcoin.ECPair.fromWIF(privateKey, bitcoin.networks.bitcoin);
                                    console.log(`CHECKPIN: Wallet Bitcoin reconstruit. Adresse (WIF): ${privateKey.substring(0, 8)}...`);
                    } else {
                                    console.warn(`CHECKPIN: bitcoin.ECPair non disponible pour Bitcoin. Clé privée non chargée.`);
                                    showNotification('Avertissement', `Impossible de charger la clé Bitcoin.`, 'warning');
                                }
                                break;
                            default:
                                console.warn(`CHECKPIN: Aucune logique de reconstruction définie pour ${chainId}`);
                                break;
                    }
                } catch (e) {
                        console.error(`CHECKPIN: Échec de reconstruction du wallet pour ${chainId}:`, e);
                        showNotification('Erreur', `Échec de chargement de ${chainId}.`, 'error');
                    }
                }
            }
            console.log("CHECKPIN: Tous les wallets actifs reconstruits:", Object.keys(app.activeWallets).length);


            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'grid';

            await updateBalancesFromRealWallets();
            await loadContent();
            document.getElementById('userNameDisplay').textContent = app.settings.userName;
            showNotification('Connexion réussie', `Bienvenue, ${app.settings.userName} !`, 'success');
            await updateRealTimePrices();
            app.pin = '';

        } catch (error) {
            errorHandler.handleError(error, 'Déchiffrement du wallet');
            document.querySelectorAll('#pinDotsContainer .pin-dot').forEach(dot => dot.classList.remove('filled'));
            app.pin = '';
            showNotification('Erreur', `Code PIN incorrect ou erreur de chargement. ${error.message || ''}`, 'error');
        }
    } else {
        console.warn("CHECKPIN: PIN incorrect !");
        document.querySelectorAll('#pinDotsContainer .pin-dot').forEach(dot => dot.classList.remove('filled'));
        app.pin = '';
            showNotification('Erreur', 'Code PIN incorrect.', 'error');
    }
}

// Fonction appelée par walletSetup.js une fois le wallet multi-chaînes configuré
export const initializeMainAppWithWallet = async function(walletData, setupPassword) {
    console.log("initializeMainAppWithWallet appelée. Début de la configuration du wallet.");
    try {
        app.settings.publicAddresses = walletData.addresses;
        app.configuredChains = walletData.chains;
        app.settings.pin = setupPassword;
        console.log("INIT_MAIN_APP_DEBUG: PIN de l'application défini:", app.settings.pin);
        console.log("INIT_MAIN_APP_DEBUG: Type de app.settings.pin:", typeof app.settings.pin);

        const encryptedData = await authModule.encryptData(walletData.privateKeys, setupPassword);
        app.settings.encryptedWalletData = encryptedData;
        app.settings.hasWallet = true;
        console.log("DEBUG: app.settings.hasWallet mis à VRAI.");

        // Utiliser la fonction saveAppSettings
        saveAppSettings();
        console.log("App.settings sauvegardés dans localStorage");

        console.log("DEBUG: Attente de 2 secondes avant rechargement pour persistance localStorage...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        location.reload();

    } catch (error) {
        errorHandler.handleError(error, 'Initialisation du wallet');
        showNotification('Erreur de sécurité', `Échec du chiffrement ou de la persistance du portefeuille: ${error.message}. Veuillez réessayer.`, 'error', 10000);
        throw error;
    }
};
window.initializeMainAppWithWallet = initializeMainAppWithWallet; // Exposer globalement


/* ----- Structure de l'Application ----- */
const switchMode = (mode, event) => {
    app.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    app.currentView = mode === 'wallet' ? 'dashboard' : 'tpe-dashboard';
    loadContent();
};
window.switchMode = switchMode;


const loadContent = async (view) => {
    loadSidebar();
    await loadMainContent(view);
    updatePendingSwapsCount();
};
const loadSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    if (app.currentMode === 'wallet') {
        sidebar.innerHTML = `
            <div class="nav-section">
                <div class="nav-title">Navigation</div>
                <div class="nav-item ${app.currentView === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard')"><span class="nav-icon">📊</span><span>Dashboard</span></div>
                <div class="nav-item ${app.currentView === 'wallet' ? 'active' : ''}" onclick="navigate('wallet')"><span class="nav-icon">💰</span><span>Portefeuille</span></div>
                <div class="nav-item ${app.currentView === 'activity' ? 'active' : ''}" onclick="navigate('activity')"><span class="nav-icon">📈</span><span>Activité</span></div>
                <div class="nav-item ${app.currentView === 'staking' ? 'active' : ''}" onclick="navigate('staking')"><span class="nav-icon">💎</span><span>Staking</span></div>
                <div class="nav-item ${app.currentView === 'nft' ? 'active' : ''}" onclick="navigate('nft')"><span class="nav-icon">🎨</span><span>NFT</span></div>
                <div class="nav-item ${app.currentView === 'settings' ? 'active' : ''}" onclick="navigate('settings')"><span class="nav-icon">⚙️</span><span>Paramètres</span></div>
            </div>`;
    } else { // Mode TPE
        sidebar.innerHTML = `
            <div class="nav-section">
                <div class="nav-title">Mode TPE</div>
                <div class="nav-item ${app.currentView === 'tpe-dashboard' ? 'active' : ''}" onclick="navigate('tpe-dashboard')"><span class="nav-icon">💳</span><span>Terminal</span></div>
                <div class="nav-item ${app.currentView === 'tpe-transactions' ? 'active' : ''}" onclick="navigate('tpe-transactions')"><span class="nav-icon">📋</span><span>Transactions</span></div>
                <div class="nav-item ${app.currentView === 'tpe-swap' ? 'active' : ''}" onclick="navigate('tpe-swap')"><span class="nav-icon">🔄</span><span>Swap Manuel</span></div>
                <div class="nav-item ${app.currentView === 'pending-swaps' ? 'active' : ''}" onclick="navigate('pending-swaps')">
                    <span class="nav-icon">⏳</span><span>Swaps en attente</span>
                    ${app.pendingSwaps.length > 0 ? `<span class="nav-badge">${app.pendingSwaps.length}</span>` : ''}
                </div>
                <div class="nav-item ${app.currentView === 'swaps-realized' ? 'active' : ''}" onclick="navigate('swaps-realized')"><span class="nav-icon">✅</span><span>Swaps réalisés</span></div>
                <div class="nav-item ${app.currentView === 'tpe-reports' ? 'active' : ''}" onclick="navigate('tpe-reports')"><span class="nav-icon">📊</span><span>Rapports</span></div>
                <div class="nav-item ${app.currentView === 'tpe-settings' ? 'active' : ''}" onclick="navigate('tpe-settings')"><span class="nav-icon">⚙️</span><span>Paramètres TPE</span></div>
            </div>`;
    }
};
const updatePendingSwapsCount = () => {
    const badge = document.querySelector('.nav-item[onclick="navigate(\'pending-swaps\')"] .nav-badge');
    if (badge) {
        if (app.pendingSwaps.length > 0) {
            badge.textContent = app.pendingSwaps.length;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    } else if (app.pendingSwaps.length > 0 && app.currentMode === 'tpe') {
        loadSidebar();
    }
};
const loadMainContent = async (view) => {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    const targetView = view || app.currentView;
    mainContent.style.opacity = 0;
    await new Promise(resolve => setTimeout(resolve, 100));

    switch(targetView) {
        case 'dashboard': mainContent.innerHTML = await generateDashboard(); break;
        case 'wallet': mainContent.innerHTML = generateWallet(); break;
        case 'activity': mainContent.innerHTML = generateActivity(); break;
        case 'settings': mainContent.innerHTML = generateSettings(); break;
        case 'tpe-dashboard': mainContent.innerHTML = generateTPEDashboard(); setupTPEEventListeners(); break;
        case 'tpe-transactions': mainContent.innerHTML = generateTPETransactions(); break;
        case 'tpe-swap': mainContent.innerHTML = generateSwapInterface(); setupSwapEventListeners(); break;
        case 'pending-swaps': mainContent.innerHTML = generatePendingSwaps(); break;
        case 'swaps-realized': mainContent.innerHTML = generateSwapsRealized(); break;
        case 'tpe-reports':
            mainContent.innerHTML = generateTPEReports();
            if (typeof flatpickr !== 'undefined') {
                initializeFlatpickrCalendar();
                displayReportForDate(new Date());
            } else {
                console.warn("Flatpickr non chargé. Le calendrier des rapports ne fonctionnera pas.");
            }
            break;
        case 'nft': mainContent.innerHTML = generateNFTGallery(); break;
        case 'staking': mainContent.innerHTML = generateStaking(); break;
        default: mainContent.innerHTML = `<h1 class="page-title">Vue non trouvée: ${targetView}</h1>`;
    }
    mainContent.style.opacity = 1;
};
const navigate = (view) => {
    app.currentView = view;
    loadContent();
};
window.navigate = navigate;

/* ----- Dashboard ----- */
const generateDashboard = async () => {
const generateCryptoCards = () => {
    const cryptosForDisplay = [
            {symbol: 'CHFM', name: 'CHF Stablecoin', color: '#e60000'},
        {symbol: 'BTC', name: 'Bitcoin', color: '#f7931a'},
        {symbol: 'ETH', name: 'Ethereum', color: '#627eea'},
            {symbol: 'XRP', name: 'Ripple', color: '#00AAE4'},
        {symbol: 'MATIC', name: 'Polygon', color: '#8247e5'},
        {symbol: 'SUI', name: 'Sui Network', color: '#4da6ff'},
            {symbol: 'ALGO', name: 'Algorand', color: '#000000'},
            {symbol: 'USDC', name: 'USD Coin', color: '#2775ca'},
            {symbol: 'USDT', name: 'Tether', color: '#26a17b'},
            {symbol: 'LIGHTNING', name: 'Lightning (BTC)', color: '#f7931a'},
        {symbol: 'BNB', name: 'Binance Coin', color: '#f3ba2f'},
        {symbol: 'ADA', name: 'Cardano', color: '#0033ad'},
        {symbol: 'DOT', name: 'Polkadot', color: '#e6007a'},
        {symbol: 'LINK', name: 'Chainlink', color: '#2A5ADA'}
    ];

    const symbolsWithImageIcons = ['ETH', 'MATIC', 'BTC', 'LINK', 'ADA', 'SUI', 'USDT', 'USDC', 'XRP'];
        const alwaysVisibleCryptos = ['BTC', 'ETH', 'XRP', 'MATIC', 'SUI', 'ALGO', 'USDC', 'USDT', 'CHFM'];
        
        const visibleCryptos = cryptosForDisplay.filter(crypto => {
            const isChainConfigured = window.SUPPORTED_BLOCKCHAINS.some(b => b.id === crypto.symbol.toLowerCase() && app.configuredChains.includes(b.id));
            const isFiatOrStablecoin = ['CHF', 'CHFM', 'USDC', 'USDT'].includes(crypto.symbol);
            const isLightningLinkedToBTC = crypto.symbol === 'LIGHTNING' && app.configuredChains.includes('bitcoin');
            const isAlwaysVisible = alwaysVisibleCryptos.includes(crypto.symbol);
            return isChainConfigured || isFiatOrStablecoin || isLightningLinkedToBTC || isAlwaysVisible;
        });

        return visibleCryptos.map(crypto => {
            const balance = crypto.symbol === 'LIGHTNING' ? app.balance.LIGHTNING : app.balance[crypto.symbol] || 0;
            const price = crypto.symbol === 'MATIC' ? app.cryptoPrices.MATIC : app.cryptoPrices[crypto.symbol] || 0;
        const value = balance * price;
        const change = (Math.random() - 0.45) * 10;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        const hasDedicatedImage = symbolsWithImageIcons.includes(crypto.symbol);
            const iconContent = hasDedicatedImage ? '' : (crypto.symbol === 'LIGHTNING' ? '⚡' : crypto.symbol.charAt(0));
            const inlineStyle = hasDedicatedImage ? '' : `background: ${crypto.color || '#667eea'}; color: white;`;
            
            return `<div class="crypto-card" onclick="openCryptoDetails('${crypto.symbol}')">
                <div class="crypto-header">
                    <div class="crypto-icon ${crypto.symbol}" style="${inlineStyle}">${iconContent}</div>
                    <div class="crypto-info">
                        <div class="crypto-name">${crypto.name}</div>
                        <div class="crypto-symbol">${crypto.symbol}</div>
                    </div>
                </div>
                <div class="crypto-stats">
                    <div>
                        <div class="crypto-balance">${balance.toFixed(balance > 0 && balance < 0.0001 ? 8 : 4)}</div>
                        <div class="crypto-value">${formatCurrency(value, 'CHF')}</div>
                    </div>
                    <div class="crypto-change">
                        <div class="change-percent ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</div>
                        <div class="crypto-value">@ ${formatCurrency(price, 'CHF')}</div>
                    </div>
                </div>
            </div>`;
    }).join('');
};

    return `
        <div class="dashboard-header">
            <h1 class="page-title">Tableau de Bord</h1>
                </div>
        <div class="crypto-grid" id="cryptoGrid">
            ${generateCryptoCards()}
                </div>
        <div class="activity-section">
            <h2>Activité Récente</h2>
            <div class="activity-list">
                ${app.activities.length > 0 ? app.activities.slice(0,5).map(activity => generateActivityItem(activity)).join('') : '<p style="text-align:center;padding:20px;color:#8e8e93;">Aucune activité récente.</p>'}
                </div>
        </div>`;
};

    const generateDetailedCryptoCards = () => {
        const allCryptoSymbols = Object.keys(app.balance).filter(key => key !== 'CHF');
        const symbolsWithImageIcons = ['ETH', 'POLYGON', 'BTC', 'LINK', 'ADA', 'SUI', 'USDT', 'USDC', 'XRP'];
        const cryptoColors = { CHFM: '#e60000', BTC: '#f7931a', LIGHTNING: '#f7931a', ETH: '#627eea', USDC: '#2775ca', USDT: '#26a17b', POLYGON: '#8247e5', SUI: '#4da6ff', ALGORAND: '#000000', XRP: '#00AAE4', BNB: '#f3ba2f', ADA: '#0033ad', DOT: '#e6007a', MATIC: '#8247e5', LINK: '#2A5ADA'};
        return allCryptoSymbols.map(symbol => {
            const isChainConfigured = window.SUPPORTED_BLOCKCHAINS.some(b => b.id === symbol.toLowerCase() && app.configuredChains.includes(b.id));
            const isFiatOrStablecoin = (symbol === 'CHFM' || symbol === 'USDC' || symbol === 'USDT');
            const isLightningLinkedToBTC = (symbol === 'LIGHTNING' && app.configuredChains.includes('bitcoin'));

            if (!isChainConfigured && !isFiatOrStablecoin && !isLightningLinkedToBTC) {
                return '';
            }

            const balance = app.balance[symbol] || 0;
            let price = (symbol === 'POLYGON' || symbol === 'MATIC') ? app.cryptoPrices.POLYGON : app.cryptoPrices[symbol] || 0;
            const value = balance * price;
            const change = (Math.random() - 0.45) * 10;
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const hasDedicatedImage = symbolsWithImageIcons.includes(symbol);
            const iconContent = hasDedicatedImage ? '' : (symbol === 'LIGHTNING' ? '⚡' : symbol.charAt(0));
            const inlineStyle = hasDedicatedImage ? '' : `background: ${cryptoColors[symbol] || '#333'}; color: white;`;
            let displayName = symbol;
            if (symbol === 'POLYGON') displayName = 'Polygon (MATIC natif)';
            else if (symbol === 'LIGHTNING') displayName = 'Lightning (BTC)';
            return `<div class="crypto-card" onclick="openCryptoDetails('${symbol}')"><div class="crypto-header"><div class="crypto-icon ${symbol}" style="${inlineStyle}">${iconContent}</div><div class="crypto-info"><div class="crypto-name">${displayName}</div><div class="crypto-symbol">${balance.toFixed(balance > 0 && balance < 0.0001 ? 8 : 4)} ${symbol}</div></div></div><div class="crypto-stats"><div><div class="crypto-balance">${formatCurrency(value, 'CHF')}</div><div class="crypto-value">Valeur en CHF</div></div><div class="crypto-change"><div class="change-percent ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</div><div class="crypto-value">@ ${formatCurrency(price, 'CHF')}</div></div></div></div>`;
        }).join('');
    };

    const generateWallet = () => {
        return `<div class="dashboard-header"><h1 class="page-title">Portefeuille Détaillé</h1></div><div class="crypto-grid" id="cryptoGridWallet">${generateDetailedCryptoCards()}</div>`;
    };

    const generateActivityItem = (activity) => {
        const formattedValue = activity.value ? (typeof activity.value === 'number' ? formatCurrency(activity.value) : activity.value) : '';
        const statusColor = activity.status === 'pending' ? '#ff9500' : activity.status === 'failed' || activity.status === 'failed_submission' ? '#ff3b30' : '#34c759';
    return `
            <div class="activity-item" onclick="showActivityDetails('${activity.id}')">
                <div class="activity-icon ${activity.type.toLowerCase()}">${activity.type === 'received' ? '📥' : activity.type === 'sent' ? '📤' : activity.type === 'swap' || activity.type === 'swap_intent' ? '🔄' : activity.type === 'buy' ? '💳' : activity.type === 'sell' ? '💰' : activity.type === 'tpe_payment_initiated' ? '🛍️' : activity.type === 'staking_initiated' ? '💎' : '✅'}</div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-subtitle">${new Date(activity.timestamp).toLocaleString('fr-CH')} - ${activity.subtitle}</div>
            </div>
                <div class="activity-amount">
                    <div class="activity-crypto ${activity.amount?.startsWith('+') ? 'positive' : activity.amount?.startsWith('-') ? 'negative' : ''}">${activity.amount}</div>
                    <div class="activity-value" style="color:${activity.status ? statusColor : '#8e8e93'}">${formattedValue} ${activity.status && activity.status !== 'confirmed' && activity.status !== 'completed' ? `(${activity.status})`: ''}</div>
            </div>
        </div>`;
};
    const generateActivity = () => {
        const sortedActivities = [...app.activities].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return `
            <div class="dashboard-header"><h1 class="page-title">Historique des Activités</h1></div>
            <div class="activity-list">
                ${sortedActivities.length === 0 ? '<p style="text-align:center;color:#8e8e93;padding:40px;">Aucune activité enregistrée</p>' : sortedActivities.map(activity => generateActivityItem(activity)).join('')}
        </div>`;
};

    const generateSettings = () => {
    return `
            <div class="dashboard-header"><h1 class="page-title">Paramètres</h1></div>
            <div style="max-width:800px;margin:0 auto;">
                <div class="invoice-section" style="margin-bottom:20px;padding:30px;"><h3 style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);">Sécurité</h3><div class="setting-item"><span>Changer le code PIN</span><button class="action-btn" onclick="openChangePinModal()">Modifier</button></div><div class="setting-item"><span>Verrouillage auto (Démo)</span><div class="toggle-switch ${app.settings.autoLock ? 'active' : ''}" onclick="toggleSetting(this, 'autoLock', 'Verrouillage auto')"></div></div><div class="setting-item"><span>Afficher phrase récupération</span><button class="action-btn" onclick="showCurrentWalletMnemonic()">Afficher</button></div></div>
                <div class="invoice-section" style="margin-bottom:20px;padding:30px;"><h3 style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);">Notifications</h3><div class="setting-item"><span>Notifications push (Démo)</span><div class="toggle-switch ${app.settings.notifications ? 'active' : ''}" onclick="toggleSetting(this, 'notifications', 'Notifications push')"></div></div></div>
                <div class="invoice-section" style="padding:30px;"><h3 style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);">Préférences</h3><div class="setting-item"><span>Nom d'utilisateur</span><input type="text" id="settingsUserName" class="input-field" value="${app.settings.userName}" style="width:auto;max-width:200px;text-align:right;padding:10px;"></div><div class="setting-item"><span>Devise par défaut</span><select class="input-field" style="width:auto;max-width:150px;padding:10px;"><option value="CHF" ${app.settings.currency === 'CHF' ? 'selected' : ''}>CHF</option><option value="EUR" ${app.settings.currency === 'EUR' ? 'selected' : ''}>EUR</option><option value="USD" ${app.settings.currency === 'USD' ? 'selected' : ''}>USD</option></select></div><div class="setting-item"><span>Mode sombre</span><div class="toggle-switch ${app.settings.darkMode ? 'active' : ''}" onclick="toggleSetting(this, 'darkMode', 'Mode sombre')"></div></div><div class="setting-item"><span>Version</span><span style="color:#8e8e93;">v1.2.0-multichain-secure</span></div><button class="submit-btn" style="margin-top:30px;" onclick="saveAppSettings()">Sauvegarder</button></div>
            </div>`;
    };


    /* ----- Transactions Réelles (Envoi/Réception) & Modals ----- */
    const updateBalancesFromRealWallets = async () => {
        if (app.settings.publicAddresses) {
            if (app.settings.publicAddresses.ethereum) {
                try {
                    const ethAddress = app.settings.publicAddresses.ethereum;
                    const balanceWeiEth = await sepoliaProvider.getBalance(ethAddress);
                    app.balance.ETH = parseFloat(ethers.formatEther(balanceWeiEth));
                    console.log(`Solde réel ETH (Sepolia) mis à jour: ${app.balance.ETH}`);
                } catch (error) {
                    errorHandler.handleError(error, 'Récupération du solde ETH');
                }
            }

            if (app.settings.publicAddresses.polygon) {
                try {
                    const polygonAddress = app.settings.publicAddresses.polygon;
                    const balanceWeiPolygon = await polygonMainnetProvider.getBalance(polygonAddress);
                    app.balance.POLYGON = parseFloat(ethers.formatEther(balanceWeiPolygon));
                    console.log(`Solde réel MATIC (Polygon) mis à jour: ${app.balance.POLYGON}`);
                } catch (error) {
                    errorHandler.handleError(error, 'Récupération du solde MATIC');
                }
            }
            if (app.settings.publicAddresses.bitcoin) {
                console.log("Solde BTC est encore simulé pour l'adresse:", app.settings.publicAddresses.bitcoin);
            }
        }
    };


    const openReceiveModal = () => {
    let receiveAddressHtml = '';

        if (app.settings.publicAddresses && Object.keys(app.settings.publicAddresses).length > 0) {
            for (const chainId of app.configuredChains) {
            const address = app.settings.publicAddresses[chainId];
            if (address) {
                    const blockchainName = window.SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId)?.name || chainId;
                    const blockchainSymbol = window.SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId)?.symbol || chainId.toUpperCase();
                    const icon = window.SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId)?.icon || '❓';

                receiveAddressHtml += `
                    <div class="form-group" style="margin-top:20px;">
                            <label class="form-label">${icon} Adresse ${blockchainName}</label>
                        <div class="input-field" style="font-size:14px; word-break: break-all;">${address}</div>
                        <button class="action-btn" style="padding:8px 15px; font-size:14px; margin-top:10px;" onclick="copyToClipboard('${address}', 'Adresse ${blockchainName} copiée!')">Copier Adresse</button>
                            <div id="qrCode-${chainId}" style="margin-top:15px; text-align:center;"></div>
                    </div>`;

                setTimeout(() => {
                        const qrElement = document.getElementById(`qrCode-${chainId}`);
                    if (qrElement && typeof QRCode !== 'undefined') {
                        qrElement.innerHTML = '';
                        new QRCode(qrElement, {
                                text: address,
                                width: 128,
                                height: 128,
                                colorDark : "#000000",
                                colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.H
                        });
                            qrElement.style.background = 'white';
                            qrElement.style.padding = '10px';
                            qrElement.style.borderRadius = '10px';
                            qrElement.style.maxWidth = '148px';
                            qrElement.style.margin = '15px auto 0';
                        } else if (!qrElement) {
                             console.error(`QR code element for ${chainId} not found.`);
                        } else {
                             console.warn("QRCode library is not defined. Cannot generate QR code.");
                    }
                }, 50);
            }
        }
    } else {
            receiveAddressHtml = '<p style="text-align:center;color:#ffcc00;font-size:14px;">Aucun wallet configuré ou adresses disponibles.</p>';
    }

    const content = `
        <p style="text-align:center;">Scannez le QR code ou copiez l'adresse pour recevoir des fonds.</p>
        ${receiveAddressHtml}
    `;
        openModal('Recevoir des Cryptos', content, 'modal-receive-multi');
};
window.openReceiveModal = openReceiveModal;

    const openSendModal = () => {
        if (Object.keys(app.activeWallets).length === 0) {
            showNotification('Accès refusé', 'Veuillez vous connecter pour envoyer des cryptos.', 'error');
        return;
    }

        const sendableCryptos = [];
        for (const chainId in app.activeWallets) {
            if (app.activeWallets[chainId]) {
                const symbol = window.SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId)?.symbol || chainId.toUpperCase();
                if (app.balance[symbol] > 0 || app.balance[symbol] === 0) {
                    sendableCryptos.push(symbol);
                }
            }
        }
        if (!sendableCryptos.includes('CHFM') && app.balance.CHFM > 0) sendableCryptos.push('CHFM');
        if (!sendableCryptos.includes('USDC') && app.balance.USDC > 0) sendableCryptos.push('USDC');
        if (!sendableCryptos.includes('USDT') && app.balance.USDT > 0) sendableCryptos.push('USDT');
        if (sendableCryptos.includes('BTC') && !sendableCryptos.includes('LIGHTNING')) sendableCryptos.push('LIGHTNING');


        let cryptoOptions = sendableCryptos.map(c => `<option value="${c}">${c} - ${app.balance[c]?.toFixed(6) || '0.00'}</option>`).join('');

    if (cryptoOptions.length === 0) {
            cryptoOptions = '<option disabled selected>Aucune crypto envoyable</option>';
    }

    const content = `
            <div class="form-group"><label class="form-label" for="sendCryptoSelect">Crypto à envoyer</label><select class="input-field" id="sendCryptoSelect">${cryptoOptions}</select></div>
            <div class="form-group"><label class="form-label" for="sendAddressInput">Adresse du destinataire</label><input type="text" class="input-field" id="sendAddressInput" placeholder="Adresse du destinataire" required></div>
            <div class="form-group"><label class="form-label" for="sendAmountInput">Montant</label><input type="number" class="input-field" id="sendAmountInput" placeholder="0.000000" step="any" required><small id="sendMaxValue" style="color:#8e8e93;margin-top:5px;display:block;"></small></div>
            <p style="color:#ffcc00;font-size:14px;">Note: Seul l'envoi ETH/Polygon est fonctionnel en l'état actuel. Les autres sont simulés pour l'interface.</p>
            <button class="submit-btn" onclick="sendCrypto()" ${cryptoOptions.includes('disabled') ? 'disabled' : ''}>Envoyer</button>`;
    openModal('Envoyer des Cryptos', content);
    const sel = document.getElementById('sendCryptoSelect');
        if(sel) {
            sel.onchange = () => {
        const s = sel.value;
                if(s && app.balance[s]) document.getElementById('sendMaxValue').textContent = `Max: ${app.balance[s].toFixed(8)} ${s}`;
                else document.getElementById('sendMaxValue').textContent = '';
            };
            if(sel.value) sel.onchange();
    }
};
window.openSendModal = openSendModal;

    const sendCrypto = async () => {
        const selectedCrypto = document.getElementById('sendCryptoSelect').value;
        const recipientAddress = document.getElementById('sendAddressInput').value.trim();
        const amount = parseFloat(document.getElementById('sendAmountInput').value);

        if (!selectedCrypto || !recipientAddress || isNaN(amount) || amount <= 0) {
            showNotification('Erreur', 'Veuillez remplir tous les champs correctement.', 'error');
        return;
    }

        if (app.balance[selectedCrypto] < amount) {
            showNotification('Erreur', `Solde insuffisant pour ${selectedCrypto}.`, 'error');
            return;
        }

        showNotification('Envoi en cours', `Envoi de ${amount} ${selectedCrypto} à ${recipientAddress}...`, 'info');
        closeModal();

        const chainId = window.SUPPORTED_BLOCKCHAINS.find(b => b.symbol === selectedCrypto)?.id;

        if (chainId && app.activeWallets[chainId] && ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'binance'].includes(chainId)) {
            const wallet = app.activeWallets[chainId];
            let provider;
            if (chainId === 'ethereum') provider = sepoliaProvider;
            else if (chainId === 'polygon') provider = polygonMainnetProvider;

            if (!provider) {
                showNotification('Erreur', `Provider non configuré pour ${selectedCrypto}.`, 'error');
                return;
            }

            try {
                const connectedWallet = wallet.connect(provider);
                const tx = {
                    to: recipientAddress,
                    value: ethers.parseEther(amount.toString())
                };
                console.log(`Tentative d'envoi de ${amount} ${selectedCrypto} de ${connectedWallet.address} vers ${recipientAddress}`);
                const transactionResponse = await connectedWallet.sendTransaction(tx);
                console.log('Transaction soumise:', transactionResponse.hash);

                addActivity({
                    type: 'sent',
                    title: `Envoi de ${selectedCrypto}`,
                    subtitle: `Vers: ${recipientAddress.substring(0, 8)}... - Tx: ${transactionResponse.hash.substring(0, 8)}...`,
                    amount: `-${amount} ${selectedCrypto}`,
                    value: 0,
                    status: 'pending_blockchain_confirmation',
                    txHash: transactionResponse.hash
                });
                showNotification('Succès', `Transaction ${selectedCrypto} soumise! ID: ${transactionResponse.hash.substring(0, 10)}...`, 'success');

                const receipt = await transactionResponse.wait();
                if (receipt.status === 1) {
                    showNotification('Confirmation', `Transaction ${selectedCrypto} confirmée!`, 'success');
                    app.balance[selectedCrypto] -= amount;
                    updateTotalBalanceAndRefreshView();
                    const activityIndex = app.activities.findIndex(a => a.txHash === transactionResponse.hash);
                    if (activityIndex !== -1) {
                        app.activities[activityIndex].status = 'confirmed';
                        app.activities[activityIndex].value = amount * app.cryptoPrices[selectedCrypto];
                    }
                    } else {
                    showNotification('Échec', `Transaction ${selectedCrypto} échouée!`, 'error');
                    const activityIndex = app.activities.findIndex(a => a.txHash === transactionResponse.hash);
                    if (activityIndex !== -1) app.activities[activityIndex].status = 'failed';
                }

            } catch (error) {
                errorHandler.handleError(error, 'Envoi de crypto');
                console.error(`Erreur d'envoi ${selectedCrypto}:`, error);
                showNotification('Erreur', `Échec de l'envoi de ${selectedCrypto}: ${error.message || error}`, 'error');
                addActivity({
                    type: 'sent',
                    title: `Échec envoi ${selectedCrypto}`,
                    subtitle: `Vers: ${recipientAddress.substring(0, 8)}...`,
                    amount: `-${amount} ${selectedCrypto}`,
                    value: 0,
                    status: 'failed_submission',
                    error: error.message
                });
            }
        }
        else if (selectedCrypto === 'BTC' && app.activeWallets.bitcoin) {
            console.log(`Simulation d'envoi de ${amount} BTC à ${recipientAddress}`);
            showNotification('Envoi BTC (Simulation)', `Envoi de ${amount} BTC simulé. Pas de transaction réelle.`, 'info');

            app.balance.BTC -= amount;
            updateTotalBalanceAndRefreshView();

            addActivity({
                type: 'sent',
                title: `Envoi de Bitcoin (Simulé)`,
                subtitle: `Vers: ${recipientAddress.substring(0, 8)}...`,
                amount: `-${amount} BTC`,
                value: amount * app.cryptoPrices.BTC,
                status: 'completed',
            });
        }
        else {
            showNotification('Envoi (Simulation)', `Envoi de ${amount} ${selectedCrypto} à ${recipientAddress} simulé.`, 'info');
            app.balance[selectedCrypto] -= amount;
            updateTotalBalanceAndRefreshView();
            addActivity({
                type: 'sent',
                title: `Envoi de ${selectedCrypto} (Simulé)`,
                subtitle: `Vers: ${recipientAddress.substring(0, 8)}...`,
                amount: `-${amount} ${selectedCrypto}`,
                value: amount * (app.cryptoPrices[selectedCrypto] || 0),
                status: 'completed',
            });
        }
    };
    window.sendCrypto = sendCrypto;

    const openBuyModal = () => { openMtpIframeModal('buy'); };
window.openBuyModal = openBuyModal;
    const openSellModal = () => { openMtpIframeModal('sell'); };
window.openSellModal = openSellModal;

    const openMtpIframeModal = (serviceType) => {
        let userAddress = '';
        if (app.settings.publicAddresses && app.settings.publicAddresses.ethereum) {
            userAddress = app.settings.publicAddresses.ethereum;
        } else if (app.configuredChains.length > 0 && app.settings.publicAddresses[app.configuredChains[0]]) {
            userAddress = app.settings.publicAddresses[app.configuredChains[0]];
        }

        const title = serviceType === 'buy' ? 'Acheter des cryptos via Mt Pelerin' : 'Vendre des cryptos via Mt Pelerin';
        let iframeSrc = `https://widget.mtpelerin.com/?_ctkn=bec6626e-8913-497d-9835-6e6ae9edb144&lang=fr&mode=dark&tab=${serviceType}&net=ethereum&addr=${userAddress}&ctry=CH`;
        const content = `<iframe allow="usb; ethereum; clipboard-write; payment; microphone; camera" loading="lazy" src="${iframeSrc}" title="Mt Pelerin exchange widget" style="width:100%;height:600px;border:none;background:transparent;display:block;"></iframe><p style="text-align:center;font-size:14px;color:#8e8e93;margin-top:20px;">Service fourni par Mt Pelerin.</p>`;
        openModal(title, content, 'modal-mtpelerin');
    };


    /* ----- TPE (Terminal de Paiement Électronique) ----- */
    const generateTPEDashboard = () => {
        const tpeSupportedCryptos = [
            'BTC', 'ETH', 'XRP', 'MATIC', 'SUI', 'ALGO', 'USDC', 'USDT', 'CHFM'
        ];

        return `<div class="dashboard-header"><h1 class="page-title">Terminal de Paiement</h1></div>
            <div class="tpe-dashboard">
                <div class="invoice-section">
                    <h2 style="margin-bottom:20px;">Créer une Demande</h2>
                    <div class="form-group">
                        <label class="form-label" for="invoiceAmount">Montant</label>
                        <input type="number" id="invoiceAmount" class="input-field" placeholder="0.00" style="font-size:28px;text-align:center;padding:15px;">
                        </div>
                    <div class="form-group">
                        <label class="form-label">Devise</label>
                        <div class="currency-tabs" id="tpeInvoiceCurrency">
                            <div class="currency-tab ${app.selectedCurrency==='CHF'?'active':''}" onclick="selectTPECurrency('CHF',this)">CHF</div>
                            <div class="currency-tab ${app.selectedCurrency==='EUR'?'active':''}" onclick="selectTPECurrency('EUR',this)">EUR</div>
                            <div class="currency-tab ${app.selectedCurrency==='USD'?'active':''}" onclick="selectTPECurrency('USD',this)">USD</div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Crypto acceptée</label>
                        <div class="crypto-selector" id="tpePaymentCrypto">
                            ${tpeSupportedCryptos.map(c => `
                                <div class="crypto-option ${app.selectedCrypto===c?'active':''}" onclick="selectTPEPaymentCrypto('${c}',this)">${c}</div>
                            `).join('')}
                </div>
            </div>
                    <div class="conversion-settings">
                    <div class="setting-item">
                            <span>Conversion auto. en CHFM</span>
                            <div class="toggle-switch ${app.autoConvert?'active':''}" onclick="toggleAutoConvert(this)"></div>
                        </div>
                        ${app.autoConvert ? `
                            <div style="margin-top:20px;" id="convertTimingOptions">
                                <label class="form-label">Moment</label>
                                <div class="conversion-option ${app.convertTiming==='immediate'?'active':''}" onclick="setConvertTiming('immediate',this)">
                                    <div class="conversion-radio"></div>
                                    <div>Immédiat</div>
                    </div>
                                <div class="conversion-option ${app.convertTiming==='endOfDay'?'active':''}" onclick="setConvertTiming('endOfDay',this)">
                                    <div class="conversion-radio"></div>
                                    <div>Fin de journée</div>
                </div>
            </div>
                        ` : ''}
                        </div>
            </div>
        </div>`;
};

    const generateTPEReports = () => {
        return `
            <div class="dashboard-header">
                <h1 class="page-title">Rapports TPE</h1>
                </div>
            <div class="invoice-section" style="margin-bottom:30px;">
                <h2 style="margin-bottom:20px;">Sélectionner une Date</h2>
                <input type="text" id="reportCalendarInput" class="input-field" placeholder="Sélectionnez une date..." style="width:100%; max-width:300px; margin:0 auto; display:block; text-align:center;">
            </div>

            <div class="invoice-section">
                <h2 style="margin-bottom:20px;" id="reportDateTitle">Rapport</h2>
                <div style="display:flex; justify-content:space-around; margin-bottom:20px;">
                    <div style="text-align:center;">
                        <div style="font-size:32px; font-weight:700;" id="totalAmountForDay">0.00 CHF</div>
                        <div style="color:#8e8e93; font-size:14px;">Total des ventes</div>
                </div>
                    <div style="text-align:center;">
                        <div style="font-size:32px; font-weight:700;" id="transactionCountForDay">0</div>
                        <div style="color:#8e8e93; font-size:14px;">Transactions</div>
                </div>
                            </div>
                <ul id="transactionsListForDay" style="list-style:none; padding:0; margin:0;"></ul>
                <p id="noTransactionsMessage" style="text-align:center;color:#8e8e93;padding:20px;">Aucune transaction pour cette date.</p>
                        </div>
        `;
    };
    const isSameDay = (d1, d2) => { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); };
    const initializeFlatpickrCalendar = () => {
        const calendarInput = document.getElementById('reportCalendarInput');
        if (calendarInput && typeof flatpickr !== 'undefined') {
            flatpickr(calendarInput, {
                dateFormat: "Y-m-d", inline: false, monthSelectorType: 'static',
                locale: { firstDayOfWeek: 1, weekdays: {shorthand:["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],longhand:["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"]}, months: {shorthand:["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"],longhand:["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]}},
                onChange: function(selectedDates, dateStr, instance) { if (selectedDates.length > 0 && selectedDates[0] instanceof Date) displayReportForDate(selectedDates[0]); },
                onDayCreate: function(dObj, dateStr, flatpickrInstance, dayHtmlElement) {
                    if (!(dObj instanceof Date) || isNaN(dObj.getTime())) return;
                    const transactionsForDay = getTpeTransactionsForDate(dObj);
                    if (transactionsForDay && transactionsForDay.length > 0) dayHtmlElement.classList.add("has-transactions-flatpickr");
                }
            });
        } else if (!calendarInput) {
            console.error("Calendar input element not found.");
        } else {
            console.warn("Flatpickr library is not defined. Cannot initialize calendar.");
        }
    };
    const getTpeTransactionsForDate = (selectedDate) => {
        if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) { console.error("getTpeTransactionsForDate: selectedDate invalide:", selectedDate); return []; }
        if (!app.tpeTransactions || app.tpeTransactions.length === 0) return [];
        return app.tpeTransactions.filter(tx => {
            const txDate = (tx.date instanceof Date && !isNaN(tx.date.getTime())) ? tx.date : new Date(tx.date);
            if (isNaN(txDate.getTime())) return false;
            return txDate.getFullYear()===selectedDate.getFullYear() && txDate.getMonth()===selectedDate.getMonth() && txDate.getDate()===selectedDate.getDate() && (tx.status==='completed'||tx.status==='pending_blockchain_confirmation');
        });
    };
    const displayReportForDate = (date) => {
        const reportDateTitle=document.getElementById('reportDateTitle'), totalAmountForDayDisplay=document.getElementById('totalAmountForDay'), transactionCountForDayDisplay=document.getElementById('transactionCountForDay'), transactionsListForDayUl=document.getElementById('transactionsListForDay'), noTransactionsMessage=document.getElementById('noTransactionsMessage');
        if(!reportDateTitle||!totalAmountForDayDisplay||!transactionCountForDayDisplay||!transactionsListForDayUl||!noTransactionsMessage)return;
        reportDateTitle.textContent=`Rapport du ${date.toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`;
        const transactions=getTpeTransactionsForDate(date); transactionsListForDayUl.innerHTML='';
        if(transactions.length===0){totalAmountForDayDisplay.textContent=formatCurrency(0,app.settings.currency);transactionCountForDayDisplay.textContent='0';transactionsListForDayUl.style.display='none';noTransactionsMessage.style.display='block';}
        else{transactionsListForDayUl.style.display='block';noTransactionsMessage.style.display='none';let totalAmount=0;
            transactions.forEach(tx=>{totalAmount+=parseFloat(tx.amount)||0;const li=document.createElement('li');li.style.cssText="padding:12px 8px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;font-size:14px;";const d=(tx.date instanceof Date&&!isNaN(tx.date.getTime()))?tx.date:new Date(tx.date);const t=!isNaN(d.getTime())?d.toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'}):'N/A';let pD=`(${tx.cryptoAmount.toFixed(4)} ${tx.crypto})`;if(tx.crypto==='CHFM'&&tx.cryptoAmount.toFixed(2)===tx.amount.toFixed(2))pD=`(en ${tx.crypto})`;li.innerHTML=`<div style="flex-grow:1;"><span style="color:#bbb;margin-right:15px;font-size:13px;">${t}</span><span style="color:#ddd;">ID: ${tx.id.substring(0,12)}...</span><small style="color:#999;display:block;font-size:12px;">Payé ${pD} - Statut: ${tx.status.replace('_',' ')}</small></div><strong style="color:#fff;font-size:15px;">${formatCurrency(totalAmount,tx.currency)}</strong>`;transactionsListForDayUl.appendChild(li);});
            if(transactionsListForDayUl.lastChild)transactionsListForDayUl.lastChild.style.borderBottom='none';
            totalAmountForDayDisplay.textContent=formatCurrency(totalAmount,app.settings.currency);transactionCountForDayDisplay.textContent=transactions.length.toString();
        }
    };


    // Gestion des prix
    const updateRealTimePrices = async () => {
        try {
            console.log('Mise à jour des prix en cours...');
            
            const response = await fetch(`http://localhost:3000/api/prices`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Erreur serveur prix: ${response.status} - ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            if (!data || !data.data) {
                console.error("Données prix invalides:", data);
                throw new Error('Données prix invalides');
            }

            let pricesUpdated = false;

            const coinMarketCapIDs = {
                BTC: '1', ETH: '1027', MATIC: '3890', SUI: '20945', ALGORAND: '6718',
                XRP: '52', ADA: '2010', LINK: '1975', DOT: '6636', BNB: '1839'
            };

            for (const symbol in coinMarketCapIDs) {
                const id = coinMarketCapIDs[symbol];
                const cryptoData = data.data[id];
                if (!cryptoData?.quote?.USD?.price) {
                    console.warn(`Prix non trouvé pour ${symbol}`);
                    continue;
                }

                app.cryptoPrices[symbol] = cryptoData.quote.USD.price * USD_TO_CHF_RATE;
                if (symbol === 'BTC') app.cryptoPrices.LIGHTNING = app.cryptoPrices.BTC;
                if (symbol === 'MATIC') app.cryptoPrices.POLYGON = app.cryptoPrices.MATIC;
                pricesUpdated = true;
            }

            // Valeurs par défaut
            app.cryptoPrices.USDC = 1.01 * USD_TO_CHF_RATE;
            app.cryptoPrices.USDT = 1.00 * USD_TO_CHF_RATE;
            app.cryptoPrices.CHFM = 1.00;

            if (pricesUpdated && document.getElementById('appContainer').style.display === 'grid') {
                await updateTotalBalanceAndRefreshView();
            }

        } catch (error) {
            errorHandler.handleError(error, 'Récupération des prix');
            console.error("Erreur récupération prix frontend:", error);
            showNotification('Erreur', 'Impossible de récupérer les prix.', 'error');
        }
    };

    // Définir l'intervalle de mise à jour des prix
    setInterval(updateRealTimePrices, 60000);

    const logout = () => {
        app.pin = '';
        app.activeWallets = { ethereum: null, bitcoin: null };
        app.settings.hasWallet = false;
        app.settings.encryptedWalletData = null;
        app.settings.publicAddresses = {};
        app.configuredChains = [];

        app.activities = [];
        app.tpeTransactions = [];
        app.pendingSwaps = [];
        app.swapsRealized = [];

        saveAppSettings();

        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        document.querySelectorAll('#pinDotsContainer .pin-dot').forEach(dot => dot.classList.remove('filled'));
        showNotification('Déconnexion', 'Vous avez été déconnecté.', 'info');
    };
    window.logout = logout;

    // Nouvelle fonction pour openProfileSettings
    const openProfileSettings = () => {
        const content = `
            <h3 style="margin-bottom: 20px;">Paramètres du Profil</h3>
            <div class="form-group">
                <label class="form-label" for="profileUserName">Nom d'utilisateur</label>
                <input type="text" class="input-field" id="profileUserName" value="${app.settings.userName}">
            </div>
            <div class="form-group">
                <label class="form-label" for="profileLanguage">Langue</label>
                <select class="input-field" id="profileLanguage">
                    <option value="fr" ${app.settings.language === 'fr' ? 'selected' : ''}>Français</option>
                    <option value="en" ${app.settings.language === 'en' ? 'selected' : ''}>English</option>
                </select>
        </div>
            <button class="submit-btn" style="margin-top:30px;" onclick="saveProfileSettings()">Sauvegarder les modifications</button>
            <p style="text-align:center;font-size:14px;color:#8e8e93;margin-top:20px;">
                D'autres options de profil (ex: 2FA, gestion des sessions) iraient ici.
            </p>
        `;
        openModal('Votre Profil', content);
    };
    window.openProfileSettings = openProfileSettings;

    // Nouvelle fonction pour sauvegarder les paramètres du profil (simulée)
    const saveProfileSettings = () => {
        const newUserName = document.getElementById('profileUserName').value;
        const newLanguage = document.getElementById('profileLanguage').value;

        app.settings.userName = newUserName;
        app.settings.language = newLanguage;
        document.getElementById('userNameDisplay').textContent = newUserName;
        saveAppSettings(true);
        closeModal();
        showNotification('Profil mis à jour', 'Vos paramètres de profil ont été enregistrés.', 'success');
    };
    window.saveProfileSettings = saveProfileSettings;

    document.addEventListener('DOMContentLoaded', async () => {
        console.log("[script.js] DOMContentLoaded - Initialisation...");
        await loadAppSettings();
        app.activities = [];
        app.tpeTransactions = [];
        app.pendingSwaps = [];
        app.swapsRealized = [];

        // Initialiser les écouteurs d'événements pour le clavier PIN
        const pinPad = document.querySelector('.pin-pad');
        if (pinPad) {
            console.log("[script.js] Configuration des écouteurs pour le clavier PIN");
            pinPad.addEventListener('click', function(e) {
                const target = e.target.closest('.pin-button');
                if (!target) return;

                if (target.dataset.action === 'delete') {
                    console.log("[script.js] Bouton supprimer PIN cliqué");
                    deletePin();
                } else if (target.dataset.pin) {
                    console.log("[script.js] Bouton PIN cliqué:", target.dataset.pin);
                    addPin(target.dataset.pin);
                }
            });
        }

        document.getElementById('userNameDisplay').textContent = app.settings.userName;
        updatePinDots();

        if (!app.settings.hasWallet) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('walletSetupScreen').style.display = 'flex';
        } else {
            document.getElementById('walletSetupScreen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
        }
        await updateRealTimePrices();
    });

    // Fonction pour finaliser la configuration du wallet
    export const finalizeWalletSetup = async (walletData, setupPassword) => {
        try {
            const encryptedData = await authModule.encryptData(walletData.privateKeys, setupPassword);
            
            // Mettre à jour les paramètres de l'application
            app.settings.hasWallet = true;
            app.settings.encryptedWalletData = encryptedData;
            app.settings.pin = setupPassword;
            app.settings.publicAddresses = walletData.addresses;
            app.configuredChains = walletData.chains;

            // Sauvegarder les paramètres
            saveAppSettings();

            // Recharger la page pour appliquer les changements
            location.reload();
        } catch (error) {
            errorHandler.handleError(error, 'Finalisation du wallet');
            throw error;
        }
    };

    // Configuration des formateurs de devise
    const formatter = new Intl.NumberFormat('fr-CH', {
        style: 'currency',
        currency: 'CHF',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
