const API_URL = "/api";

/* =========================================================
   PAGE DE CONNEXION (connexion.html) — Front 1
   ========================================================= */

let elFormConnexion = document.querySelector("#connexion");
let elNom = document.querySelector("#nom");
let elMotDePasse = document.querySelector("#password");
let elMessageErreur = document.querySelector("#messageErreur");

if (elFormConnexion) {
    elFormConnexion.addEventListener("submit", async (e) => {
        e.preventDefault();
        let ok = true;

        elMessageErreur.textContent = "";
        elNom.classList.remove("erreur");
        elMotDePasse.classList.remove("erreur");

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
                sessionStorage.setItem("nomUtilisateur", utilisateur.nom);

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
   PARTIE COMMUNE AUX PAGES ENSEIGNANT ET ÉTUDIANT
   (nom affiché, protection de la page, déconnexion)
   ========================================================= */

let elsNomUtilisateur = document.querySelectorAll(".nom-utilisateur");
let roleDeLaPage = document.body.dataset.role === "etudiant" ? "etudiant" : "enseignant";

if (elsNomUtilisateur.length > 0) {
    let routeNom = roleDeLaPage === "etudiant" ? "/etudiant" : "/enseignant";
    fetch(API_URL + routeNom)
        .then(reponse => {
            if (!reponse.ok) throw new Error();
            return reponse.json();
        })
        .then(utilisateur => {
            elsNomUtilisateur.forEach(el => el.textContent = utilisateur.nom);
        })
        .catch(() => {
            sessionStorage.removeItem("nomUtilisateur");
            window.location.href = "connexion.html";
        });
}

let elBtnDeconnexion = document.querySelector(".btn-deconnexion");

if (elBtnDeconnexion) {
    elBtnDeconnexion.addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch(API_URL + "/logout", { method: "POST" });
        sessionStorage.removeItem("nomUtilisateur");
        window.location.href = "connexion.html";
    });
}

/* =========================================================
   PAGE CRÉER UN QUIZ (creer-quiz.html) — Sprint 2
   ========================================================= */

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

let elApercuTitre = document.querySelector("#apercu-titre-quiz");
let elApercuCompteur = document.querySelector("#apercu-compteur");
let elApercuVide = document.querySelector("#apercu-vide");
let elApercuListe = document.querySelector("#apercu-liste");
let elModeleApercu = document.querySelector("#modele-apercu-item");

let compteurQuestions = 0;
let idQuizModifie = null;

if (elFormQuiz) {
    idQuizModifie = new URLSearchParams(window.location.search).get("id");

    if (idQuizModifie) {
        chargerQuizPourModification(idQuizModifie);
    } else {
        ajouterQuestion();
    }

    elBtnAjouterQuestion.addEventListener("click", () => {
        ajouterQuestion();
    });

    elListeQuestions.addEventListener("click", (e) => {
        let elQuestion = e.target.closest("[data-js='question']");

        if (e.target.dataset.js === "btn-supprimer-question") {
            let numero = elQuestion.querySelector(".question-titre").textContent;
            demanderConfirmation("Voulez-vous vraiment supprimer « " + numero + " » ? Cette action est irréversible.")
                .then(confirme => {
                    if (confirme) {
                        elQuestion.remove();
                        mettreAJourQuestions();
                    }
                });
        }

        if (e.target.dataset.js === "btn-ajouter-reponse") {
            ajouterReponse(elQuestion);
        }
    });

    elFormQuiz.addEventListener("input", mettreAJourApercu);
    elFormQuiz.addEventListener("change", mettreAJourApercu);

    elFormQuiz.addEventListener("input", (e) => {
        e.target.classList.remove("erreur");
    });

    elFormQuiz.addEventListener("submit", async (e) => {
        e.preventDefault();

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
            let url = idQuizModifie ? API_URL + "/quiz/" + idQuizModifie : API_URL + "/quiz";
            let reponse = await fetch(url, {
                method: idQuizModifie ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(quiz)
            });
            if (!reponse.ok) throw new Error();

            if (action === "publier") {
                afficherMessageQuiz("Le quiz a été publié !", "succes");
            } else {
                afficherMessageQuiz("Le quiz a été enregistré.", "succes");
            }

            setTimeout(() => {
                window.location.href = "enseignant.html";
            }, 1500);
        } catch (error) {
            afficherMessageQuiz("Une erreur est survenue lors de l'enregistrement", "erreur");
            elBoutons.forEach(bouton => bouton.disabled = false);
        }
    });
}

