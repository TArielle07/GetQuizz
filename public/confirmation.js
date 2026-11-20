/* =========================================================
   PAGE DE CONFIRMATION (confirmation.html)
   Affiche le titre du quiz et le score gardés par quiz.js
   ========================================================= */
{
    let resultat = JSON.parse(sessionStorage.getItem("resultatQuiz") || "null");

    if (resultat) {
        document.querySelector("#conf-titre").textContent = "Quiz : " + resultat.titre;
        document.querySelector("#conf-score").textContent = "Score : " + resultat.score + " / " + resultat.total;
    }
}