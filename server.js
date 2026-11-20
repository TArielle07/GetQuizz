const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const { User, Quiz, Question, Reponse, Tentative, verifierReponses } = require('./models');

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

/* =========================================================
   API DES QUIZ — Création d'un quiz
   ========================================================= */

app.post('/api/quiz', verifierConnexion, verifierEnseignant, async (req, res) => {
    try {
        const { titre, description } = req.body;

        // Vérifier que le titre est rempli
        if (!titre || !titre.trim()) {
            return res.status(400).json({
                message: 'Le titre du quiz est obligatoire.'
            });
        }

        // Créer le quiz dans la base de données
        const nouveauQuiz = new Quiz({
            titre: titre.trim(),
            description: description || '',
            enseignant: req.session.utilisateur.id
        });

        await nouveauQuiz.save();

        res.status(201).json({
            message: 'Quiz créé avec succès.',
            quiz: nouveauQuiz
        });

    } catch (err) {
        console.error('Erreur lors de la création du quiz :', err.message);

        res.status(500).json({
            message: 'Erreur du serveur lors de la création du quiz.'
        });
    }
});

/* =========================================================
   API DES QUESTIONS ET DES REPONSES
   ========================================================= */

app.post(
    '/api/quiz/:quizId/questions',
    verifierConnexion,
    verifierEnseignant,
    async (req, res) => {
        let nouvelleQuestion;

        try {
            const { texte, type, reponses } = req.body;
            const { quizId } = req.params;

            // Vérifier l'identifiant du quiz
            if (!mongoose.Types.ObjectId.isValid(quizId)) {
                return res.status(400).json({
                    message: 'Identifiant du quiz invalide.'
                });
            }

            // Vérifier les informations de la question
            if (!texte || !texte.trim()) {
                return res.status(400).json({
                    message: 'Le texte de la question est obligatoire.'
                });
            }

            if (!['qcm', 'vrai_faux'].includes(type)) {
                return res.status(400).json({
                    message: 'Le type doit être qcm ou vrai_faux.'
                });
            }

            if (!Array.isArray(reponses) ||
                reponses.some(r => !r.texte || !r.texte.trim())) {
                return res.status(400).json({
                    message: 'Chaque réponse doit avoir un texte.'
                });
            }

            // Vérifier que le quiz appartient à cet enseignant
            const quiz = await Quiz.findOne({
                _id: quizId,
                enseignant: req.session.utilisateur.id
            });

            if (!quiz) {
                return res.status(404).json({
                    message: 'Quiz introuvable ou accès refusé.'
                });
            }

            // Vérifier les règles des réponses
            const erreur = verifierReponses(type, reponses);

            if (erreur) {
                return res.status(400).json({
                    message: erreur
                });
            }

            // Enregistrer la question
            nouvelleQuestion = new Question({
                quiz: quiz._id,
                texte: texte.trim(),
                type: type
            });

            await nouvelleQuestion.save();

            // Associer les réponses à la question
            const nouvellesReponses = reponses.map(r => ({
                question: nouvelleQuestion._id,
                texte: r.texte.trim(),
                estBonne: r.estBonne === true
            }));

            await Reponse.insertMany(nouvellesReponses);

            // Confirmer l'enregistrement
            res.status(201).json({
                message: 'Question et réponses enregistrées.',
                question: nouvelleQuestion,
                reponses: nouvellesReponses
            });

        } catch (err) {
            // Éviter de garder une question sans ses réponses
            if (nouvelleQuestion) {
                await Question.deleteOne({
                    _id: nouvelleQuestion._id
                }).catch(() => {});
            }

            console.error(
                'Erreur lors de l’enregistrement de la question :',
                err.message
            );

            res.status(500).json({
                message: 'Erreur du serveur lors de l’enregistrement.'
            });
        }
    }
);

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




// ===== MODIFIER / SUPPRIMER / PUBLIER (enseignant) =====

