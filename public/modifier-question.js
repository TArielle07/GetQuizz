/* =========================================================
   PAGE MODIFIER UNE QUESTION (modifier-question.html?quiz=...&question=...)
   US05 : modifier une question   |   US06 : supprimer une question
   ========================================================= */
{
    let params = new URLSearchParams(window.location.search);
    let idQuiz = params.get("quiz");
    let idQuestion = params.get("question");
    let pageQuiz = "gerer-quiz.html?id=" + idQuiz;

    let elForm = document.querySelector("#form-question");
    let elType = document.querySelector("#mq-type");
    let elTexte = document.querySelector("#mq-texte");
    let elBlocChoix = document.querySelector("#mq-bloc-choix");
    let elBlocVf = document.querySelector("#mq-bloc-vf");
    let elReponses = document.querySelector("#mq-reponses");
    let elMessage = document.querySelector("#mq-message");
    let elSupprimer = document.querySelector("#mq-supprimer");

    document.querySelector("#mq-retour").href = pageQuiz;

    function afficherMessage(texte, succes) {
        elMessage.textContent = texte;
        elMessage.className = "quiz-message" + (succes ? " succes" : "");
    }

    // 5 lignes de réponse (5 au maximum pour un QCM)
    for (let i = 0; i < 5; i++) {
        elReponses.insertAdjacentHTML("beforeend", `
            <div class="mq-ligne">
                <input type="radio" name="mq-bonne" value="${i}" aria-label="Bonne réponse ${i + 1}">
                <input type="text" placeholder="[Réponse ${i + 1}]" aria-label="Réponse ${i + 1}">
            </div>
        `);
    }
    let elLignes = elReponses.querySelectorAll(".mq-ligne");

    // Afficher le bon bloc selon le type choisi
    function changerType() {
        elBlocChoix.hidden = elType.value === "vf";
        elBlocVf.hidden = elType.value !== "vf";
    }
    elType.addEventListener("change", changerType);

    // 1. Charger la question et remplir le formulaire
    async function chargerQuestion() {
        try {
            let reponse = await fetch(API_URL + "/quiz/" + idQuiz);
            let donnees = await reponse.json();
            let question = reponse.ok ? donnees.questions.find(q => q._id === idQuestion) : null;

            if (!question) {
                afficherMessage("Question introuvable.", false);
                elForm.querySelectorAll("button, input, select").forEach(el => el.disabled = true);
                return;
            }

            elTexte.value = question.texte;

            if (question.type === "vrai_faux") {
                elType.value = "vf";
                let bonne = question.reponses.find(r => r.estBonne);
                if (bonne) {
                    let valeur = bonne.texte === "Vrai" ? "vrai" : "faux";
                    elBlocVf.querySelector(`input[value="${valeur}"]`).checked = true;
                }
            } else {
                elType.value = "choix";
                question.reponses.forEach((rep, i) => {
                    if (i >= elLignes.length) return;
                    elLignes[i].querySelector("input[type='text']").value = rep.texte;
                    elLignes[i].querySelector("input[type='radio']").checked = rep.estBonne;
                });
            }
            changerType();
        } catch (error) {
            afficherMessage("Impossible de charger la question.", false);
        }
    }

    // 2. Préparer les réponses au format du serveur : [ { texte, correcte } ]
    function recupererReponses() {
        if (elType.value === "vf") {
            let coche = elBlocVf.querySelector("input:checked");
            let bonne = coche ? coche.value : "";
            return [
                { texte: "Vrai", correcte: bonne === "vrai" },
                { texte: "Faux", correcte: bonne === "faux" }
            ];
        }
        let reponses = [];
        elLignes.forEach(ligne => {
            let texte = ligne.querySelector("input[type='text']").value.trim();
            if (texte.length > 0) {
                reponses.push({ texte, correcte: ligne.querySelector("input[type='radio']").checked });
            }
        });
        return reponses;
    }

    // 3. Enregistrer : vérifier, puis PUT /api/questions/:id
    elForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        let texte = elTexte.value.trim();
        let reponses = recupererReponses();
        let nbBonnes = reponses.filter(r => r.correcte).length;

        if (texte.length === 0) {
            return afficherMessage("Veuillez entrer l'intitulé de la question.", false);
        }
        if (elType.value === "choix" && reponses.length < 2) {
            return afficherMessage("Entrez au moins 2 réponses.", false);
        }
        if (nbBonnes !== 1) {
            return afficherMessage("Cochez une bonne réponse (et une seule).", false);
        }

        try {
            let reponse = await fetch(API_URL + "/questions/" + idQuestion, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texte, type: elType.value, reponses })
            });
            let resultat = await reponse.json();
            afficherMessage(resultat.message, reponse.ok);

            // Retour à la page du quiz après 1 seconde
            if (reponse.ok) setTimeout(() => window.location.href = pageQuiz, 1000);
        } catch (error) {
            afficherMessage("Impossible de joindre le serveur.", false);
        }
    });

    // 4. Supprimer : confirmation, puis DELETE /api/questions/:id
    elSupprimer.addEventListener("click", async () => {
        let ok = confirm("Supprimer cette question ?\nCette action est définitive.");
        if (!ok) return;

        try {
            let reponse = await fetch(API_URL + "/questions/" + idQuestion, { method: "DELETE" });
            let resultat = await reponse.json();
            afficherMessage(resultat.message, reponse.ok);
            if (reponse.ok) setTimeout(() => window.location.href = pageQuiz, 1000);
        } catch (error) {
            afficherMessage("Impossible de joindre le serveur.", false);
        }
    });

    chargerQuestion();
}