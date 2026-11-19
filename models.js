const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//Utilisateurs
const userSchema = new mongoose.Schema({
    nom: { type: String, required: true, unique: true },
    mot_de_passe: { type: String, required: true },
    role: { type: String, enum: ['enseignant', 'etudiant'], required: true }
});


//Hache automatiquement le mot de passe avant chaque enregistrement
userSchema.pre('save', async function () {
    if (!this.isModified('mot_de_passe')) return;
    this.mot_de_passe = await bcrypt.hash(this.mot_de_passe, 10);
});

const User = mongoose.model('User', userSchema, 'users');


//Création de la table des quiz
const quizSchema = new mongoose.Schema({
    titre: { type: String, required: true },
    description: { type: String, default: '' },
    theme: { type: String, default: '' },
    difficulte: { type: String, enum: ['facile', 'moyen', 'difficile'] },
    // Relation : le quiz appartient à un enseignant
    enseignant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publie: { type: Boolean, default: false }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema, 'quiz');

//Table des questions
const questionSchema = new mongoose.Schema({
    // Relation : la question appartient à un quiz
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    texte: { type: String, required: true },
    // Deux types seulement : QCM ou Vrai/Faux
    type: { type: String, enum: ['qcm', 'vrai_faux'], required: true }
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema, 'questions');

//Tables des réponses 
const reponseSchema = new mongoose.Schema({
    // Relation : la réponse appartient à une question
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    texte: { type: String, required: true },
    estBonne: { type: Boolean, default: false }
});

const Reponse = mongoose.model('Reponse', reponseSchema, 'reponses');


//Table des tentatives : les réponses d'un étudiant à un quiz
const tentativeSchema = new mongoose.Schema({
    // Relations : qui a répondu, et à quel quiz
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    // Une ligne par question : la réponse choisie et si elle est bonne
    reponses: [{
        question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        reponse: { type: mongoose.Schema.Types.ObjectId, ref: 'Reponse', required: true },
        estBonne: { type: Boolean, default: false }
    }],
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
}, { timestamps: true });

const Tentative = mongoose.model('Tentative', tentativeSchema, 'tentatives');







//Regles des reponses: QCM 2 a 5 reponses, V/F
//Une seuke bonne reponses dans les deux cas
//Message d'erreur ou null si tout est correct
function verifierReponses(type, reponses) {
    const nbBonnes = reponses.filter(r => r.estBonne).length;

    if (type === 'qcm') {
        if (reponses.length < 2) return 'Un QCM doit avoir au moins 2 réponses.';
        if (reponses.length > 5) return 'Un QCM peut avoir au maximum 5 réponses.';
    }

    if (type === 'vrai_faux') {
        const textes = reponses.map(r => r.texte).sort().join(',');
        if (reponses.length !== 2 || textes !== 'Faux,Vrai') {
            return 'Une question Vrai/Faux doit avoir exactement les réponses Vrai et Faux.';
        }
    }

    if (nbBonnes !== 1) return 'Il faut sélectionner exactement une bonne réponse.';

    return null;
}
module.exports = { User, Quiz, Question, Reponse, Tentative, verifierReponses };