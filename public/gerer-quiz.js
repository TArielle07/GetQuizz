/* =========================================================
   PAGE GÉRER UN QUIZ (gerer-quiz.html?id=...) — US05, US06, US07
   Liste des questions + Modifier, Supprimer (avec confirmation), Publier
   ========================================================= */
{
    let idQuiz = new URLSearchParams(window.location.search).get("id");

    let elTitre = document.querySelector("#gq-titre");
    let elStatut = document.querySelector("#gq-statut");
    let elDetails = document.querySelector("#gq-details");
    let elRetour = document.querySelector("#gq-retour");
    let elBtnPublier = document.querySelector("#btn-publier");
    let elMessage = document.querySelector("#gq-message");
    let elListe = document.querySelector("#gq-questions");

    function afficherMessage(texte, succes) {
        elMessage.textContent = texte;
        elMessage.className = "quiz-message" + (succes ? " succes" : "");
    }

    // Charger le quiz et ses questions (route du Sprint 2 : GET /api/quiz/:id)
    async function chargerQuiz() {
        try {
            let reponse = await fetch(API_URL + "/quiz/" + idQuiz);
            let donnees = await reponse.json();
            if (!reponse.ok) {
                elTitre.textContent = donnees.message || "Quiz introuvable.";
                return;
            }

            let quiz = donnees.quiz;
            elTitre.textContent = quiz.titre;
            elDetails.textContent = [quiz.theme, quiz.difficulte].filter(Boolean).join(" · ");

            // Statut Brouillon / Publié
            elStatut.textContent = quiz.publie ? "Publié" : "Brouillon";
            elStatut.className = "statut " + (quiz.publie ? "statut-publie" : "statut-brouillon");
            elBtnPublier.hidden = quiz.publie;

            // Le lien retour ramène à la bonne liste
            elRetour.href = quiz.publie ? "mes-quiz.html" : "brouillons.html";
            elRetour.textContent = quiz.publie ? "← Retour à mes quiz" : "← Retour aux brouillons";

            afficherQuestions(donnees.questions);
        } catch (error) {
            elTitre.textContent = "Impossible de charger le quiz.";
        }
    }

    // Une carte par question : intitulé, type, réponses, boutons
    function afficherQuestions(questions) {
        elListe.innerHTML = "";

        if (questions.length === 0) {
            let elVide = document.createElement("p");
            elVide.textContent = "Ce quiz n'a pas encore de question.";
            elListe.appendChild(elVide);
            return;
        }

        questions.forEach((question, index) => {
            let elCarte = document.createElement("article");
            elCarte.className = "quiz-question";

            let elTexte = document.createElement("h2");
            elTexte.textContent = (index + 1) + ". " + question.texte;

            let elType = document.createElement("p");
            elType.className = "gq-type";
            elType.textContent = question.type === "vrai_faux" ? "Vrai / Faux" : "Choix multiples";

            let elReponses = document.createElement("ul");
            elReponses.className = "gq-reponses";
            question.reponses.forEach(rep => {
                let elLi = document.createElement("li");
                elLi.textContent = rep.texte + (rep.estBonne ? " ✓ bonne réponse" : "");
                if (rep.estBonne) elLi.className = "gq-bonne";
                elReponses.appendChild(elLi);
            });

            let elActions = document.createElement("div");
            elActions.className = "gq-actions";

            // Bouton Modifier : ouvre la page d'édition de CETTE question
            let elModifier = document.createElement("a");
            elModifier.className = "bouton bouton-blanc";
            elModifier.href = "modifier-question.html?quiz=" + idQuiz + "&question=" + question._id;
            elModifier.textContent = "Modifier";

            // Bouton Supprimer : demande une confirmation avant
            let elSupprimer = document.createElement("button");
            elSupprimer.type = "button";
            elSupprimer.className = "bouton";
            elSupprimer.textContent = "Supprimer";
            elSupprimer.addEventListener("click", () => supprimerQuestion(question));

            elActions.append(elModifier, elSupprimer);
            elCarte.append(elTexte, elType, elReponses, elActions);
            elListe.appendChild(elCarte);
        });
    }

    // Supprimer une question (US06) : confirmation, puis DELETE
    async function supprimerQuestion(question) {
        let ok = confirm("Supprimer la question « " + question.texte + " » ?\nCette action est définitive.");
        if (!ok) return;

        try {
            let reponse = await fetch(API_URL + "/questions/" + question._id, { method: "DELETE" });
            let resultat = await reponse.json();
            afficherMessage(resultat.message, reponse.ok);
            if (reponse.ok) chargerQuiz();
        } catch (error) {
            afficherMessage("Impossible de joindre le serveur.", false);
        }
    }

    // Publier le brouillon (US07)
    elBtnPublier.addEventListener("click", async () => {
        try {
            let reponse = await fetch(API_URL + "/quiz/" + idQuiz + "/publier", { method: "PUT" });
            let resultat = await reponse.json();
            afficherMessage(resultat.message, reponse.ok);
            if (reponse.ok) chargerQuiz();
        } catch (error) {
            afficherMessage("Impossible de joindre le serveur.", false);
        }
    });

    chargerQuiz();
}