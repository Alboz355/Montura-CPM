// walletSetup.js

// Importations des bibliothèques nécessaires
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib'; // Assure-toi que cette bibliothèque est bien installée et importée
import { Buffer } from 'buffer'; // Polyfill Buffer pour le navigateur
import * as bip39 from 'bip39';   // Pour la génération de seed à partir de mnemonic

// Importez les fonctions et constantes de script.js si nécessaire (ou passez les données via des appels de fonction)
// S'assurer que initializeMainAppWithWallet est importée depuis script.js (ou un fichier partagé)
import { showNotification, copyToClipboard, initializeMainAppWithWallet } from './script.js';


// Définition des blockchains supportées par l'interface de setup
// Cette constante est importante et doit être cohérente avec celle utilisée dans script.js
const SUPPORTED_BLOCKCHAINS = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: '₿', color: '#f7931a' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: '⟠', color: '#627eea' },
    { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', icon: '🔵', color: '#28a0f0' },
    { id: 'optimism', name: 'Optimism', symbol: 'OP', icon: '🔴', color: '#ff0420' },
    { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '🟣', color: '#8247e5' },
    { id: 'base', name: 'Base', symbol: 'BASE', icon: '🔷', color: '#0052ff' }, // Ajout d'un symbole pour la cohérence
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', icon: '♠️', color: '#0033ad' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', icon: '☀️', color: '#9945ff' },
    { id: 'xrp', name: 'XRP Ledger', symbol: 'XRP', icon: '💧', color: '#23292f' },
    { id: 'sui', name: 'Sui', symbol: 'SUI', icon: '🌊', color: '#4da2ff' },
    { id: 'algorand', name: 'Algorand', symbol: 'ALGO', icon: '⚫', color: '#000000' },
    { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', icon: '🔺', color: '#e84142' },
    { id: 'binance', name: 'BNB Chain', symbol: 'BNB', icon: '🟨', color: '#f3ba2f' },
    { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', icon: '⚛️', color: '#2e3148' },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', icon: '🟣', color: '#e6007a' },
    { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', icon: '🌿', color: '#00c08b' }
];
window.SUPPORTED_BLOCKCHAINS = SUPPORTED_BLOCKCHAINS; // Exposer globalement pour script.js

let selectedChains = new Set();
let generatedWalletData = null;
let currentSetupPassword = '';
let walletSetupInitialized = false; // << AJOUTER CET INDICATEUR

document.addEventListener('DOMContentLoaded', function() {
    console.log("[walletSetup.js] DOMContentLoaded pour walletSetup - Initialisation...");
    
    // Supprimer la vérification de walletSetupInitialized qui peut bloquer l'initialisation
    initializeBlockchainGrid();
    setupEventListeners();
    
    // Vérifier si un wallet existe déjà
    if (typeof app !== 'undefined' && app.settings && app.settings.hasWallet) {
        // ... existing code ...
    } else {
        showWalletWelcomeScreen();
    }
});

function initializeBlockchainGrid() {
    const grid = document.getElementById('blockchainGrid');
    if (!grid) return;
    grid.innerHTML = '';
    SUPPORTED_BLOCKCHAINS.forEach(blockchain => {
        const item = document.createElement('div');
        item.className = 'blockchain-item';
        item.dataset.chainId = blockchain.id; // Pour faciliter la sélection
        item.addEventListener('click', () => toggleBlockchain(blockchain.id));

        item.innerHTML = `
            <div class="blockchain-icon">${blockchain.icon}</div>
            <div class="blockchain-name">${blockchain.name}</div>
            <div class="blockchain-symbol" style="color: ${blockchain.color || '#fff'}">${blockchain.symbol}</div>
        `;
        grid.appendChild(item);
    });
}

function toggleBlockchain(chainId) {
    const item = document.querySelector(`.blockchain-item[data-chain-id="${chainId}"]`);
    if (!item) return;

    if (selectedChains.has(chainId)) {
        selectedChains.delete(chainId);
        item.classList.remove('selected');
    } else {
        selectedChains.add(chainId);
        item.classList.add('selected');
    }
    updateSelectedChainsDisplay();
    updateCreateButtonState();
}

function updateSelectedChainsDisplay() {
    const container = document.getElementById('selectedChains');
    const list = document.getElementById('selectedChainsList');
    if (!container || !list) return;

    if (selectedChains.size > 0) {
        container.style.display = 'block';
        list.innerHTML = '';
        selectedChains.forEach(chainId => {
            const blockchain = SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId);
            if (blockchain) {
                const tag = document.createElement('span');
                tag.className = 'chain-tag';
                tag.textContent = `${blockchain.icon} ${blockchain.name}`;
                list.appendChild(tag);
            }
        });
    } else {
        container.style.display = 'none';
    }
}

function updateCreateButtonState() {
    const btn = document.getElementById('createWalletBtn');
    const passwordInput = document.getElementById('createPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (!btn || !passwordInput || !confirmPasswordInput) return;

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const isPasswordValid = password.length === 5 && /^\d{5}$/.test(password);
    const isConfirmPasswordValid = confirmPassword.length === 5 && /^\d{5}$/.test(confirmPassword);

    btn.disabled = !(selectedChains.size > 0 && isPasswordValid && isConfirmPasswordValid && password === confirmPassword);
}

function updateImportButtonState() {
    const btn = document.querySelector('#wallet-import-form .submit-btn');
    const mnemonicInput = document.getElementById('mnemonic');
    const importPasswordInput = document.getElementById('importPassword');
    if (!btn || !mnemonicInput || !importPasswordInput) return;

    const mnemonic = mnemonicInput.value.trim();
    const importPassword = importPasswordInput.value;
    const isMnemonicValid = validateMnemonic(mnemonic); // Au moins 12 mots
    const isPasswordValid = importPassword === '' || (importPassword.length === 5 && /^\d{5}$/.test(importPassword));

    btn.disabled = !(isMnemonicValid && isPasswordValid);
}


function setupEventListeners() {
    console.log("[walletSetup.js] Configuration des écouteurs d'événements...");
    
    // Attacher les écouteurs d'événements pour les boutons de bienvenue
    const createWalletWelcomeBtn = document.getElementById('createWalletWelcomeBtn');
    if (createWalletWelcomeBtn) {
        createWalletWelcomeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("[walletSetup.js] Bouton Créer un nouveau wallet cliqué");
            showCreateWalletForm();
        });
    }

    const importWalletWelcomeBtn = document.getElementById('importWalletWelcomeBtn');
    if (importWalletWelcomeBtn) {
        importWalletWelcomeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("[walletSetup.js] Bouton Importer un wallet cliqué");
            showImportWalletForm();
        });
    }

    // Attacher les écouteurs pour les boutons de retour
    const createFormBackBtn = document.getElementById('createFormBackBtn');
    if (createFormBackBtn) {
        createFormBackBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showWalletWelcomeScreen();
        });
    }

    const importFormBackBtn = document.getElementById('importFormBackBtn');
    if (importFormBackBtn) {
        importFormBackBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showWalletWelcomeScreen();
        });
    }

    // Attacher les écouteurs pour les formulaires
    const createForm = document.querySelector('#wallet-create-form form');
    if (createForm) {
        createForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("[walletSetup.js] Formulaire de création soumis");
            createWalletLogic(e);
        });
    }

    const importForm = document.querySelector('#wallet-import-form form');
    if (importForm) {
        importForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("[walletSetup.js] Formulaire d'import soumis");
            importWalletLogic(e);
        });
    }

    // Attacher les écouteurs pour les champs de mot de passe
    const createPasswordInput = document.getElementById('createPassword');
    if (createPasswordInput) {
        createPasswordInput.addEventListener('input', updateCreateButtonState);
    }

    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', updateCreateButtonState);
    }

    // Attacher les écouteurs pour les champs d'import
    const mnemonicInput = document.getElementById('mnemonic');
    if (mnemonicInput) {
        mnemonicInput.addEventListener('input', updateImportButtonState);
    }

    const importPasswordInput = document.getElementById('importPassword');
    if (importPasswordInput) {
        importPasswordInput.addEventListener('input', updateImportButtonState);
    }

    // Attacher l'écouteur pour la case à cocher de mnémonique
    const mnemonicSavedCheckbox = document.getElementById('mnemonic-saved-checkbox');
    if (mnemonicSavedCheckbox) {
        mnemonicSavedCheckbox.addEventListener('change', function(e) {
            const finalizeBtn = document.getElementById('finalizeBtn');
            if (finalizeBtn) {
                finalizeBtn.disabled = !e.target.checked;
            }
        });
    }

    // Ajouter les écouteurs pour le clavier PIN
    const pinPad = document.querySelector('.pin-pad');
    if (pinPad) {
        pinPad.addEventListener('click', function(e) {
            const target = e.target.closest('.pin-button');
            if (!target) return;

            if (target.dataset.action === 'delete') {
                deletePin();
            } else if (target.dataset.pin) {
                addPin(target.dataset.pin);
            }
        });
    }

    // Ajouter l'écouteur pour le formulaire de récupération
    const recoveryForm = document.getElementById('recoveryForm');
    if (recoveryForm) {
        recoveryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            recoverPin(e);
        });
    }

    // Ajouter l'écouteur pour le bouton de récupération
    const showRecoveryFormBtn = document.getElementById('showRecoveryFormBtn');
    if (showRecoveryFormBtn) {
        showRecoveryFormBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showRecoveryForm();
        });
    }
}

