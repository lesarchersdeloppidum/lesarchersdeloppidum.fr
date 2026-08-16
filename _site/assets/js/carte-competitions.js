const carte = L.map("carte").setView([46.5, 2.5], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
}).addTo(carte);

const groupeClusters = L.markerClusterGroup({
    maxClusterRadius: 40,
    disableClusteringAtZoom: 14,
});
carte.addLayer(groupeClusters);

let marqueurs = [];
let competitionsChargees = [];
let disciplinesDisponibles = new Set();
let filtresActifs = new Set();
let filtreDateActif = "30jours";
const OPACITE_MARQUEUR = 0.85;
let pointRecherche = null;
let rayonKm = 100;


const BASE_ICONES = "/assets/img/carte-icones/";

const ICONES_DISCIPLINE = {
    "tir à l'arc extérieur": BASE_ICONES + "tae.png",
    "tir 3d": BASE_ICONES + "3d.png",
    "tir en campagne": BASE_ICONES + "campagne.png",
    "tir beursault": BASE_ICONES + "beursault.png",
    "tir à 18m": BASE_ICONES + "18m.png",
    "tir nature": BASE_ICONES + "nature.png",
    "run archery": BASE_ICONES + "runarchery.png",
    "para-tir à l'arc à 18m": BASE_ICONES + "para.png",
    "para-tir à l'arc en extérieur": BASE_ICONES + "para.png",
    "loisirs débutant et confirmé": BASE_ICONES + "loisir.png",
    "loisirs confirmé": BASE_ICONES + "loisir.png",
    "loisirs débutant": BASE_ICONES + "loisir.png",
    "divers": BASE_ICONES + "divers.png",
};

const ICONE_PAR_DEFAUT = BASE_ICONES + "divers.png";


function normaliserDiscipline(discipline) {
    return (discipline || "").trim().toLowerCase().replace(/\s+/g, " ");
}


function choisirIcone(discipline) {
    const fichier =
        ICONES_DISCIPLINE[normaliserDiscipline(discipline)] || ICONE_PAR_DEFAUT;

    return L.icon({
        iconUrl: fichier,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
        className: "icone-carte",
    });
}


function obtenirSaisonActuelle() {
    const aujourdHui = new Date();
    const annee = aujourdHui.getFullYear();
    const mois = aujourdHui.getMonth() + 1;

    let debut;
    let fin;

    if (mois >= 9) {
        debut = new Date(annee, 8, 1);
        fin = new Date(annee + 1, 7, 31);
    } else {
        debut = new Date(annee - 1, 8, 1);
        fin = new Date(annee, 7, 31);
    }

    return { debut, fin };
}


function distanceKm(lat1, lon1, lat2, lon2) {
    const rayonTerre = 6371;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return rayonTerre * c;
}


function concoursDansRayon(concours) {
    if (!pointRecherche) {
        return true;
    }

    const localisation = concours.localisation;

    if (!localisation || !localisation.latitude || !localisation.longitude) {
        return false;
    }

    const distance = distanceKm(
        pointRecherche.lat,
        pointRecherche.lon,
        parseFloat(localisation.latitude),
        parseFloat(localisation.longitude)
    );

    return distance <= rayonKm;
}


function estAVenir(concours) {
    if (!concours.dates || !concours.dates.debut) {
        return false;
    }

    const debut = new Date(concours.dates.debut);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    return debut >= aujourdHui;
}


function concoursDansPeriode(concours) {
    if (!concours.dates || !concours.dates.debut) {
        return false;
    }

    const dateConcours = new Date(concours.dates.debut);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    if (filtreDateActif === "30jours") {
        const limite = new Date();
        limite.setDate(limite.getDate() + 30);

        return dateConcours >= aujourdHui && dateConcours <= limite;
    }

    if (filtreDateActif === "saison") {
        const saison = obtenirSaisonActuelle();
        return dateConcours >= aujourdHui && dateConcours <= saison.fin;
    }

    return estAVenir(concours);
}


function regrouperParEmplacement(competitions) {
    const emplacements = {};

    competitions
        .filter(concoursDansPeriode)
        .forEach((concours) => {
            const localisation = concours.localisation;

            if (!localisation.latitude || !localisation.longitude) {
                return;
            }

            const cle = `${localisation.latitude},${localisation.longitude}`;

            if (!emplacements[cle]) {
                emplacements[cle] = [];
            }

            emplacements[cle].push(concours);
        });

    return emplacements;
}


