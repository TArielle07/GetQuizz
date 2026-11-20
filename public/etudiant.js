/* =========================================================
   PAGE ÉTUDIANT (etudiant.html) — liste des quiz publiés
   Les accolades { } gardent les variables de cette page
   séparées de celles de script.js
   ========================================================= */
{
    let elListe = document.querySelector("#etu-quiz-list");
    let elVide = document.querySelector("#etu-quiz-empty");

    // Demande au serveur les quiz PUBLIÉS et crée une carte par quiz
    async function afficherQuizEtudiant() {
        try {
            let reponse = await fetch(API_URL + "/etudiant/quiz");
            if (!reponse.ok) throw new Error();
            let listeQuiz = await reponse.json();

            // Aucun quiz : on laisse le message "Aucun quiz disponible"
            if (listeQuiz.length === 0) return;

            elVide.style.display = "none";
            elListe.hidden = false;

            listeQuiz.forEach(quiz => {
                let elCarte = document.createElement("article");
                elCarte.className = "carte carte-turquoise";

                let elTitre = document.createElement("h2");
                elTitre.textContent = quiz.titre;

                let elDescription = document.createElement("p");
                elDescription.className = "carte-texte";
                elDescription.textContent = quiz.description || "Pas de description";

                let elDetails = document.createElement("p");
                elDetails.className = "carte-texte";
                elDetails.textContent = [quiz.theme, quiz.difficulte].filter(Boolean).join(" · ");

                // Le bouton ouvre la page publique du quiz
                let elCommencer = document.createElement("a");
                elCommencer.className = "bouton bouton-blanc";
                elCommencer.href = "quiz.html?id=" + quiz._id;
                elCommencer.textContent = "Commencer";

                elCarte.append(elTitre, elDescription, elDetails, elCommencer);
                elListe.appendChild(elCarte);
            });
        } catch (error) {
            console.log("Impossible de charger les quiz :", error);
        }
    }

    afficherQuizEtudiant();
}