function showWalletWelcomeScreen() {
    hideAllScreens();
    const welcomeScreen = document.getElementById('wallet-welcome-screen');
    if (welcomeScreen) welcomeScreen.style.display = 'block';
    selectedChains = new Set(); // Réinitialiser les chaînes sélectionnées
    initializeBlockchainGrid(); // Réinitialiser la grille
    updateSelectedChainsDisplay();
    updateCreateButtonState();
    currentSetupPassword = '';
    generatedWalletData = null;
}

function showCreateWalletForm() {
    hideAllScreens();
    const createForm = document.getElementById('wallet-create-form');
    if (createForm) createForm.style.display = 'block';
    const createPasswordInput = document.getElementById('createPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (createPasswordInput) createPasswordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';
    updateCreateButtonState();
}

function showImportWalletForm() {
    hideAllScreens();
    const importForm = document.getElementById('wallet-import-form');
    if (importForm) importForm.style.display = 'block';
    const mnemonicInput = document.getElementById('mnemonic');
    const importPasswordInput = document.getElementById('importPassword');
    if (mnemonicInput) mnemonicInput.value = '';
    if (importPasswordInput) importPasswordInput.value = '';
    updateImportButtonState();
}

function hideAllScreens() {
    const screens = ['wallet-welcome-screen', 'wallet-create-form', 'wallet-import-form', 'wallet-loading', 'wallet-success-message', 'wallet-info-display'];
    screens.forEach(screenId => {
        const screenElement = document.getElementById(screenId);
        if (screenElement) screenElement.style.display = 'none';
    });
}

async function deriveMultiChainKeys(chains, mnemonicPhrase = null) {
    let mnemonic;
    if (mnemonicPhrase && validateMnemonic(mnemonicPhrase)) {
        mnemonic = mnemonicPhrase;
    } else if (mnemonicPhrase) { // Mnemonic fourni mais invalide
        throw new Error("Phrase mnémonique fournie invalide.");
    } else { // Pas de mnemonic fourni, on en génère un nouveau
        mnemonic = bip39.generateMnemonic(256); // Génère une phrase de 24 mots
    }

    if (!validateMnemonic(mnemonic)) {
         throw new Error("La phrase mnémonique générée ou fournie est invalide.");
    }

    const mnemonicObject = ethers.Mnemonic.fromPhrase(mnemonic); // Pour ethers.js
    // const masterNode = ethers.HDNodeWallet.fromMnemonic(mnemonicObject); // Pas directement utilisé pour toutes les dérivations

    if (typeof Buffer === 'undefined') {
        console.error("ERREUR CRITIQUE: L'objet Buffer n'est pas défini.");
        throw new Error("Buffer library is not loaded.");
    }
    const seedBuffer = await bip39.mnemonicToSeed(mnemonic);

    const addresses = {};
    const privateKeys = {};
    const derivedChains = []; // Pour stocker les IDs des chaînes pour lesquelles la dérivation a réussi

    for (const chainId of chains) {
        let address = '';
        let privateKey = '';
        const blockchainInfo = SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId);

        try {
            switch (chainId) {
                case 'ethereum':
                case 'arbitrum': // Partagent le même type d'adresse/dérivation qu'Ethereum
                case 'optimism':
                case 'polygon':
                case 'base':
                case 'avalanche': // C-Chain
                case 'binance':   // BSC
                    // Chemin de dérivation standard pour EVM (BIP-44)
                    const evmPath = `m/44'/60'/0'/0/0`; // Un seul compte/adresse par chaîne pour simplifier
                    const evmWallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObject, evmPath);
                    address = evmWallet.address;
                    privateKey = evmWallet.privateKey;
                    break;

                case 'bitcoin':
                    if (typeof bitcoin === 'undefined' || !bitcoin.bip32 || !bitcoin.payments) {
                        console.error("bitcoinjs-lib n'est pas correctement chargé ou initialisé.");
                        throw new Error("bitcoinjs-lib non disponible pour dérivation Bitcoin.");
                    }
                    // Chemin de dérivation pour Native SegWit (P2WPKH) - BIP-84
                    const btcPath = `m/84'/0'/0'/0/0`; // Premier compte, adresse externe
                    const btcRoot = bitcoin.bip32.fromSeed(seedBuffer); // bitcoin.networks.bitcoin est implicite ou peut être ajouté
                    const btcAccount = btcRoot.derivePath(btcPath);
                    const { address: btcAddress } = bitcoin.payments.p2wpkh({ pubkey: btcAccount.publicKey, network: bitcoin.networks.bitcoin });
                    if (!btcAddress) throw new Error("Impossible de générer l'adresse Bitcoin.");
                    address = btcAddress;
                    privateKey = btcAccount.toWIF(); // Wallet Import Format
                    break;
                
                // Ajouter d'autres cas spécifiques ici si nécessaire (Solana, Cardano, etc. ont des dérivations différentes)

                default:
                    // Simulation pour les autres chaînes non explicitement gérées
                    const simPrefix = blockchainInfo?.symbol || chainId.substring(0,3).toUpperCase();
                    address = `${simPrefix}_sim_${Math.random().toString(36).substring(2, 10)}`;
                    privateKey = `sim_pk_${chainId}_${Math.random().toString(36).substring(2, 10)}`;
                    console.warn(`ATTENTION: La dérivation de clé pour ${chainId} (${simPrefix}) est actuellement SIMULÉE.`);
                    break;
            }
            addresses[chainId] = address;
            privateKeys[chainId] = privateKey;
            derivedChains.push(chainId); // Ajouter à la liste si succès
            console.log(`Dérivation pour ${chainId} (${blockchainInfo?.name || 'Inconnu'}) réussie. Adresse: ${address.substring(0,10)}...`);

        } catch (error) {
            console.error(`Erreur de dérivation pour ${chainId} (${blockchainInfo?.name || 'Inconnu'}):`, error.message);
            // On n'ajoute pas cette chaîne aux résultats si la dérivation échoue
        }
    }

    // LOGS DE DIAGNOSTIC AJOUTÉS
    console.log('[walletSetup.js/deriveMultiChainKeys] Mnemonic généré/utilisé:', mnemonic);
    console.log('[walletSetup.js/deriveMultiChainKeys] Adresses dérivées (uniquement celles réussies):', JSON.stringify(addresses));
    console.log('[walletSetup.js/deriveMultiChainKeys] Chaînes pour lesquelles la dérivation a réussi:', JSON.stringify(derivedChains));
    // FIN DES LOGS AJOUTÉS

    return {
        mnemonic: mnemonic,
        addresses: addresses,       // Contient uniquement les adresses des dérivations réussies
        privateKeys: privateKeys,   // Contient uniquement les clés des dérivations réussies
        chains: derivedChains       // Contient les IDs des chaînes réussies
    };
}

