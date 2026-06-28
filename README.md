# E-Card Kaiji - 2 joueurs sur écrans séparés

## 1. Mettre sur GitHub
Upload tout le dossier dans ton dépôt :

- index.html
- style.css
- script.js
- firebase.js
- images/emperor.png
- images/citizen.png
- images/slave.png

## 2. Activer GitHub Pages
Settings > Pages > Deploy from a branch > main > /root > Save.

## 3. Configurer Firebase
Pour jouer chacun sur son écran, il faut Firebase Realtime Database :

1. Va sur Firebase Console.
2. Crée un projet.
3. Ajoute une app Web.
4. Copie la config Firebase.
5. Colle-la dans `firebase.js`.
6. Va dans Realtime Database > Create Database.
7. En test, mets temporairement ces règles :

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 4. Jouer
- Joueur 1 clique sur Créer une partie.
- Il copie le code.
- Joueur 2 ouvre le même site et rejoint avec le code.

## Notes
Les images sont dans le dossier `images/` et déjà appelées dans le code.
