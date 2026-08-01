require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.ROBLOX_CLIENT_ID;
const CLIENT_SECRET = process.env.ROBLOX_CLIENT_SECRET;
const REDIRECT_URI = process.env.ROBLOX_REDIRECT_URI;
const SCOPE = process.env.ROBLOX_SCOPE || 'openid profile';
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-me';

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !process.env.SESSION_SECRET) {
    console.warn('ATTENTION : variables ROBLOX_CLIENT_ID, ROBLOX_CLIENT_SECRET, ROBLOX_REDIRECT_URI ou SESSION_SECRET manquantes.');
}

const sessions = {};

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function setSessionCookie(res, sessionId) {
    res.cookie('roblox_sid', sessionId, {
        signed: true,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
    });
}

function clearSessionCookie(res) {
    res.clearCookie('roblox_sid');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SESSION_SECRET));
app.use(express.static(path.join(__dirname, 'public')));

// Fichier de config public pour le front (client_id + redirect_uri + scope)
app.get('/api/config.js', (req, res) => {
    res.type('application/javascript');
    res.send(
        `window.RobloxOAuthConfig = {\n` +
        `  clientId: ${JSON.stringify(CLIENT_ID)},\n` +
        `  redirectUri: ${JSON.stringify(REDIRECT_URI)},\n` +
        `  scope: ${JSON.stringify(SCOPE)}\n` +
        `};`
    );
});

// Récupère l'utilisateur connecté
app.get('/api/me', (req, res) => {
    const sid = req.signedCookies.roblox_sid;
    const session = sid ? sessions[sid] : null;

    if (!session) {
        return res.json({ user: null });
    }

    res.json({
        user: {
            sub: session.robloxId,
            name: session.name,
            picture: session.picture
        }
    });
});

// Déconnexion
app.post('/api/logout', (req, res) => {
    const sid = req.signedCookies.roblox_sid;
    if (sid && sessions[sid]) {
        delete sessions[sid];
    }
    clearSessionCookie(res);
    res.json({ ok: true });
});

// Échange le code Roblox contre un token, récupère l'identité et crée une session
app.post('/api/auth/exchange', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Code manquant' });
    }

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('code', code);
        if (REDIRECT_URI) {
            params.append('redirect_uri', REDIRECT_URI);
        }

        const tokenRes = await fetch('https://apis.roblox.com/oauth/v1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!tokenRes.ok) {
            const detail = await tokenRes.text();
            console.error('Échec échange token Roblox :', detail);
            return res.status(400).json({ error: 'Échec échange token', detail });
        }

        const tokenData = await tokenRes.json();

        const userinfoRes = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        if (!userinfoRes.ok) {
            const detail = await userinfoRes.text();
            console.error('Échec récupération userinfo :', detail);
            return res.status(400).json({ error: 'Échec récupération userinfo', detail });
        }

        const user = await userinfoRes.json();

        const sessionId = generateSessionId();
        sessions[sessionId] = {
            robloxId: user.sub,
            name: user.name || user.nickname || user.preferred_username || 'Robloxien',
            picture: user.picture || null,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + tokenData.expires_in * 1000
        };

        setSessionCookie(res, sessionId);

        res.json({
            ok: true,
            user: {
                sub: sessions[sessionId].robloxId,
                name: sessions[sessionId].name,
                picture: sessions[sessionId].picture
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Vérifie si l'utilisateur connecté possède un gamepass donné
app.get('/api/owns-gamepass/:passId', async (req, res) => {
    const sid = req.signedCookies.roblox_sid;
    const session = sid ? sessions[sid] : null;

    if (!session || !session.accessToken) {
        return res.status(401).json({ error: 'Non connecté' });
    }

    const { passId } = req.params;
    if (!passId || isNaN(Number(passId))) {
        return res.status(400).json({ error: 'ID de gamepass invalide' });
    }

    try {
        const inventoryRes = await fetch(`https://apis.roblox.com/cloud/v1/users/${session.robloxId}/items/1/${passId}/is-owned`, {
            headers: {
                Authorization: `Bearer ${session.accessToken}`
            }
        });

        if (!inventoryRes.ok) {
            const detail = await inventoryRes.text();
            console.error('Échec vérification gamepass :', detail);
            return res.status(inventoryRes.status).json({ error: 'Échec vérification gamepass', detail });
        }

        const owned = await inventoryRes.json();
        res.json({ owned });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = app;

// Démarre le serveur uniquement en local (pas sur Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Serveur RoGrid lancé : http://localhost:${PORT}`);
    });
}
