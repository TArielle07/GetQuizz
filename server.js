

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
//const { User } = require('./models');
const { User, Quiz, Question, Reponse, verifierReponses } = require('./models');
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
/*const User = mongoose.model('User', new mongoose.Schema({
    nom: { type: String, required: true, unique: true },
    mot_de_passe: { type: String, required: true },
    role: {
        type: String,
        enum: ['enseignant', 'etudiant'],
        required: true
    }
}));*/

// Route principale
app.get('/', (req, res) => {
    res.send('Bienvenue sur le serveur GetQuizz !');
});

// Connexion d'un utilisateur
app.post('/api/connexion', async (req, res) => {
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
        if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.mot_de_passe))) {
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

// Exemple de route protégée 
app.get('/api/moi', verifierConnexion, (req, res) => {
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

// Connexion d'un utilisateur
app.post('/api/login', async (req, res) => {
    try {
        const { nom, motDePasse } = req.body;

        if (!nom || !motDePasse) {
            return res.status(400).json({ message: 'Veuillez remplir tous les champs.' });
        }

        const utilisateur = await User.findOne({ nom: nom.trim() });

        if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.mot_de_passe))) {
            return res.status(401).json({ message: 'Nom ou mot de passe incorrect.' });
        }

        req.session.utilisateur = { id: utilisateur._id, nom: utilisateur.nom, role: utilisateur.role };
        res.json({ nom: utilisateur.nom, role: utilisateur.role });

    } catch (err) {
        console.error('Erreur de connexion :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});

// Infos de l'enseignant connecté (pour afficher son nom)
app.get('/api/enseignant', (req, res) => {
    if (!req.session.utilisateur || req.session.utilisateur.role !== 'enseignant') {
        return res.status(401).json({ message: 'Vous devez vous connecter.' });
    }
    res.json(req.session.utilisateur);
});

// Déconnexion
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Déconnexion réussie.' });
    });
});


// ===== QUIZ =====
// Valeurs du formulaire -> valeurs de la base de données
const TYPES = { choix: 'qcm', vf: 'vrai_faux' };

// Créer un quiz (brouillon ou publié) avec ses questions et ses réponses
app.post('/api/quiz', verifierConnexion, verifierEnseignant, async (req, res) => {
    try {
        const { titre, description, theme, difficulte, statut } = req.body;
        const questions = Array.isArray(req.body.questions) ? req.body.questions : [];
        const publier = statut === 'publie';

        // Règles pour tous les quiz
        if (!titre || titre.trim() === '') {
            return res.status(400).json({ message: 'Le titre du quiz est obligatoire.' });
        }
        if (questions.length > 5) {
            return res.status(400).json({ message: 'Un quiz peut avoir au maximum 5 questions.' });
        }

        // Règles en plus pour publier
        if (publier) {
            if (!description || !theme || !difficulte) {
                return res.status(400).json({ message: 'Pour publier, remplissez tous les champs.' });
            }
            if (questions.length === 0) {
                return res.status(400).json({ message: 'Un quiz publié doit avoir au moins une question.' });
            }
        }

        // 1. Vérifier toutes les questions AVANT d'enregistrer quoi que ce soit
        const questionsValides = [];
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const prefixe = `Question ${i + 1} : `;
            const type = TYPES[q.type];
            const texte = (q.texte || '').trim();

            if (!texte) {
                return res.status(400).json({ message: prefixe + "l'intitulé est obligatoire." });
            }
            if (!type) {
                return res.status(400).json({ message: prefixe + 'type de question invalide.' });
            }

            // On garde les réponses remplies ; "correcte" (front) devient "estBonne" (base)
            const reponses = (Array.isArray(q.reponses) ? q.reponses : [])
                .filter(r => r.texte && r.texte.trim() !== '')
                .map(r => ({ texte: r.texte.trim(), estBonne: r.correcte === true }));

            // Les règles QCM / Vrai-Faux s'appliquent quand on publie
            if (publier) {
                const erreur = verifierReponses(type, reponses);
                if (erreur) {
                    return res.status(400).json({ message: prefixe + erreur });
                }
            }

            questionsValides.push({ texte, type, reponses });
        }

        // 2. Enregistrer le quiz, relié à l'enseignant de la session
        const quiz = await Quiz.create({
            titre: titre.trim(),
            description: description ? description.trim() : '',
            theme: theme ? theme.trim() : '',
            difficulte: difficulte || undefined,
            publie: publier,
            enseignant: req.session.utilisateur.id
        });

        // 3. Enregistrer chaque question, puis ses réponses
        for (const q of questionsValides) {
            const question = await Question.create({ quiz: quiz._id, texte: q.texte, type: q.type });
            if (q.reponses.length > 0) {
                await Reponse.create(q.reponses.map(r => ({ ...r, question: question._id })));
            }
        }

        res.status(201).json({ message: 'Quiz enregistré.', quizId: quiz._id });

    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Les informations du quiz sont invalides.' });
        }
        console.error('Erreur création quiz :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});

// Liste des quiz de l'enseignant connecté
// /api/quiz?statut=publie -> Mes quiz   |   /api/quiz?statut=brouillon -> Brouillons
app.get('/api/quiz', verifierConnexion, verifierEnseignant, async (req, res) => {
    try {
        const filtre = { enseignant: req.session.utilisateur.id };
        if (req.query.statut === 'publie') filtre.publie = true;
        if (req.query.statut === 'brouillon') filtre.publie = false;

        const quiz = await Quiz.find(filtre).sort({ updatedAt: -1 });
        res.json(quiz);
    } catch (err) {
        console.error('Erreur liste des quiz :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});


// Un quiz avec ses questions et leurs réponses (pour terminer un brouillon)
app.get('/api/quiz/:id', verifierConnexion, verifierEnseignant, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Quiz introuvable.' });
        }
        const quiz = await Quiz.findOne({ _id: req.params.id, enseignant: req.session.utilisateur.id });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz introuvable.' });
        }

        const questions = await Question.find({ quiz: quiz._id }).sort({ createdAt: 1 }).lean();
        const reponses = await Reponse.find({ question: { $in: questions.map(q => q._id) } }).lean();

        // On range chaque réponse sous sa question
        const resultat = questions.map(q => ({
            ...q,
            reponses: reponses.filter(r => String(r.question) === String(q._id))
        }));

        res.json({ quiz, questions: resultat });
    } catch (err) {
        console.error('Erreur affichage quiz :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
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