async function createWalletLogic(event) { // Renommé pour éviter conflit avec variable globale potentielle
    event.preventDefault();

    if (selectedChains.size === 0) {
        showNotification('Attention', 'Veuillez sélectionner au moins une blockchain.', 'warning');
        return;
    }
    const passwordInput = document.getElementById('createPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const password = passwordInput.value; // Pas de .trim() pour les PIN numériques
    const confirmPassword = confirmPasswordInput.value;

    if (password.length !== 5 || !/^\d{5}$/.test(password)) {
        showNotification('Erreur', 'Le code PIN doit contenir exactement 5 chiffres numériques.', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showNotification('Erreur', 'Les codes PIN ne correspondent pas.', 'error');
        return;
    }
    currentSetupPassword = password;

    hideAllScreens();
    const loadingScreen = document.getElementById('wallet-loading');
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingScreen) loadingScreen.style.display = 'block';
    if (loadingMessage) loadingMessage.textContent = 'Génération de votre wallet multichain en cours...';

    try {
        // Utilise les chaînes actuellement sélectionnées dans l'UI
        const derivationResult = await deriveMultiChainKeys(Array.from(selectedChains));
        
        if (derivationResult.chains.length === 0) {
            showNotification('Erreur', 'Aucune clé n\'a pu être dérivée. Veuillez vérifier la console et réessayer.', 'error');
            showCreateWalletForm(); // Retour au formulaire de création
            return;
        }

        generatedWalletData = {
            mnemonic: derivationResult.mnemonic,
            addresses: derivationResult.addresses,
            privateKeys: derivationResult.privateKeys,
            chains: derivationResult.chains // Utilise les chaînes effectivement dérivées
        };

        const mnemonicDisplay = document.getElementById('wallet-mnemonic-display');
        if (mnemonicDisplay) mnemonicDisplay.textContent = generatedWalletData.mnemonic;
        
        const addressesContainer = document.getElementById('addresses-container');
        if (addressesContainer) addressesContainer.innerHTML = '';

        for (const chainId of generatedWalletData.chains) { // Itérer sur les chaînes dérivées
            const blockchain = SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId);
            const address = generatedWalletData.addresses[chainId];
            if (blockchain && address && addressesContainer) {
                const addressBlock = document.createElement('div');
                addressBlock.style.marginBottom = '20px';
                addressBlock.innerHTML = `
                    <p style="font-weight: 600; margin-bottom: 10px; color: ${blockchain.color || '#f1f5f9'};">
                        ${blockchain.icon} ${blockchain.name} (${blockchain.symbol}):
                    </p>
                    <div class="wallet-address-display" onclick="copyToClipboard('${address}', 'Adresse ${blockchain.name} copiée!')">${address}</div>
                `;
                addressesContainer.appendChild(addressBlock);
            }
        }
        if (loadingScreen) loadingScreen.style.display = 'none';
        const successMessageScreen = document.getElementById('wallet-success-message');
        if (successMessageScreen) successMessageScreen.style.display = 'block';

        setTimeout(() => {
            if (successMessageScreen) successMessageScreen.style.display = 'none';
            const infoDisplayScreen = document.getElementById('wallet-info-display');
            if (infoDisplayScreen) infoDisplayScreen.style.display = 'block';
            
            const finalizeButton = document.getElementById('finalizeBtn');
            if (finalizeButton) {
                // Remplacer le bouton pour s'assurer que les anciens écouteurs sont partis
                const newFinalizeButton = finalizeButton.cloneNode(true);
                finalizeButton.parentNode.replaceChild(newFinalizeButton, finalizeButton);
                newFinalizeButton.addEventListener('click', function(event) {
                    event.preventDefault(); // Important pour les formulaires
                    window.finalizeWalletSetup();
                });
                newFinalizeButton.disabled = true; // Réinitialiser l'état
            }
            const mnemonicCheckbox = document.getElementById('mnemonic-saved-checkbox');
            if (mnemonicCheckbox) mnemonicCheckbox.checked = false;

        }, 1500);

    } catch (error) {
        console.error('Erreur lors de la création du wallet multi-chaînes:', error);
        showNotification('Erreur', `Erreur création wallet: ${error.message || 'Erreur inconnue'}.`, 'error');
        showCreateWalletForm();
    }
}