function construireContenuPopup(groupe, localisation) {
    let contenu = "";

    if (groupe.length > 1) {
        contenu += `
            <b>📍 ${localisation.lieu || ""}</b>
            <br><br>
            <b>${groupe.length} concours à cet emplacement</b>
        `;
    }

    groupe.forEach((concours) => {
        const badgeStatut = concours.statut_evenement
            ? `<br><span class="badge-statut">${concours.statut_evenement.toUpperCase()}</span>`
            : "";

        contenu += `
            <hr>
            <b>🏹 ${concours.nom}</b>${badgeStatut}
            <br>
            📅 ${concours.dates.texte}
            <br>
            🎯 ${concours.discipline || ""}
            <br>
            🏢 ${concours.organisateur || ""}
        `;

        if (concours.documents && concours.documents.mandat) {
            contenu += `
                <br>
                📄 <a href="${concours.documents.mandat}" target="_blank">Voir le mandat</a>
            `;
        }

        if (concours.url) {
            contenu += `
                <br>
                🔎 <a href="${concours.url}" target="_blank">Fiche FFTA</a>
            `;
        }
    });

    return contenu;
}


function creerIconeGroupe(groupe) {
    if (groupe.length > 1) {
        return L.divIcon({
            html: `<div class="icone multiple">${groupe.length}</div>`,
            className: "",
            iconSize: [40, 40],
        });
    }

    return choisirIcone(groupe[0].discipline);
}


function afficherCarte() {
    groupeClusters.clearLayers();
    marqueurs = [];

    const emplacements = regrouperParEmplacement(competitionsChargees);

    console.log("Emplacements :", Object.keys(emplacements).length);

    Object.values(emplacements).forEach((groupe) => {
        const localisation = groupe[0].localisation;

        const marker = L.marker(
            [localisation.latitude, localisation.longitude],
            { icon: creerIconeGroupe(groupe) }
        );

        marker.bindPopup(construireContenuPopup(groupe, localisation));
        marker.setOpacity(OPACITE_MARQUEUR);

        marqueurs.push({ marker, concours: groupe });
    });

    appliquerFiltres();
}


function afficherSuggestions(communes) {
    const zone = document.getElementById("suggestions-ville");
    zone.innerHTML = "";

    communes.forEach((commune) => {
        if (!commune.centre) {
            return;
        }

        const [lon, lat] = commune.centre.coordinates;
        const codePostal = commune.codesPostaux[0];

        const ligne = document.createElement("div");
        ligne.className = "suggestion-ville";
        ligne.textContent = `${commune.nom} (${codePostal})`;

        ligne.onclick = function () {
            pointRecherche = { lat, lon };

            document.getElementById("recherche-ville").value =
                `${commune.nom} (${codePostal})`;

            zone.innerHTML = "";
            document.getElementById("option-rayon").classList.remove("masque");

            appliquerFiltres();
        };

        zone.appendChild(ligne);
    });
}


