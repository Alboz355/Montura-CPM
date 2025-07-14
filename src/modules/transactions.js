// transactions.js
import { ethers } from 'ethers';
import bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';

const transactions = {
    // Validation des montants
    validateAmount(amount, currency, balance = 0) {
        try {
            if (typeof amount !== 'number' || isNaN(amount)) {
                throw new Error('Le montant doit être un nombre valide');
            }
            if (amount <= 0) {
                throw new Error('Le montant doit être supérieur à zéro');
            }
            if (amount > balance) {
                throw new Error('Solde insuffisant');
            }
            
            // Restrictions par devise
            const currencyLimits = {
                BTC: { min: 0.0001, max: 10, decimals: 8 },
                ETH: { min: 0.001, max: 100, decimals: 18 },
                USDC: { min: 1, max: 10000, decimals: 6 },
                CHF: { min: 1, max: 100000, decimals: 2 },
                USDT: { min: 1, max: 10000, decimals: 6 },
                MATIC: { min: 0.001, max: 1000, decimals: 18 },
                SUI: { min: 0.001, max: 1000, decimals: 9 },
                ALGO: { min: 0.001, max: 1000, decimals: 6 },
                XRP: { min: 0.001, max: 1000, decimals: 6 },
                BNB: { min: 0.001, max: 1000, decimals: 18 },
                ADA: { min: 1, max: 1000000, decimals: 6 },
                DOT: { min: 0.001, max: 1000, decimals: 10 },
                LINK: { min: 0.001, max: 1000, decimals: 18 }
            };
            
            const limits = currencyLimits[currency] || { min: 0, max: Infinity, decimals: 2 };
            if (amount < limits.min) {
                throw new Error(`Montant minimum pour ${currency}: ${limits.min}`);
            }
            if (amount > limits.max) {
                throw new Error(`Montant maximum pour ${currency}: ${limits.max}`);
            }
            
            // Vérifier le nombre de décimales
            const amountStr = amount.toString();
            const decimalIndex = amountStr.indexOf('.');
            if (decimalIndex !== -1) {
                const decimals = amountStr.length - decimalIndex - 1;
                if (decimals > limits.decimals) {
                    throw new Error(`Trop de décimales pour ${currency} (max ${limits.decimals})`);
                }
            }
            
            return true;
        } catch (error) {
            console.error(`Erreur de validation du montant pour ${currency}:`, error);
            throw error;
        }
    },

    // Gestion des transactions Ethereum
    async sendEthereumTransaction(provider, privateKey, toAddress, amount, currency) {
        try {
            // Vérifier le provider
            if (!provider || !provider.sendTransaction) {
                throw new Error('Provider Ethereum invalide');
            }

            // Créer le wallet
            const wallet = new ethers.Wallet(privateKey, provider);
            
            // Vérifier le solde
            const balance = await wallet.getBalance();
            const requiredBalance = ethers.parseUnits(amount.toString(), currency === 'ETH' ? 'ether' : 'wei');
            if (balance.lt(requiredBalance)) {
                throw new Error('Solde insuffisant');
            }

            // Préparer la transaction
            const tx = {
                to: toAddress,
                value: requiredBalance,
                gasLimit: ethers.BigNumber.from('21000'), // Gas limit standard pour un transfert ETH
                gasPrice: await provider.getGasPrice()
            };

            // Envoyer la transaction
            try {
                const transaction = await wallet.sendTransaction(tx);
                await transaction.wait();
                
                return {
                    hash: transaction.hash,
                    timestamp: Date.now(),
                    status: 'confirmed',
                    from: wallet.address,
                    to: toAddress,
                    value: amount,
                    currency: currency
                };
            } catch (error) {
                // Gérer spécifiquement les erreurs Ethereum
                const errorData = this.ethereumErrorCodes[error.code];
                if (errorData) {
                    error.type = errorData.type;
                    error.message = errorData.message;
                }
                errorHandler.handleTransactionError(error, 'Transaction Ethereum');
                throw error;
            }
        } catch (error) {
            console.error('Erreur lors de l\'envoi Ethereum:', error);
            errorHandler.handleError(error, errorHandler.TYPES.TRANSACTION);
            throw error;
        }
    },

    // Gestion des transactions Bitcoin
    async createBitcoinTransaction(privateKey, toAddress, amount, network = bitcoin.networks.bitcoin) {
        try {
            // Vérifier la clé privée
            if (!privateKey || privateKey.length !== 64) {
                throw new Error('Clé privée Bitcoin invalide');
            }

            // Créer la transaction
            const tx = new bitcoin.TransactionBuilder(network);
            
            // Ajouter les inputs (UTXOs)
            // Cela devrait être implémenté avec une logique de sélection optimale
            // Pour l'exemple, on utilise une UTXO fixe
            const utxo = {
                txId: 'example-tx-id',
                vout: 0,
                scriptPubKey: 'example-script-pubkey',
                satoshis: amount * 100000000
            };
            
            tx.addInput(utxo.txId, utxo.vout);
            
            // Ajouter l'output
            tx.addOutput(toAddress, amount * 100000000);
            
            // Signer la transaction
            const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
            tx.sign(0, keyPair);
            
            return {
                raw: tx.build().toHex(),
                timestamp: Date.now(),
                status: 'pending',
                from: bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address,
                to: toAddress,
                value: amount,
                currency: 'BTC'
            };
        } catch (error) {
            console.error('Erreur lors de la création Bitcoin:', error);
            throw error;
        }
    },

    // Validation des adresses
    validateAddress(address, currency) {
        try {
            const networks = {
                BTC: bitcoin.networks.bitcoin,
                ETH: ethers,
                USDC: ethers,
                USDT: ethers,
                MATIC: ethers,
                SUI: ethers,
                ALGO: ethers,
                XRP: ethers,
                BNB: ethers,
                ADA: ethers,
                DOT: ethers,
                LINK: ethers
            };
            
            const network = networks[currency];
            if (!network) {
                throw new Error('Devise non supportée');
            }

            switch (currency) {
                case 'BTC':
                    try {
                        bitcoin.address.fromBase58Check(address);
                    } catch {
                        throw new Error('Adresse Bitcoin invalide');
                    }
                    break;
                case 'ETH':
                case 'USDC':
                case 'USDT':
                case 'MATIC':
                case 'SUI':
                case 'ALGO':
                case 'XRP':
                case 'BNB':
                case 'ADA':
                case 'DOT':
                case 'LINK':
                    if (!ethers.isAddress(address)) {
                        throw new Error('Adresse Ethereum invalide');
                    }
                    break;
                default:
                    throw new Error('Devise non supportée');
            }
            
            return true;
        } catch (error) {
            console.error('Erreur de validation:', error);
            throw error;
        }
    },

    // Gestion des erreurs de transaction
    handleTransactionError(error) {
        const errorMessages = {
            32000: { type: 'insufficient_balance', message: 'Solde insuffisant' },
            32001: { type: 'invalid_transaction', message: 'Transaction invalide' },
            32002: { type: 'transaction_rejected', message: 'Transaction rejetée' },
            32003: { type: 'transaction_confirmed', message: 'Transaction déjà confirmée' },
            32004: { type: 'gas_limit_exceeded', message: 'Limites de gas dépassées' },
            32603: { type: 'transaction_error', message: 'Erreur de transaction' }
        };

        // Gérer le code d'erreur
        const code = error.code ? Math.abs(error.code) : 32000;
        const errorData = errorMessages[code];

        // Construire l'erreur avec les informations appropriées
        const transactionError = {
            code: code,
            type: errorData?.type || 'unknown',
            message: errorData?.message || 'Erreur inconnue lors de la transaction',
            details: error.message || error.toString()
        };

        // Utiliser le errorHandler pour la gestion centralisée
        errorHandler.handleError(transactionError, errorHandler.TYPES.TRANSACTION);

        // Retourner l'erreur formatée
        return transactionError;
    }
};

export default transactions;