async function chargerQuizPourModification(id) {
    try {
        let reponse = await fetch(API_URL + "/quiz/" + id);
        if (!reponse.ok) throw new Error();
        let donnees = await reponse.json();
        let quiz = donnees.quiz;

        let elTitrePage = document.querySelector(".section-1 h2");
        if (elTitrePage) elTitrePage.textContent = "Modifier le quiz";
        document.title = "Modifier un quiz";

        elTitreQuiz.value = quiz.titre || "";
        elDescriptionQuiz.value = quiz.description || "";
        elThemeQuiz.value = quiz.theme || "";
        elDifficulte.value = quiz.difficulte || "";

        donnees.questions.forEach(question => {
            ajouterQuestion();
            let elQuestions = elListeQuestions.querySelectorAll("[data-js='question']");
            remplirQuestion(elQuestions[elQuestions.length - 1], question);
        });

        if (donnees.questions.length === 0) ajouterQuestion();

        mettreAJourApercu();
    } catch (error) {
        ajouterQuestion();
        afficherMessageQuiz("Impossible de charger ce quiz", "erreur");
    }
}

function remplirQuestion(elQuestion, question) {
    let estVF = question.type === "vrai_faux";
    elQuestion.querySelector("[data-js='type']").value = estVF ? "vf" : "choix";
    elQuestion.querySelector("[data-js='texte']").value = question.texte;

    if (estVF) {
        let bonne = question.reponses.find(r => r.estBonne);
        if (bonne) {
            let valeur = bonne.texte.toLowerCase() === "vrai" ? "vrai" : "faux";
            elQuestion.querySelector(".bloc-vf input[value='" + valeur + "']").checked = true;
        }
        return;
    }

    while (elQuestion.querySelectorAll(".reponse").length < Math.min(question.reponses.length, MAX_REPONSES)) {
        ajouterReponse(elQuestion);
    }
    let elReponses = elQuestion.querySelectorAll(".reponse");
    question.reponses.slice(0, MAX_REPONSES).forEach((reponse, i) => {
        elReponses[i].querySelector("input[type='text']").value = reponse.texte;
        elReponses[i].querySelector("input[type='radio']").checked = reponse.estBonne;
    });
}

function demanderConfirmation(message) {
    let elDialogue = document.querySelector("#dialogue-confirmation");

    if (!elDialogue) return Promise.resolve(window.confirm(message));

    elDialogue.querySelector("#dialogue-message").textContent = message;

    return new Promise(resolve => {
        let elAnnuler = elDialogue.querySelector("#dialogue-annuler");
        let elConfirmer = elDialogue.querySelector("#dialogue-confirmer");

        function terminer(reponse) {
            elAnnuler.removeEventListener("click", annuler);
            elConfirmer.removeEventListener("click", confirmer);
            elDialogue.removeEventListener("cancel", annuler);
            elDialogue.close();
            resolve(reponse);
        }
        function annuler() { terminer(false); }
        function confirmer() { terminer(true); }

        elAnnuler.addEventListener("click", annuler);
        elConfirmer.addEventListener("click", confirmer);
        elDialogue.addEventListener("cancel", annuler);

        elDialogue.showModal();
        elAnnuler.focus();
    });
}

function ajouterQuestion() {
    compteurQuestions++;
    let html = elModeleQuestion.innerHTML.replaceAll("QID", "q" + compteurQuestions);
    elListeQuestions.insertAdjacentHTML("beforeend", html);
    mettreAJourQuestions();
}

