document.addEventListener('DOMContentLoaded', () => {
    const lenis = new Lenis();
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const data = new FormData(form);
            const nom = data.get('discord') || data.get('email');

            if (status) {
                // Simulation d'envoi — remplace par un appel API quand c'est prêt
                status.textContent = nom
                    ? `Merci ${nom}, ta demande est bien partie ! On te recontacte sous 24 h.`
                    : 'Merci, ta demande est bien partie ! On te recontacte sous 24 h.';
                status.style.color = '#ffce00';
            }

            form.reset();

            if (status) {
                setTimeout(() => {
                    status.textContent = '';
                }, 6000);
            }
        });
    }

    // Apparition au scroll des cartes 3D
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.card3d, .section-title, .hero-content').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        observer.observe(el);
    });

    document.querySelectorAll('.faq-item').forEach(item => {
        item.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            document.querySelectorAll('.card3d.open').forEach(openCard => {
                openCard.classList.remove('open');
            });

            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });
});

// Classe utilitaire pour l'animation d'apparition
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `.visible { opacity: 1 !important; transform: translateY(0) !important; }`;
    document.head.appendChild(style);
});

// --- Session / connexion Roblox OAuth ---
document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;

    const loginText = loginBtn.querySelector('.btn-text');

    let currentUser = null;

    const setButtonLoggedOut = () => {
        loginText.textContent = 'Se connecter';
        loginBtn.title = 'Se connecter avec ton compte Roblox';
        loginBtn.setAttribute('aria-label', 'Se connecter');
        loginBtn.classList.remove('logged-in');
    };

    const setButtonLoggedIn = (name) => {
        currentUser = name;
        loginText.textContent = name;
        loginBtn.title = 'Clique pour te déconnecter';
        loginBtn.setAttribute('aria-label', `Connecté en tant que ${name}`);
        loginBtn.classList.add('logged-in');
    };

    try {
        const res = await fetch('/api/me', { credentials: 'same-origin' });
        const data = await res.json();

        if (data.user) {
            setButtonLoggedIn(data.user.name);
        } else {
            setButtonLoggedOut();
        }
    } catch (err) {
        console.error('Impossible de vérifier la session :', err);
        setButtonLoggedOut();
    }

    loginBtn.addEventListener('click', async () => {
        if (currentUser) {
            if (confirm(`Te déconnecter de ${currentUser} ?`)) {
                try {
                    await fetch('/api/logout', {
                        method: 'POST',
                        credentials: 'same-origin'
                    });
                    currentUser = null;
                    setButtonLoggedOut();
                    window.location.reload();
                } catch (err) {
                    console.error('Erreur de déconnexion :', err);
                }
            }
        } else {
            window.location.href = 'login.html';
        }
    });
});