async function importWalletLogic(event) { // Renommé
    event.preventDefault();
    const mnemonicInput = document.getElementById('mnemonic');
    const importPasswordInput = document.getElementById('importPassword');
    const mnemonicPhrase = mnemonicInput.value.trim();
    const importPassword = importPasswordInput.value;

    if (!validateMnemonic(mnemonicPhrase)) {
        showNotification('Erreur', 'Phrase de récupération invalide (doit contenir 12, 15, 18, 21, ou 24 mots).', 'error');
        return;
    }
    if (importPassword.length !== 5 || !/^\d{5}$/.test(importPassword)) {
        showNotification('Erreur', 'Le code PIN doit contenir exactement 5 chiffres numériques.', 'error');
        return;
    }
    currentSetupPassword = importPassword;

    hideAllScreens();
    const loadingScreen = document.getElementById('wallet-loading');
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingScreen) loadingScreen.style.display = 'block';
    if (loadingMessage) loadingMessage.textContent = 'Importation de votre wallet multichain en cours...';

    try {
        // Pour l'import, on essaie de dériver pour toutes les chaînes supportées
        const allSupportedChainIds = SUPPORTED_BLOCKCHAINS.map(b => b.id);
        const derivationResult = await deriveMultiChainKeys(allSupportedChainIds, mnemonicPhrase);

        if (derivationResult.chains.length === 0) {
            showNotification('Erreur', 'Aucune clé n\'a pu être dérivée à partir de cette phrase mnémonique. Veuillez vérifier la phrase et la console.', 'error');
            showImportWalletForm();
            return;
        }

        generatedWalletData = {
            mnemonic: derivationResult.mnemonic, // Mnemonic original fourni
            addresses: derivationResult.addresses,
            privateKeys: derivationResult.privateKeys,
            chains: derivationResult.chains // Chaînes effectivement dérivées
        };

        const mnemonicDisplay = document.getElementById('wallet-mnemonic-display');
        if (mnemonicDisplay) mnemonicDisplay.textContent = "Phrase de récupération masquée (wallet importé)";
        
        const addressesContainer = document.getElementById('addresses-container');
        if (addressesContainer) addressesContainer.innerHTML = '';

        for (const chainId of generatedWalletData.chains) {
            const blockchain = SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId);
            const address = generatedWalletData.addresses[chainId];
            if (blockchain && address && addressesContainer) {
                const addressBlock = document.createElement('div');
                addressBlock.style.marginBottom = '20px';
                addressBlock.innerHTML = `
                    <p style="font-weight: 600; margin-bottom: 10px; color: ${blockchain.color || '#f1f5f9'};">
                        ${blockchain.icon} ${blockchain.name} (${blockchain.symbol}):
                    </p>
                    <div class="wallet-address-display" onclick="copyToClipboard('${address}', 'Adresse ${blockchain.name} copiée!')">${address}</div>
                `;
                addressesContainer.appendChild(addressBlock);
            }
        }

        if (loadingScreen) loadingScreen.style.display = 'none';
        const successMessageScreen = document.getElementById('wallet-success-message');
        const successTitle = successMessageScreen?.querySelector('h3');
        const successPara = successMessageScreen?.querySelector('p');

        if (successMessageScreen) successMessageScreen.style.display = 'block';
        if (successTitle) successTitle.textContent = '✅ Wallet importé avec succès!';
        if (successPara) successPara.textContent = 'Vos adresses ont été dérivées pour les blockchains supportées.';

        setTimeout(() => {
            if (successMessageScreen) successMessageScreen.style.display = 'none';
            const infoDisplayScreen = document.getElementById('wallet-info-display');
            if (infoDisplayScreen) infoDisplayScreen.style.display = 'block';
            
            const finalizeButton = document.getElementById('finalizeBtn');
            if (finalizeButton) {
                const newFinalizeButton = finalizeButton.cloneNode(true);
                finalizeButton.parentNode.replaceChild(newFinalizeButton, finalizeButton);
                newFinalizeButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    window.finalizeWalletSetup();
                });
                newFinalizeButton.disabled = false; // Wallet importé, on peut finaliser direct
            }

            const mnemonicCheckboxLabel = document.querySelector('label[for="mnemonic-saved-checkbox"]');
            const mnemonicCheckbox = document.getElementById('mnemonic-saved-checkbox');
            const warningMessage = document.querySelector('.warning-message');
            if (mnemonicCheckbox) mnemonicCheckbox.style.display = 'none';
            if (mnemonicCheckboxLabel) mnemonicCheckboxLabel.style.display = 'none';
            if (warningMessage) warningMessage.style.display = 'none';


        }, 1500);

    } catch (error) {
        console.error('Erreur lors de l\'importation du wallet multi-chaînes:', error);
        showNotification('Erreur', `Erreur importation: ${error.message || 'Erreur inconnue'}.`, 'error');
        showImportWalletForm();
    }
}