function ajouterReponse(elQuestion) {
    let elReponses = elQuestion.querySelector("[data-js='reponses']");
    let nbReponses = elReponses.querySelectorAll(".reponse").length;
    if (nbReponses >= MAX_REPONSES) return;

    let nomRadio = elReponses.querySelector("input[type='radio']").name;
    let numero = nbReponses + 1;

    elReponses.insertAdjacentHTML("beforeend", `
        <div class="reponse">
            <input type="radio" name="${nomRadio}" value="${nbReponses}" aria-label="Bonne réponse ${numero}">
            <input type="text" placeholder="[Réponse ${numero}]" aria-label="Réponse ${numero}">
        </div>
    `);

    if (numero >= MAX_REPONSES) {
        elQuestion.querySelector("[data-js='btn-ajouter-reponse']").hidden = true;
    }
}

function mettreAJourQuestions() {
    let elQuestions = elListeQuestions.querySelectorAll("[data-js='question']");

    elQuestions.forEach((elQuestion, index) => {
        elQuestion.querySelector(".question-titre").textContent = "Question " + (index + 1);
        elQuestion.querySelector("[data-js='btn-supprimer-question']").disabled = elQuestions.length === 1;
    });

    mettreAJourApercu();
}

function mettreAJourApercu() {
    let titre = elTitreQuiz.value.trim();
    elApercuTitre.textContent = titre || "[Titre du quiz]";

    let elQuestions = elListeQuestions.querySelectorAll("[data-js='question']");
    let questionsRemplies = [];

    elQuestions.forEach(elQuestion => {
        let texte = elQuestion.querySelector("[data-js='texte']").value.trim();
        let type = elQuestion.querySelector("[data-js='type']").value;
        let bonneReponse = trouverBonneReponse(elQuestion, type);
        if (texte.length > 0) {
            questionsRemplies.push({ texte, type, bonneReponse });
        }
    });

    elApercuListe.innerHTML = "";
    questionsRemplies.forEach((question, index) => {
        let elItem = elModeleApercu.content.cloneNode(true);
        elItem.querySelector(".apercu-numero").textContent = index + 1;
        elItem.querySelector(".apercu-question").textContent = question.texte;
        elItem.querySelector(".apercu-type").textContent =
            question.type === "vf" ? "Vrai / Faux" : "Choix multiples";

        let elBonne = elItem.querySelector(".apercu-bonne");
        if (question.bonneReponse) {
            elBonne.textContent = "✓ Bonne réponse : " + question.bonneReponse;
        } else {
            elBonne.textContent = "Bonne réponse : pas encore choisie";
            elBonne.classList.add("manquante");
        }
        elApercuListe.appendChild(elItem);
    });

    let nb = questionsRemplies.length;
    elApercuCompteur.textContent = nb + (nb > 1 ? " questions" : " question");
    elApercuVide.hidden = nb > 0;
}

function trouverBonneReponse(elQuestion, type) {
    if (type === "vf") {
        let coche = elQuestion.querySelector(".bloc-vf input[type='radio']:checked");
        if (!coche) return "";
        return coche.value === "vrai" ? "Vrai" : "Faux";
    }

    let coche = elQuestion.querySelector(".reponse input[type='radio']:checked");
    if (!coche) return "";
    return coche.nextElementSibling.value.trim();
}

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
            let coche = elQuestion.querySelector(".bloc-vf input[type='radio']:checked");
            if (!coche) {
                elQuestion.querySelector(".vf-options").classList.add("erreur");
                erreur = erreur || "Question " + numero + " : choisissez Vrai ou Faux";
            }
        } else {
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

function recupererQuestions() {
    let questions = [];
    let elQuestions = elListeQuestions.querySelectorAll("[data-js='question']");

    elQuestions.forEach(elQuestion => {
        let texte = elQuestion.querySelector("[data-js='texte']").value.trim();
        let type = elQuestion.querySelector("[data-js='type']").value;
        let reponses = [];

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

                if (texteReponse.length > 0) {
                    reponses.push({ texte: texteReponse, correcte: elRadio.checked });
                }
            });
        }

        questions.push({ texte, type, reponses });
    });

    return questions;
}

function effacerErreurs() {
    elMessageQuiz.textContent = "";
    document.querySelectorAll(".erreur").forEach(el => el.classList.remove("erreur"));
}

