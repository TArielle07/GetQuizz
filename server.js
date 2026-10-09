const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permet de recevoir et lire les données JSON
app.use(express.json());

app.use(express.static('public'));

//Bade de données
const User = mongoose.model('User', new mongoose.Schema({
    nom: { type: String, required: true, unique: true },
    mot_de_passe: { type: String, required: true },
    role: { type: String, enum: ['enseignant', 'etudiant'], required: true }
}));

// Route principale pour vérifier le serveur
app.get('/', (req, res) => {
    res.send('Bienvenue sur le serveur GetQuizz !');
});

//Connexion (a venir)

// Démarrage du serveur
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.loog('Connecté à MongoDB');
        app.listen(PORT, () => {
        console.log(`Serveur GetQuizz lancé sur http://localhost:${PORT}`);
        });
    })
    .catch(err => console.error('Erreur de connexion MongoDB', err.message));