function rechercherVilles(texte) {
    if (texte.length < 2) {
        document.getElementById("suggestions-ville").innerHTML = "";
        return;
    }

    const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(texte)}&boost=population&limit=5&fields=nom,codesPostaux,centre`;

    fetch(url)
        .then((reponse) => reponse.json())
        .then((communes) => afficherSuggestions(communes))
        .catch((erreur) => {
            console.error("Erreur recherche ville :", erreur);
        });
}


function initRechercheVille() {
    let minuteur = null;

    document.getElementById("recherche-ville").addEventListener("input", function () {
        clearTimeout(minuteur);
        const texte = this.value;
        minuteur = setTimeout(() => rechercherVilles(texte), 300);
    });

    document.getElementById("rayon-km").addEventListener("change", function () {
        rayonKm = parseInt(this.value, 10);
        appliquerFiltres();
    });

    document.getElementById("reinitialiser-ville").addEventListener("click", function () {
        pointRecherche = null;
        document.getElementById("recherche-ville").value = "";
        document.getElementById("suggestions-ville").innerHTML = "";
        document.getElementById("option-rayon").classList.add("masque");
        appliquerFiltres();
    });

    document.getElementById("reinitialiser-filtres").addEventListener("click", function () {
        filtresActifs.clear();

        document
            .querySelectorAll('#liste-disciplines input[type="checkbox"]')
            .forEach((checkbox) => {
                checkbox.checked = false;
            });

        document.querySelector('input[name="dates"][value="30jours"]').checked = true;
        filtreDateActif = "30jours";

        afficherCarte();
    });

    document.getElementById("bouton-filtres").addEventListener("click", function () {
        const filtres = document.getElementById("filtres");
        filtres.classList.toggle("ouvert");

        this.textContent = filtres.classList.contains("ouvert")
            ? "✕ Fermer"
            : "☰ Filtres";
    });
}


function creerFiltres() {
    const zone = document.getElementById("liste-disciplines");

    disciplinesDisponibles.forEach((discipline) => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = false;

        checkbox.onchange = function () {
            if (this.checked) {
                filtresActifs.add(discipline);
            } else {
                filtresActifs.delete(discipline);
            }

            appliquerFiltres();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + discipline));
        zone.appendChild(label);
    });

    document.querySelectorAll('input[name="dates"]').forEach((bouton) => {
        bouton.onchange = function () {
            filtreDateActif = this.value;
            afficherCarte();
        };
    });
}


function compterConcoursAffiches() {
    return competitionsChargees.filter((concours) => {
        if (!concoursDansPeriode(concours)) {
            return false;
        }

        if (!concoursDansRayon(concours)) {
            return false;
        }

        if (filtresActifs.size === 0) {
            return true;
        }

        return filtresActifs.has(concours.discipline);
    }).length;
}


function appliquerFiltres() {
    marqueurs.forEach((element) => {
        const groupeFiltre = element.concours.filter((concours) => {
            const disciplineOk =
                filtresActifs.size === 0 || filtresActifs.has(concours.discipline);

            return disciplineOk && concoursDansRayon(concours);
        });

        if (groupeFiltre.length === 0) {
            groupeClusters.removeLayer(element.marker);
            return;
        }

        groupeClusters.addLayer(element.marker);

        const localisation = groupeFiltre[0].localisation;
        element.marker.setIcon(creerIconeGroupe(groupeFiltre));
        element.marker.setPopupContent(
            construireContenuPopup(groupeFiltre, localisation)
        );
    });

    const nombreAffiches = compterConcoursAffiches();
    document.getElementById("compteur-filtres").textContent =
        `${nombreAffiches} compétition${nombreAffiches > 1 ? "s" : ""} affichée${nombreAffiches > 1 ? "s" : ""}`;
}


function formaterDateFr(dateIso) {
    const [annee, mois, jour] = dateIso.split("-");
    return `${jour}/${mois}/${annee}`;
}


function remplirPiedDeCarte(nombreConcours, derniereMaj) {
    document.getElementById("nombre-concours").textContent =
        nombreConcours.toLocaleString("fr-FR");

    document.getElementById("date-maj").textContent =
        formaterDateFr(derniereMaj);
}


fetch("/assets/data/competitions-ffta.json")
    .then((reponse) => {
        if (!reponse.ok) {
            throw new Error(`Réponse HTTP ${reponse.status}`);
        }

        return reponse.json();
    })
    .then((donnees) => {
        const competitions = donnees.competitions;
        competitionsChargees = competitions;

        console.log("Concours chargés :", competitions.length);

        competitions.forEach((concours) => {
            if (concours.discipline) {
                disciplinesDisponibles.add(concours.discipline);
            }
        });

        creerFiltres();
        initRechercheVille();
        afficherCarte();

        const nombreAVenir = competitions.filter(estAVenir).length;
        remplirPiedDeCarte(nombreAVenir, donnees.derniere_maj);

        document.getElementById("statut-chargement").classList.add("masque");
    })
    .catch((erreur) => {
        console.error("Erreur de chargement des compétitions :", erreur);

        const statut = document.getElementById("statut-chargement");
        statut.textContent =
            "Impossible de charger les compétitions. Réessayez plus tard.";
        statut.classList.add("erreur");
    });