function validateMnemonic(mnemonic) {
    if (!mnemonic) return false;
    const wordCount = mnemonic.trim().split(/\s+/).length;
    // Bip39 supporte 12, 15, 18, 21, 24 mots
    if (![12, 15, 18, 21, 24].includes(wordCount)) return false;
    try {
        // ethers.js Mnemonic.isValidMnemonic est un bon validateur mais bip39.validateMnemonic est plus direct.
        return bip39.validateMnemonic(mnemonic);
    } catch (e) {
        console.warn("Erreur lors de la validation de la mnémonique:", e);
        return false;
    }
}

// Exposer la fonction finalizeWalletSetup globalement
window.finalizeWalletSetup = async function() {
    console.log('[walletSetup.js/finalizeWalletSetup] Début de la finalisation...');
    
    if (!currentSetupPassword) {
        showNotification('Erreur', 'Le mot de passe de configuration est manquant.', 'error');
        showWalletWelcomeScreen();
        return;
    }
    
    if (!generatedWalletData || !generatedWalletData.privateKeys || Object.keys(generatedWalletData.privateKeys).length === 0) {
        console.error('[walletSetup.js/finalizeWalletSetup] Données de wallet invalides:', generatedWalletData);
        showNotification('Erreur', 'Aucune donnée de portefeuille à finaliser.', 'error');
        showWalletWelcomeScreen();
        return;
    }

    try {
        console.log('[walletSetup.js/finalizeWalletSetup] Données du wallet avant finalisation:', {
            hasPrivateKeys: !!generatedWalletData.privateKeys,
            chains: generatedWalletData.chains,
            addresses: Object.keys(generatedWalletData.addresses)
        });

        // Appel de la fonction importée de script.js
        await initializeMainAppWithWallet(generatedWalletData, currentSetupPassword);
        
        // Nettoyage après succès
        generatedWalletData = null;
        currentSetupPassword = '';
        console.log("[walletSetup.js/finalizeWalletSetup] Finalisation réussie, données sensibles temporaires nettoyées.");

    } catch (error) {
        console.error("[walletSetup.js/finalizeWalletSetup] Erreur critique:", error);
        showNotification('Erreur de finalisation', `Échec de la finalisation du portefeuille: ${error.message}. Veuillez réessayer.`, 'error', 10000);
        showWalletWelcomeScreen();
    }
};