function afficherMessageQuiz(texte, type) {
    elMessageQuiz.textContent = texte;
    elMessageQuiz.className = "message-quiz message-" + type;
}

/* =========================================================
   PAGE MOT DE PASSE (mot-de-passe.html)
   ========================================================= */

let elFormMotDePasse = document.querySelector("#form-mot-de-passe");

if (elFormMotDePasse) {
    elFormMotDePasse.addEventListener("submit", async (e) => {
        e.preventDefault();

        let elMessage = document.querySelector("#messageErreur");
        let ancien = document.querySelector("#ancien").value;
        let nouveau = document.querySelector("#nouveau").value;
        let confirmation = document.querySelector("#confirm").value;

        elMessage.style.color = "";

        if (!ancien || !nouveau || !confirmation) {
            elMessage.textContent = "Veuillez remplir tous les champs";
            return;
        }
        if (nouveau.length < 8) {
            elMessage.textContent = "Le nouveau mot de passe doit avoir au moins 8 caractères";
            return;
        }
        if (nouveau !== confirmation) {
            elMessage.textContent = "Les deux nouveaux mots de passe ne sont pas identiques";
            return;
        }

        try {
            let reponse = await fetch(API_URL + "/mot-de-passe", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ancien, nouveau })
            });
            let resultat = await reponse.json();

            elMessage.textContent = resultat.message;
            if (reponse.ok) {
                elMessage.style.color = "green";
                elFormMotDePasse.reset();
            }
        } catch (error) {
            elMessage.textContent = "Impossible de joindre le serveur";
        }
    });
}

/* =========================================================
   PAGES MES QUIZ (mes-quiz.html) ET BROUILLONS (brouillons.html)
   ========================================================= */

let elListeQuizPublies = document.querySelector("#quiz-list");
let elListeBrouillons = document.querySelector("#draft-list");

if (elListeQuizPublies) {
    afficherListeQuiz("publie", elListeQuizPublies, document.querySelector("#quiz-empty"));
}
if (elListeBrouillons) {
    afficherListeQuiz("brouillon", elListeBrouillons, document.querySelector("#draft-empty"));
}

async function afficherListeQuiz(statut, elListe, elVide) {
    try {
        let reponse = await fetch(API_URL + "/quiz?statut=" + statut);
        if (!reponse.ok) throw new Error("Statut " + reponse.status);
        let listeQuiz = await reponse.json();

        if (listeQuiz.length === 0) return;

        elVide.style.display = "none";
        elListe.hidden = false;

        listeQuiz.forEach(quiz => {
            let estPublie = typeof quiz.publie === "boolean" ? quiz.publie : statut === "publie";

            let elCarte = document.createElement("article");
            elCarte.className = "carte " + (estPublie ? "carte-turquoise" : "carte-rose-clair");

            let elStatut = document.createElement("span");
            elStatut.className = "statut " + (estPublie ? "statut-publie" : "statut-brouillon");
            elStatut.textContent = estPublie ? "Publié" : "Brouillon";

            let elTitre = document.createElement("h2");
            elTitre.textContent = quiz.titre;

            let elDescription = document.createElement("p");
            elDescription.className = "carte-texte";
            elDescription.textContent = quiz.description || "Pas de description";

            let elDetails = document.createElement("p");
            elDetails.className = "carte-texte";
            let date = quiz.updatedAt ? new Date(quiz.updatedAt).toLocaleDateString("fr-CA") : "";
            elDetails.textContent = [quiz.theme, quiz.difficulte, date].filter(Boolean).join(" · ");

            let elModifier = document.createElement("a");
            elModifier.className = "bouton bouton-blanc";
            elModifier.href = "gerer-quiz.html?id=" + quiz._id;
            elModifier.textContent = "Modifier";
            elModifier.setAttribute("aria-label", "Modifier le quiz " + quiz.titre);

            elCarte.append(elStatut, elTitre, elDescription, elDetails, elModifier);
            elListe.appendChild(elCarte);
        });
    } catch (error) {
        console.log("Impossible de charger les quiz :", error);
    }
}