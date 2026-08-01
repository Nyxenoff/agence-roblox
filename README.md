# Connexion Roblox OAuth

Ce site intègre une vraie connexion via **Roblox Open Cloud OAuth 2.0**.

## Comment ça marche

1. L'utilisateur clique sur **Se connecter**.
2. Il est redirigé vers la **page officielle de connexion Roblox**.
3. Après autorisation, Roblox redirige vers `callback.html`.
4. Le serveur échange le `code` contre un `access_token` et récupère l'identité.
5. Le serveur crée une **session sécurisée** (cookie `HttpOnly` signé).
6. L'utilisateur est de retour sur le site, connecté.

## Mise en place

### 1. Créer l'application OAuth sur Roblox

- Va sur [Roblox Creator Dashboard → Credentials](https://create.roblox.com/dashboard/credentials).
- Crée une app OAuth.
- Récupère le **Client ID** et le **Client secret**.
- Ajoute l'URL de redirection : `https://rogrid.vercel.app/callback.html` (et `http://localhost:3000/callback.html` pour tester en local).

### 2. Configurer le fichier `.env`

```bash
cp .env.example .env
```

Remplace les valeurs par les tiennes :

```
PORT=3000
NODE_ENV=development

ROBLOX_CLIENT_ID=ton_client_id
ROBLOX_CLIENT_SECRET=ton_client_secret
ROBLOX_REDIRECT_URI=http://localhost:3000/callback.html

SESSION_SECRET=une_chaine_aleatoire_de_32_caracteres_min
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Lancer le serveur

```bash
npm start
```

Le site est accessible sur `http://localhost:3000`.

## Pages ajoutées

- `login.html` : bouton "Se connecter avec Roblox".
- `callback.html` : réception du code après autorisation.
- `server.js` : backend Express qui échange les tokens et gère les sessions.

## Important

- Les sessions sont stockées **en mémoire** dans `server.js`.
- En production, remplace le stockage mémoire par Redis ou une base de données.
- Les cookies de session sont signés et `HttpOnly`.

## Déployer sur Vercel

Le projet est prêt pour Vercel.

### 1. Pousser le projet sur GitHub

```bash
git add .
git commit -m "Ajout connexion Roblox OAuth"
git push
```

### 2. Connecter Vercel

- Va sur [vercel.com](https://vercel.com).
- Importe ton repo GitHub.
- Sélectionne le projet `agence-roblox`.

### 3. Configurer les variables d'environnement

Dans l'onglet **Settings → Environment Variables**, ajoute :

| Clé | Valeur |
| --- | --- |
| `NODE_ENV` | `production` |
| `ROBLOX_CLIENT_ID` | ton Client ID |
| `ROBLOX_CLIENT_SECRET` | ton Client secret |
| `ROBLOX_REDIRECT_URI` | `https://rogrid.vercel.app/callback.html` |
| `ROBLOX_SCOPE` | `openid profile` (ajoute `user.inventory-item:read` pour les gamepasses) |
| `SESSION_SECRET` | une chaîne aléatoire de 32+ caractères |

L'URL de production est déjà renseignée ci-dessus.

### 4. Mettre à jour Roblox

Dans le dashboard Roblox de ton app OAuth, ajoute l'URL de redirection production :

```
https://rogrid.vercel.app/callback.html
```

### 5. Déployer

Vercel déploie automatiquement. Le site sera disponible sur `https://rogrid.vercel.app`.
