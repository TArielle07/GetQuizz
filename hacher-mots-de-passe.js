//hache les mots de passe encore claire dans la base
//Les mots de passe deja hachés sont ignorés

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

async function hacher() {
    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find();
    for (const user of users) {
        // Un hachage bcrypt commence toujours par $2
        if (user.mot_de_passe.startsWith('$2')) continue;

        const hache = await bcrypt.hash(user.mot_de_passe, 10);
        await User.updateOne({ _id: user._id }, { mot_de_passe: hache });
        console.log(`Mot de passe haché pour ${user.nom}`);
    }

    await mongoose.disconnect();
    console.log('Terminé.');
}

hacher().catch(err => {
    console.error('Erreur :', err.message);
    process.exit(1);
});