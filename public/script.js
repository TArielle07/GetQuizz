const API_URL = "/api";

/* =========================================================
   PAGE DE CONNEXION (connexion.html) — Front 1
   ========================================================= */

let elFormConnexion = document.querySelector("#connexion");
let elNom = document.querySelector("#nom");
let elMotDePasse = document.querySelector("#password");
let elMessageErreur = document.querySelector("#messageErreur");

// On vérifie que le formulaire existe (il est seulement dans connexion.html)
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

// Afficher / cacher le mot de passe (icône de l'œil dans connexion.html)
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

/* =========================================================
   PARTIE COMMUNE AUX PAGES ENSEIGNANT
   (enseignant.html et creer-quiz.html) — Front 2
   ========================================================= */

let elNomUtilisateur = document.querySelector("#nomUtilisateur");

// Afficher le nom de la personne connectée
// Si personne n'est connecté, retour à la page de connexion
if (elNomUtilisateur) {
    fetch(API_URL + "/enseignant")
        .then(reponse => {
            if (!reponse.ok) {
                window.location.href = "connexion.html";
                return;
            }
            return reponse.json();
        })
        .then(utilisateur => {
            if (utilisateur && utilisateur.nom) {
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

/* =========================================================
   PAGE CRÉER UN QUIZ (creer-quiz.html) — Sprint 2
   US02 : créer un quiz (titre + description)
   US03 : ajouter une question
   US04 : définir les réponses possibles et la bonne réponse
   ========================================================= */

const MAX_QUESTIONS = 5;
const MAX_REPONSES = 5;

let elFormQuiz = document.querySelector("#form-quiz");
let elTitreQuiz = document.querySelector("#titre-quiz");
let elDescriptionQuiz = document.querySelector("#description-quiz");
let elThemeQuiz = document.querySelector("#theme-quiz");
let elDifficulte = document.querySelector("#barre-echelle");
let elListeQuestions = document.querySelector("#liste-questions");
let elModeleQuestion = document.querySelector("#modele-question");
let elBtnAjouterQuestion = document.querySelector("#btn-ajouter-question");
let elMessageQuiz = document.querySelector("#message-quiz");

// Aperçu (colonne de droite)
let elApercuTitre = document.querySelector("#apercu-titre-quiz");
let elApercuCompteur = document.querySelector("#apercu-compteur");
let elApercuProgression = document.querySelector("#apercu-progression");
let elApercuRemplie = document.querySelector("#apercu-progression-remplie");
let elApercuVide = document.querySelector("#apercu-vide");
let elApercuListe = document.querySelector("#apercu-liste");
let elModeleApercu = document.querySelector("#modele-apercu-item");

// Sert à donner un id unique à chaque question (q1, q2, q3...)
let compteurQuestions = 0;

// On vérifie que le formulaire existe (il est seulement dans creer-quiz.html)
if (elFormQuiz) {
    ajouterQuestion(); // la question 1 apparaît au chargement

    // Bouton "+ Ajouter une question"
    elBtnAjouterQuestion.addEventListener("click", () => {
        ajouterQuestion();
    });

    // Un seul écouteur pour tous les boutons des questions
    // (les questions sont ajoutées après le chargement, donc on écoute la liste)
    elListeQuestions.addEventListener("click", (e) => {
        let elQuestion = e.target.closest("[data-js='question']");

        if (e.target.dataset.js === "btn-supprimer-question") {
            elQuestion.remove();
            mettreAJourQuestions();
        }

        if (e.target.dataset.js === "btn-ajouter-reponse") {
            ajouterReponse(elQuestion);
        }
    });

    // L'aperçu se met à jour à chaque fois qu'on tape ou change quelque chose
    elFormQuiz.addEventListener("input", mettreAJourApercu);
    elFormQuiz.addEventListener("change", mettreAJourApercu);

    // Le contour rouge disparaît dès qu'on corrige le champ
    elFormQuiz.addEventListener("input", (e) => {
        e.target.classList.remove("erreur");
    });

    // Boutons Enregistrer et Publier
    elFormQuiz.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Quel bouton a été cliqué ? "brouillon" ou "publier"
        let action = e.submitter ? e.submitter.value : "brouillon";

        effacerErreurs();
        let erreur = validerQuiz(action);

        if (erreur) {
            afficherMessageQuiz(erreur, "erreur");
            return;
        }

        let quiz = {
            titre: elTitreQuiz.value.trim(),
            description: elDescriptionQuiz.value.trim(),
            theme: elThemeQuiz.value.trim(),
            difficulte: elDifficulte.value,
            statut: action === "publier" ? "publie" : "brouillon",
            questions: recupererQuestions()
        };

        let elBoutons = document.querySelectorAll(".apercu-actions button");
        elBoutons.forEach(bouton => bouton.disabled = true);

        try {
            // TODO : confirmer la route et les noms des champs avec Back
            let reponse = await fetch(API_URL + "/quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(quiz)
            });
            if (!reponse.ok) throw new Error();

            if (action === "publier") {
                afficherMessageQuiz("Le quiz a été publié !", "succes");
            } else {
                afficherMessageQuiz("Le quiz a été enregistré.", "succes");
            }

            // Retour au tableau de bord, où le quiz apparaît
            setTimeout(() => {
                window.location.href = "enseignant.html";
            }, 1500);

        } catch (error) {
            afficherMessageQuiz("Une erreur est survenue lors de l'enregistrement", "erreur");
            elBoutons.forEach(bouton => bouton.disabled = false);
        }
    });
}

// Ajoute une question à partir du modèle <template id="modele-question">
function ajouterQuestion() {
    let nbQuestions = elListeQuestions.querySelectorAll("[data-js='question']").length;
    if (nbQuestions >= MAX_QUESTIONS) return;

    compteurQuestions++;

    // On remplace QID par q1, q2... pour que les id et les boutons radio soient uniques
    let html = elModeleQuestion.innerHTML.replaceAll("QID", "q" + compteurQuestions);
    elListeQuestions.insertAdjacentHTML("beforeend", html);

    mettreAJourQuestions();
}

// Ajoute une ligne de réponse (5 réponses au maximum)
function ajouterReponse(elQuestion) {
    let elReponses = elQuestion.querySelector("[data-js='reponses']");
    let nbReponses = elReponses.querySelectorAll(".reponse").length;
    if (nbReponses >= MAX_REPONSES) return;

    // Le nom des boutons radio est le même pour toute la question (ex. q1-bonne)
    let nomRadio = elReponses.querySelector("input[type='radio']").name;
    let numero = nbReponses + 1;

    elReponses.insertAdjacentHTML("beforeend", `
        <div class="reponse">
            <input type="radio" name="${nomRadio}" value="${nbReponses}" aria-label="Bonne réponse ${numero}">
            <input type="text" placeholder="[Réponse ${numero}]" aria-label="Réponse ${numero}">
        </div>
    `);

    // On cache le bouton quand on arrive à 5 réponses
    if (numero >= MAX_REPONSES) {
        elQuestion.querySelector("[data-js='btn-ajouter-reponse']").hidden = true;
    }
}

// Renumérote les questions et active / désactive les boutons
function mettreAJourQuestions() {
    let elQuestions = elListeQuestions.querySelectorAll("[data-js='question']");

    elQuestions.forEach((elQuestion, index) => {
        elQuestion.querySelector(".question-titre").textContent = "Question " + (index + 1);

        // On ne peut pas supprimer la dernière question qui reste
        elQuestion.querySelector("[data-js='btn-supprimer-question']").disabled = elQuestions.length === 1;
    });

    elBtnAjouterQuestion.disabled = elQuestions.length >= MAX_QUESTIONS;

    mettreAJourApercu();
}

// Met à jour la colonne "Aperçu du quiz"
function mettreAJourApercu() {
    // Titre
    let titre = elTitreQuiz.value.trim();
    elApercuTitre.textContent = titre || "[Titre du quiz]";

    // On garde seulement les questions qui ont un intitulé
    let elQuestions = elListeQuestions.querySelectorAll("[data-js='question']");
    let questionsRemplies = [];

    elQuestions.forEach(elQuestion => {
        let texte = elQuestion.querySelector("[data-js='texte']").value.trim();
        let type = elQuestion.querySelector("[data-js='type']").value;
        if (texte.length > 0) {
            questionsRemplies.push({ texte, type });
        }
    });

    // Liste
    elApercuListe.innerHTML = "";
    questionsRemplies.forEach((question, index) => {
        let elItem = elModeleApercu.content.cloneNode(true);
        elItem.querySelector(".apercu-numero").textContent = index + 1;
        elItem.querySelector(".apercu-question").textContent = question.texte;
        elItem.querySelector(".apercu-type").textContent =
            question.type === "vf" ? "Vrai / Faux" : "Choix multiples";
        elApercuListe.appendChild(elItem);
    });

    // Compteur et barre de progression
    let nb = questionsRemplies.length;
    elApercuCompteur.textContent = nb + " / " + MAX_QUESTIONS + " questions";
    elApercuRemplie.style.width = (nb / MAX_QUESTIONS) * 100 + "%";
    elApercuProgression.setAttribute("aria-valuenow", nb);

    // Message "Aucune question..."
    elApercuVide.hidden = nb > 0;
}

// Vérifie le formulaire. Retourne le message de la première erreur, ou "" si tout est bon.
// Brouillon : seulement le titre est obligatoire.
// Publier : tout doit être rempli.
function validerQuiz(action) {
    let erreur = "";

    if (elTitreQuiz.value.trim().length === 0) {
        elTitreQuiz.classList.add("erreur");
        erreur = erreur || "Veuillez entrer un titre pour le quiz";
    }

    if (action === "brouillon") return erreur;

    if (elDescriptionQuiz.value.trim().length === 0) {
        elDescriptionQuiz.classList.add("erreur");
        erreur = erreur || "Veuillez entrer une description";
    }
    if (elThemeQuiz.value.trim().length === 0) {
        elThemeQuiz.classList.add("erreur");
        erreur = erreur || "Veuillez entrer un thème";
    }
    if (elDifficulte.value === "") {
        elDifficulte.classList.add("erreur");
        erreur = erreur || "Veuillez choisir la difficulté du quiz";
    }

    let elQuestions = elListeQuestions.querySelectorAll("[data-js='question']");

    elQuestions.forEach((elQuestion, index) => {
        let numero = index + 1;
        let elTexte = elQuestion.querySelector("[data-js='texte']");
        let type = elQuestion.querySelector("[data-js='type']").value;

        if (elTexte.value.trim().length === 0) {
            elTexte.classList.add("erreur");
            erreur = erreur || "La question " + numero + " n'a pas d'intitulé";
        }

        if (type === "vf") {
            // Vrai / Faux : il faut cocher Vrai ou Faux
            let coche = elQuestion.querySelector(".bloc-vf input[type='radio']:checked");
            if (!coche) {
                elQuestion.querySelector(".vf-options").classList.add("erreur");
                erreur = erreur || "Question " + numero + " : choisissez Vrai ou Faux";
            }
        } else {
            // Choix multiples : au moins 2 réponses, et la bonne réponse cochée doit être remplie
            let elChampsReponses = elQuestion.querySelectorAll(".reponse input[type='text']");
            let nbRemplies = 0;
            elChampsReponses.forEach(champ => {
                if (champ.value.trim().length > 0) nbRemplies++;
            });

            let coche = elQuestion.querySelector(".reponse input[type='radio']:checked");

            if (nbRemplies < 2) {
                elQuestion.querySelector("[data-js='reponses']").classList.add("erreur");
                erreur = erreur || "Question " + numero + " : entrez au moins 2 réponses";
            } else if (!coche) {
                elQuestion.querySelector("[data-js='reponses']").classList.add("erreur");
                erreur = erreur || "Question " + numero + " : cochez la bonne réponse";
            } else if (coche.nextElementSibling.value.trim().length === 0) {
                coche.nextElementSibling.classList.add("erreur");
                erreur = erreur || "Question " + numero + " : la bonne réponse cochée est vide";
            }
        }
    });

    return erreur;
}

// Transforme les questions du formulaire en objets à envoyer au serveur
function recupererQuestions() {
    let questions = [];
    let elQuestions = elListeQuestions.querySelectorAll("[data-js='question']");

    elQuestions.forEach(elQuestion => {
        let texte = elQuestion.querySelector("[data-js='texte']").value.trim();
        let type = elQuestion.querySelector("[data-js='type']").value;
        let reponses = [];

        // Une question vide (possible dans un brouillon) n'est pas envoyée
        if (texte.length === 0) return;

        if (type === "vf") {
            let coche = elQuestion.querySelector(".bloc-vf input[type='radio']:checked");
            let bonne = coche ? coche.value : "";
            reponses.push({ texte: "Vrai", correcte: bonne === "vrai" });
            reponses.push({ texte: "Faux", correcte: bonne === "faux" });
        } else {
            elQuestion.querySelectorAll(".reponse").forEach(elReponse => {
                let elRadio = elReponse.querySelector("input[type='radio']");
                let texteReponse = elReponse.querySelector("input[type='text']").value.trim();

                // On ignore les réponses laissées vides
                if (texteReponse.length > 0) {
                    reponses.push({ texte: texteReponse, correcte: elRadio.checked });
                }
            });
        }

        questions.push({ texte, type, reponses });
    });

    return questions;
}

// Enlève le contour rouge de tous les champs
function effacerErreurs() {
    elMessageQuiz.textContent = "";
    document.querySelectorAll(".erreur").forEach(el => el.classList.remove("erreur"));
}

// Affiche un message sous les boutons Enregistrer / Publier
function afficherMessageQuiz(texte, type) {
    elMessageQuiz.textContent = texte;
    elMessageQuiz.className = "message-quiz message-" + type;
}

// TODO : afficher la liste des quiz de l'enseignant (mes-quiz.html)

/* =========================================================
   PAGE ÉTUDIANT (etudiant.html) — Front 1
   ========================================================= */

// TODO : afficher la liste des quiz