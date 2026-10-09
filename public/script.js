const API_URL = "http://localhost:3000/api";

/* =========================================================
   PAGE DE CONNEXION (login.html) — Front 1
   ========================================================= */

let elFormConnexion = document.querySelector("#form-connexion");
let elEmail = document.querySelector("#email");
let elMotDePasse = document.querySelector("#mot-de-passe");
let elStatus = document.querySelector("#status");

// On vérifie que le formulaire existe (il est seulement dans login.html)
if (elFormConnexion) {
    elFormConnexion.addEventListener("submit", async (e) => {
        e.preventDefault();
        let ok = true;
        elEmail.classList.remove("erreur");
        elMotDePasse.classList.remove("erreur");

        // Validation des champs
        if (elEmail.value.trim().length === 0) {
            elStatus.textContent = "Veuillez entrer votre courriel";
            elStatus.style.color = "orange";
            elEmail.classList.add("erreur");
            ok = false;
        }
        if (elMotDePasse.value.length === 0) {
            elStatus.textContent = "Veuillez entrer votre mot de passe";
            elStatus.style.color = "orange";
            elMotDePasse.classList.add("erreur");
            ok = false;
        }

        if (ok) {
            try {
                let reponse = await fetch(API_URL + "/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: elEmail.value.trim(),
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
                elStatus.textContent = "Courriel ou mot de passe incorrect";
                elStatus.style.color = "red";
            }
        }
    });
}

/* =========================================================
   PAGE ENSEIGNANT (enseignant.html) — Front 2
   ========================================================= */

let elBtnDeconnexion = document.querySelector("#btn-deconnexion");

// Le bouton est dans enseignant.html et etudiant.html
if (elBtnDeconnexion) {
    elBtnDeconnexion.addEventListener("click", async () => {
        try {
            await fetch(API_URL + "/logout", { method: "POST" });
        } catch (error) {
            console.log("Erreur lors de la déconnexion");
        }
        window.location.href = "login.html";
    });
}

// TODO Sprint 2 : afficher les quiz de l'enseignant

/* =========================================================
   PAGE ÉTUDIANT (etudiant.html) — Front 1
   ========================================================= */

// TODO Sprint 2 : afficher la liste des quiz