// Fonctions pour la gestion du PIN
function addPin(digit) {
    const pinInput = document.getElementById('pinInput') || document.createElement('input');
    pinInput.type = 'hidden';
    pinInput.id = 'pinInput';
    if (!document.getElementById('pinInput')) {
        document.querySelector('.pin-dots').appendChild(pinInput);
    }

    const currentPin = pinInput.value || '';
    if (currentPin.length < 5) {
        pinInput.value = currentPin + digit;
        updatePinDots(currentPin.length + 1);
        
        if (currentPin.length + 1 === 5) {
            // PIN complet, vérifier
            setTimeout(() => verifyPin(pinInput.value), 100);
        }
    }
}

function deletePin() {
    const pinInput = document.getElementById('pinInput');
    if (!pinInput) return;

    const currentPin = pinInput.value || '';
    if (currentPin.length > 0) {
        pinInput.value = currentPin.slice(0, -1);
        updatePinDots(currentPin.length - 1);
    }
}

function updatePinDots(length) {
    const dotsContainer = document.getElementById('pinDotsContainer');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const dot = document.createElement('div');
        dot.className = 'pin-dot' + (i < length ? ' filled' : '');
        dotsContainer.appendChild(dot);
    }
}

function verifyPin(pin) {
    // Cette fonction devrait être implémentée dans script.js
    if (typeof app !== 'undefined' && app.verifyPin) {
        app.verifyPin(pin);
    } else {
        console.error('La fonction de vérification du PIN n\'est pas disponible');
        showNotification('Erreur', 'Impossible de vérifier le PIN', 'error');
    }
}

