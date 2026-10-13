const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Lire les données JSON envoyées par le client
app.use(express.json());

// Servir les fichiers HTML, CSS et JavaScript du dossier public
app.use(express.static('public'));

// Gestion des sessions
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

// Modèle des utilisateurs
const User = mongoose.model('User', new mongoose.Schema({
    nom: { type: String, required: true, unique: true },
    mot_de_passe: { type: String, required: true },
    role: {
        type: String,
        enum: ['enseignant', 'etudiant'],
        required: true
    }
}));

// Route principale
app.get('/', (req, res) => {
    res.send('Bienvenue sur le serveur GetQuizz !');
});

// Connexion d'un utilisateur
app.post('/api/login', async (req, res) => {
    try {
        const { nom, motDePasse } = req.body;

        // Vérifier que les champs sont remplis
        if (!nom || !motDePasse) {
            return res.status(400).json({
                message: 'Veuillez remplir tous les champs.'
            });
        }

        // Chercher l'utilisateur dans la base de données
        const utilisateur = await User.findOne({
            nom: nom.trim()
        });

        // Vérifier le nom et le mot de passe
        if (!utilisateur || utilisateur.mot_de_passe !== motDePasse) {
            return res.status(401).json({
                message: 'Nom ou mot de passe incorrect.'
            });
        }

        // Enregistrer l'utilisateur dans la session
        req.session.utilisateur = {
            nom: utilisateur.nom,
            role: utilisateur.role
        };

        res.json({
            message: 'Connexion réussie.',
            nom: utilisateur.nom,
            role: utilisateur.role
        });

    } catch (err) {
        console.error('Erreur de connexion :', err.message);
        res.status(500).json({
            message: 'Erreur du serveur.'
        });
    }
});

// Vérifier que l'utilisateur est connecté
function verifierConnexion(req, res, next) {
    if (!req.session.utilisateur) {
        return res.status(401).json({
            message: 'Vous devez vous connecter.'
        });
    }

    next();
}

// Vérifier que l'utilisateur connecté est un enseignant
function verifierEnseignant(req, res, next) {
    if (req.session.utilisateur.role !== 'enseignant') {
        return res.status(403).json({
            message: 'Accès réservé aux enseignants.'
        });
    }

    next();
}

// Exemple de route protégée pour les enseignants
app.get('/api/enseignant', verifierConnexion, verifierEnseignant, (req, res) => {
    res.json({
        nom: req.session.utilisateur.nom,
        role: req.session.utilisateur.role
    });
});

// Déconnexion d'un utilisateur
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erreur de déconnexion :', err.message);

            return res.status(500).json({
                message: 'Impossible de fermer la session.'
            });
        }

        res.clearCookie('connect.sid');

        res.json({
            message: 'Déconnexion réussie.'
        });
    });
});

// Connexion MongoDB et démarrage du serveur
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connecté à MongoDB');

        app.listen(PORT, () => {
            console.log(`Serveur GetQuizz lancé sur http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Erreur de connexion MongoDB :', err.message);
    });