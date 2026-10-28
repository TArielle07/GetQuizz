const API_URL = "/api";

/* =========================================================
   PAGE DE CONNEXION (login.html) — Front 1
   ========================================================= */

let elFormConnexion = document.querySelector("#connexion");
let elNom = document.querySelector("#nom");
let elMotDePasse = document.querySelector("#password");
let elMessageErreur = document.querySelector("#messageErreur");

// On vérifie que le formulaire existe (il est seulement dans login.html)
if (elFormConnexion) {
    elFormConnexion.addEventListener("submit", async (e) => {
        e.preventDefault();
        let ok = true;

        // On efface les anciennes erreurs
        elMessageErreur.textContent = "";
        elNom.classList.remove("erreur");
        elMotDePasse.classList.remove("erreur");

        // Validation des champs
        if (elNom.value.trim().length === 0) {
            elMessageErreur.textContent = "Veuillez entrer votre nom";
            elNom.classList.add("erreur");
            ok = false;
        }
        if (elMotDePasse.value.length === 0) {
            elMessageErreur.textContent = "Veuillez entrer votre mot de passe";
            elMotDePasse.classList.add("erreur");
            ok = false;
        }
        if (elNom.value.trim().length === 0 && elMotDePasse.value.length === 0) {
            elMessageErreur.textContent = "Veuillez remplir tous les champs";
        }

        if (ok) {
            try {
                let reponse = await fetch(API_URL + "/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nom: elNom.value.trim(),
                        motDePasse: elMotDePasse.value
                    })
                });
                if (!reponse.ok) throw new Error();

                let utilisateur = await reponse.json();

                // Redirection selon le rôle
                if (utilisateur.role === "enseignant") {
                    window.location.href = "enseignant.html";
                } else {
                    window.location.href = "etudiant.html";
                }
            } catch (error) {
                elMessageErreur.textContent = "Nom ou mot de passe incorrect";
            }
        }
    });
}

/* =========================================================
   PAGE ENSEIGNANT (enseignant.html) — Front 2
   ========================================================= */

/*let elDashboard = document.querySelector("#dashboard");

// Si quelqu'un ouvre le dashboard sans être connecté, retour à la connexion
if (elDashboard) {
    verifierConnexion();
}

async function verifierConnexion() {
    try {
        let reponse = await fetch(API_URL + "/me");
        if (!reponse.ok) throw new Error();
    } catch (error) {
        window.location.href = "login.html";
    }
}

let elBtnDeconnexion = document.querySelector("#btn-deconnexion");

// Le bouton est dans enseignant.html (et plus tard etudiant.html)
if (elBtnDeconnexion) {
    elBtnDeconnexion.addEventListener("click", async () => {
        try {
            await fetch(API_URL + "/logout", { method: "POST" });
        } catch (error) {
            console.log("Erreur lors de la déconnexion");
        }
        window.location.href = "login.html";
    });
}*/

let elNomUtilisateur = document.querySelector("#nomUtilisateur");

// Afficher le nom de la personne connectée
if (elNomUtilisateur) {
    fetch(API_URL + "/enseignant")
        .then(reponse => reponse.json())
        .then(utilisateur => {
            if (utilisateur.nom) {
                elNomUtilisateur.textContent = utilisateur.nom;
            }
        });
}

// Déconnexion : fermer la session avant de quitter la page
let elBtnDeconnexion = document.querySelector(".btn-deconnexion");

if (elBtnDeconnexion) {
    elBtnDeconnexion.addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch(API_URL + "/logout", { method: "POST" });
        window.location.href = "connexion.html";
    });
}

// Afficher / cacher le mot de passe (icône de l'œil)
function togglePassword(idChamp, icone) {
    let elChamp = document.getElementById(idChamp);

    if (elChamp.type === "password") {
        elChamp.type = "text";
        icone.classList.replace("fa-eye-slash", "fa-eye");
    } else {
        elChamp.type = "password";
        icone.classList.replace("fa-eye", "fa-eye-slash");
    }
}



// Afficher / cacher le mot de passe (icône de l'œil)
function togglePassword(idChamp, icone) {
    let elChamp = document.getElementById(idChamp);

    if (elChamp.type === "password") {
        elChamp.type = "text";
        icone.classList.replace("fa-eye-slash", "fa-eye");
    } else {
        elChamp.type = "password";
        icone.classList.replace("fa-eye", "fa-eye-slash");
    }
}


// TODO Sprint 2 : afficher les quiz de l'enseignant

/* =========================================================
   PAGE ÉTUDIANT (etudiant.html) — Front 1
   ========================================================= */

// TODO Sprint 2 : afficher la liste des quiz
