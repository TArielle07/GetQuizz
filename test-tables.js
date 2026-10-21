// Test : tables, relations et règles QCM / Vrai-Faux
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();

const mongoose = require('mongoose');
const { User, Quiz, Question, Reponse, verifierReponses } = require('./models');

async function tester() {
    await mongoose.connect(process.env.MONGO_URI);

    // 1. Relations : enseignant → quiz → questions → réponses
    const enseignant = await User.findOne({ role: 'enseignant' });
    if (!enseignant) throw new Error('Aucun enseignant dans la base');

    const quiz = await Quiz.create({
        titre: 'Quiz test',
        description: 'Créé par test-tables.js',
        enseignant: enseignant._id
    });

    // Question Vrai/Faux
    const qVF = await Question.create({ quiz: quiz._id, texte: 'La Terre est ronde ?', type: 'vrai_faux' });
    await Reponse.create([
        { question: qVF._id, texte: 'Vrai', estBonne: true },
        { question: qVF._id, texte: 'Faux', estBonne: false }
    ]);

    // Question QCM
    const qQCM = await Question.create({ quiz: quiz._id, texte: 'Combien font 2 + 2 ?', type: 'qcm' });
    await Reponse.create([
        { question: qQCM._id, texte: '3', estBonne: false },
        { question: qQCM._id, texte: '4', estBonne: true },
        { question: qQCM._id, texte: '5', estBonne: false }
    ]);

    // On remonte de la bonne réponse jusqu'à l'enseignant
    const reponse = await Reponse.findOne({ question: qVF._id, estBonne: true })
        .populate({ path: 'question', populate: { path: 'quiz', populate: { path: 'enseignant' } } });

    console.log('--- Relations ---');
    console.log('Bonne réponse :', reponse.texte);
    console.log('Question      :', reponse.question.texte);
    console.log('Quiz          :', reponse.question.quiz.titre);
    console.log('Enseignant    :', reponse.question.quiz.enseignant.nom);

    // 2. Règles
    const six = [1, 2, 3, 4, 5, 6].map(n => ({ texte: 'R' + n, estBonne: n === 1 }));
    console.log('--- Règles ---');
    console.log('QCM avec 6 réponses     :', verifierReponses('qcm', six));
    console.log('QCM sans bonne réponse  :', verifierReponses('qcm', [{ texte: 'A' }, { texte: 'B' }]));
    console.log('V/F avec 3 réponses     :', verifierReponses('vrai_faux', [
        { texte: 'Vrai', estBonne: true }, { texte: 'Faux' }, { texte: 'Peut-être' }
    ]));
    console.log('V/F correct (null = OK) :', verifierReponses('vrai_faux', [
        { texte: 'Vrai', estBonne: true }, { texte: 'Faux' }
    ]));

    await mongoose.disconnect();
}

tester().catch(err => {
    console.error('Erreur :', err.message);
    process.exit(1);
});