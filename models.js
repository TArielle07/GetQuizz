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
    // Relation : le quiz appartient à un enseignant
    enseignant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publie: { type: Boolean, default: false }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema, 'quiz');


module.exports = { User, Quiz };