function showRecoveryForm() {
    const recoveryForm = document.getElementById('recoveryForm');
    const showRecoveryFormBtn = document.getElementById('showRecoveryFormBtn');
    if (recoveryForm && showRecoveryFormBtn) {
        recoveryForm.style.display = 'block';
        showRecoveryFormBtn.style.display = 'none';
    }
}

async function recoverPin(event) {
    event.preventDefault();
    
    const mnemonicInput = document.getElementById('recoveryMnemonic');
    const newPinInput = document.getElementById('newPin');
    const confirmNewPinInput = document.getElementById('confirmNewPin');
    
    if (!mnemonicInput || !newPinInput || !confirmNewPinInput) {
        showNotification('Erreur', 'Formulaire de récupération incomplet', 'error');
        return;
    }

    const mnemonic = mnemonicInput.value.trim();
    const newPin = newPinInput.value;
    const confirmNewPin = confirmNewPinInput.value;

    if (!validateMnemonic(mnemonic)) {
        showNotification('Erreur', 'Phrase de récupération invalide', 'error');
        return;
    }

    if (newPin.length !== 5 || !/^\d{5}$/.test(newPin)) {
        showNotification('Erreur', 'Le nouveau code PIN doit contenir exactement 5 chiffres', 'error');
        return;
    }

    if (newPin !== confirmNewPin) {
        showNotification('Erreur', 'Les codes PIN ne correspondent pas', 'error');
        return;
    }

    try {
        // Cette fonction devrait être implémentée dans script.js
        if (typeof app !== 'undefined' && app.recoverPin) {
            await app.recoverPin(mnemonic, newPin);
            showNotification('Succès', 'Code PIN réinitialisé avec succès', 'success');
            // Rediriger vers l'écran de connexion
            document.getElementById('forgotPinSection').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'block';
        } else {
            throw new Error('La fonction de récupération du PIN n\'est pas disponible');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du PIN:', error);
        showNotification('Erreur', error.message || 'Erreur lors de la récupération du PIN', 'error');
    }
}