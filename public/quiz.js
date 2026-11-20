/* =========================================================
   PAGE PUBLIQUE D'UN QUIZ (quiz.html?id=...) — US08
   Afficher les questions, choisir les réponses, Soumettre
   ========================================================= */
{
    // L'identifiant du quiz est dans l'adresse : quiz.html?id=...
    let idQuiz = new URLSearchParams(window.location.search).get("id");

    let elForm = document.querySelector("#form-reponses");
    let elQuestions = document.querySelector("#quiz-questions");
    let elMessage = document.querySelector("#quiz-message");
    let elTitre = document.querySelector("#quiz-titre");
    let elDescription = document.querySelector("#quiz-description");
    let elBtnSoumettre = document.querySelector("#btn-soumettre");

    let questionsQuiz = [];
    let titreQuiz = "";

    // 1. Charger le quiz et afficher chaque question avec ses boutons radio
    async function chargerQuiz() {
        try {
            let reponse = await fetch(API_URL + "/etudiant/quiz/" + idQuiz);
            let donnees = await reponse.json();

            // Quiz introuvable ou brouillon : le serveur répond 404
            if (!reponse.ok) {
                elTitre.textContent = donnees.message || "Quiz introuvable.";
                elForm.hidden = true;
                return;
            }

            titreQuiz = donnees.quiz.titre;
            elTitre.textContent = titreQuiz;
            elDescription.textContent = donnees.quiz.description;
            questionsQuiz = donnees.questions;

            questionsQuiz.forEach((question, index) => {
                // Une question = un <fieldset> ; ses réponses = des boutons radio du même "name"
                let elBloc = document.createElement("fieldset");
                elBloc.className = "quiz-question";

                let elLegende = document.createElement("legend");
                elLegende.textContent = (index + 1) + ". " + question.texte;
                elBloc.appendChild(elLegende);

                question.reponses.forEach(rep => {
                    let elLabel = document.createElement("label");
                    elLabel.className = "quiz-reponse";

                    let elRadio = document.createElement("input");
                    elRadio.type = "radio";
                    elRadio.name = "q-" + question._id;
                    elRadio.value = rep._id;

                    elLabel.append(elRadio, document.createTextNode(rep.texte));
                    elBloc.appendChild(elLabel);
                });

                elQuestions.appendChild(elBloc);
            });
        } catch (error) {
            elTitre.textContent = "Impossible de charger le quiz.";
            elForm.hidden = true;
        }
    }

    // 2. Soumettre : vérifier que toutes les questions ont une réponse, puis envoyer
    elForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        elMessage.textContent = "";

        let reponses = [];
        let oubliees = [];

        questionsQuiz.forEach((question, index) => {
            let elBloc = elQuestions.children[index];
            let coche = elBloc.querySelector("input[type='radio']:checked");
            elBloc.classList.remove("erreur");

            if (coche) {
                reponses.push({ question: question._id, reponse: coche.value });
            } else {
                oubliees.push(index + 1);
                elBloc.classList.add("erreur");
            }
        });

        if (oubliees.length > 0) {
            elMessage.textContent = "Répondez à toutes les questions (question " + oubliees.join(", ") + ").";
            return;
        }

        elBtnSoumettre.disabled = true;

        try {
            let reponse = await fetch(API_URL + "/etudiant/quiz/" + idQuiz + "/soumettre", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reponses })
            });
            let resultat = await reponse.json();

            if (!reponse.ok) {
                elMessage.textContent = resultat.message || "Erreur lors de l'envoi.";
                elBtnSoumettre.disabled = false;
                return;
            }

            // On garde le résultat pour la page de confirmation
            sessionStorage.setItem("resultatQuiz", JSON.stringify({
                titre: titreQuiz,
                score: resultat.score,
                total: resultat.total
            }));
            window.location.href = "confirmation.html";

        } catch (error) {
            elMessage.textContent = "Impossible de joindre le serveur.";
            elBtnSoumettre.disabled = false;
        }
    });

    chargerQuiz();
}