// Retrouve une question seulement si son quiz appartient à l'enseignant connecté
async function trouverQuestionDeLEnseignant(idQuestion, idEnseignant) {
    if (!mongoose.isValidObjectId(idQuestion)) return null;

    const question = await Question.findById(idQuestion);
    if (!question) return null;

    const quiz = await Quiz.findOne({
        _id: question.quiz,
        enseignant: idEnseignant
    });

    if (!quiz) return null;

    return { question, quiz };
}

// Publier un brouillon
app.put('/api/quiz/:id/publier', verifierConnexion, verifierEnseignant, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Quiz introuvable.' });
        }

        const quiz = await Quiz.findOne({
            _id: req.params.id,
            enseignant: req.session.utilisateur.id
        });

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz introuvable.' });
        }

        if (!quiz.description || !quiz.theme || !quiz.difficulte) {
            return res.status(400).json({
                message: 'Pour publier, remplissez la description, le thème et la difficulté.'
            });
        }

        const questions = await Question.find({ quiz: quiz._id }).sort({ createdAt: 1 });

        if (questions.length === 0) {
            return res.status(400).json({
                message: 'Un quiz publié doit avoir au moins une question.'
            });
        }

        for (let i = 0; i < questions.length; i++) {
            const reponses = await Reponse.find({ question: questions[i]._id });
            const erreur = verifierReponses(questions[i].type, reponses);

            if (erreur) {
                return res.status(400).json({
                    message: `Question ${i + 1} : ${erreur}`
                });
            }
        }

        quiz.publie = true;
        await quiz.save();

        res.json({ message: 'Quiz publié.' });

    } catch (err) {
        console.error('Erreur publication :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});

// Modifier une question et ses réponses
app.put('/api/questions/:id', verifierConnexion, verifierEnseignant, async (req, res) => {
    try {
        const trouve = await trouverQuestionDeLEnseignant(
            req.params.id,
            req.session.utilisateur.id
        );

        if (!trouve) {
            return res.status(404).json({ message: 'Question introuvable.' });
        }

        const { question, quiz } = trouve;
        const texte = (req.body.texte || '').trim();

        const TYPES = { choix: 'qcm', vf: 'vrai_faux' };
        const type = TYPES[req.body.type];

        if (!texte) {
            return res.status(400).json({ message: "L'intitulé est obligatoire." });
        }

        if (!type) {
            return res.status(400).json({ message: 'Type de question invalide.' });
        }

        const reponses = (Array.isArray(req.body.reponses) ? req.body.reponses : [])
            .filter(r => r.texte && r.texte.trim() !== '')
            .map(r => ({
                texte: r.texte.trim(),
                estBonne: r.correcte === true
            }));

        if (quiz.publie) {
            const erreur = verifierReponses(type, reponses);
            if (erreur) {
                return res.status(400).json({ message: erreur });
            }
        }

        question.texte = texte;
        question.type = type;
        await question.save();

        await Reponse.deleteMany({ question: question._id });

        if (reponses.length > 0) {
            await Reponse.create(
                reponses.map(r => ({ ...r, question: question._id }))
            );
        }

        res.json({ message: 'Question modifiée.' });

    } catch (err) {
        console.error('Erreur modification question :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});

// Supprimer une question et ses réponses
app.delete('/api/questions/:id', verifierConnexion, verifierEnseignant, async (req, res) => {
    try {
        const trouve = await trouverQuestionDeLEnseignant(
            req.params.id,
            req.session.utilisateur.id
        );

        if (!trouve) {
            return res.status(404).json({ message: 'Question introuvable.' });
        }

        const { question, quiz } = trouve;

        if (quiz.publie) {
            const nb = await Question.countDocuments({ quiz: quiz._id });

            if (nb <= 1) {
                return res.status(400).json({
                    message: 'Un quiz publié doit garder au moins une question.'
                });
            }
        }

        await Reponse.deleteMany({ question: question._id });
        await question.deleteOne();

        res.json({ message: 'Question supprimée.' });

    } catch (err) {
        console.error('Erreur suppression question :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});


// ===== ÉTUDIANT =====
// Vérifier que l'utilisateur connecté est un étudiant
function verifierEtudiant(req, res, next) {
    if (req.session.utilisateur.role !== 'etudiant') {
        return res.status(403).json({ message: 'Accès réservé aux étudiants.' });
    }
    next();
}

// Infos de l'étudiant connecté (pour afficher son nom)
app.get('/api/etudiant', verifierConnexion, verifierEtudiant, (req, res) => {
    res.json(req.session.utilisateur);
});


// Liste des quiz PUBLIÉS seulement (les brouillons ne sortent jamais)
app.get('/api/etudiant/quiz', verifierConnexion, verifierEtudiant, async (req, res) => {
    try {
        const quiz = await Quiz.find({ publie: true })
            .select('titre description theme difficulte updatedAt')
            .sort({ updatedAt: -1 });
        res.json(quiz);
    } catch (err) {
        console.error('Erreur liste étudiant :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});



// Un quiz publié avec ses questions, SANS les bonnes réponses
app.get('/api/etudiant/quiz/:id', verifierConnexion, verifierEtudiant, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Quiz introuvable.' });
        }
        // publie: true -> un brouillon répond 404, comme s'il n'existait pas
        const quiz = await Quiz.findOne({ _id: req.params.id, publie: true })
            .select('titre description theme difficulte');
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz introuvable.' });
        }

        const questions = await Question.find({ quiz: quiz._id })
            .select('texte type').sort({ createdAt: 1 }).lean();
        // select('texte question') : le champ estBonne n'est PAS envoyé
        const reponses = await Reponse.find({ question: { $in: questions.map(q => q._id) } })
            .select('texte question').sort({ _id: 1 }).lean();

        const resultat = questions.map(q => ({
            ...q,
            reponses: reponses
                .filter(r => String(r.question) === String(q._id))
                .map(r => ({ _id: r._id, texte: r.texte }))
        }));

        res.json({ quiz, questions: resultat });
    } catch (err) {
        console.error('Erreur quiz étudiant :', err.message);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});

// Soumettre ses réponses : { reponses: [ { question: "<id>", reponse: "<id>" }, ... ] }
app.post('/api/etudiant/quiz/:id/soumettre', verifierConnexion, verifierEtudiant, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Quiz introuvable.' });
        }
        const quiz = await Quiz.findOne({ _id: req.params.id, publie: true });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz introuvable.' });
        }

        const questions = await Question.find({ quiz: quiz._id }).sort({ createdAt: 1 });
        const reponsesQuiz = await Reponse.find({ question: { $in: questions.map(q => q._id) } });
        const envoyees = Array.isArray(req.body.reponses) ? req.body.reponses : [];

        // Vérifier que CHAQUE question a reçu une réponse valide
        const lignes = [];
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const choix = envoyees.find(r => String(r.question) === String(q._id));
            // La réponse choisie doit exister ET appartenir à cette question
            const reponse = choix && reponsesQuiz.find(r =>
                String(r._id) === String(choix.reponse) && String(r.question) === String(q._id));

            if (!reponse) {
                return res.status(400).json({ message: `Question ${i + 1} : choisissez une réponse.` });
            }
            lignes.push({ question: q._id, reponse: reponse._id, estBonne: reponse.estBonne });
        }

        const score = lignes.filter(l => l.estBonne).length;
        const tentative = await Tentative.create({
            etudiant: req.session.utilisateur.id,
            quiz: quiz._id,
            reponses: lignes,
            score,
            total: questions.length
        });

        res.status(201).json({ message: 'Réponses envoyées.', tentativeId: tentative._id, score, total: questions.length });
    } catch (err) {
        console.error('Erreur soumission :', err.message);
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