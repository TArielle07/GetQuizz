const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permet de recevoir et lire les données JSON
app.use(express.json());

// Route principale pour vérifier le serveur
app.get('/', (req, res) => {
    res.send('Bienvenue sur le serveur GetQuizz !');
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur GetQuizz lancé sur http://localhost:${PORT}`);
});
