---
layout: default
title: Carte des compétitions
permalink: /carte/
---

<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css">
<link rel="stylesheet" href="{{ '/assets/css/carte-competitions.css' | relative_url }}">

<section class="section">
  <div class="wrap">
    <div class="kicker">Compétitions FFTA</div>
    <h1>Carte interactive des compétitions</h1>
    <p class="lead">
      Cette carte recense les compétitions de Tir Nature et Tir 3D en France, avec filtres
      par ville, rayon et discipline. Données issues du calendrier officiel FFTA.
    </p>

    <div class="carte-ffta">
      <button id="bouton-filtres">☰ Filtres</button>

      <div id="filtres">
        <b>Recherche par ville</b>
        <input type="text" id="recherche-ville" placeholder="Ex: Noisy-le-Grand" autocomplete="off">
        <div id="suggestions-ville"></div>

        <div id="option-rayon" class="masque">
          <label>
            Rayon :
            <select id="rayon-km">
              <option value="50">50 km</option>
              <option value="100" selected>100 km</option>
              <option value="150">150 km</option>
              <option value="200">200 km</option>
            </select>
          </label>
          <button id="reinitialiser-ville">✕ Retirer</button>
        </div>

        <br>

        <b>Disciplines</b>
        <div id="liste-disciplines"></div>

        <br>

        <b>Dates</b>
        <label>
          <input type="radio" name="dates" value="30jours" checked>
          30 prochains jours
        </label>
        <label>
          <input type="radio" name="dates" value="saison">
          Jusqu'en fin de saison
        </label>
        <label>
          <input type="radio" name="dates" value="tout">
          Toutes les compétitions à venir
        </label>

        <br>

        <button id="reinitialiser-filtres">↺ Réinitialiser les filtres</button>

        <br>

        <div id="compteur-filtres"></div>
      </div>

      <div id="carte"></div>
      <div id="statut-chargement">Chargement des compétitions...</div>

      <div id="pied-de-carte">
        <span id="nombre-concours">-</span> compétitions à venir •
        Dernière mise à jour : <span id="date-maj">-</span>
        <br>
        Données issues du calendrier officiel FFTA. Outil indépendant
        développé par Les Archers de l'Oppidum.
      </div>
    </div>
  </div>
</section>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>
<script src="{{ '/assets/js/carte-competitions.js' | relative_url }}"></script>
