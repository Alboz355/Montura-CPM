// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

// 1. Servir tous les fichiers statiques en PREMIER
app.use(express.static(path.join(__dirname, 'dist')));

// 2. Définir toutes les routes API ENSUITE, avant la route générique
app.get('/api/prices', async (req, res) => {
    const COINMARKETCAP_API_KEY = 'a9fac516-7d93-4479-a8cf-c2ef00e7cccf';
    const IDS_TO_FETCH = '1,1027,3890,20945,6718,52,2010,1975,6636,1839';
    const CONVERT_CURRENCIES = 'USD';

    try {
        const apiUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${IDS_TO_FETCH}&convert=${CONVERT_CURRENCIES}`;
        console.log("Requête CoinMarketCap (par ID) :", apiUrl);

        const response = await fetch(apiUrl, {
            headers: {
                'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error(`Erreur de réponse de CoinMarketCap: ${response.status} ${response.statusText} - Corps:`, errorBody);
            return res.status(response.status).json({ error: `Erreur API CoinMarketCap: ${response.statusText}`, details: errorBody });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Erreur du proxy CoinMarketCap (catch):", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Erreur lors de la récupération des prix via le proxy.", details: error.message });
        }
    }
});

// 3. Enfin, la route générique pour toutes les requêtes qui NE SONT PAS des fichiers statiques
// et NE SONT PAS des routes API, doit renvoyer index.html (pour les routes de l'application SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`Accède à ton site via http://localhost:${PORT}/`);
});