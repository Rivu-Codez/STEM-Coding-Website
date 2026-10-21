window.SubmarineGameReady = window.StemGameAuth
    .init('submarine_math', { requireSession: true })
    .then(() => {
        if (!window.StemGamePlatform.getSession()) return;
        document.body.hidden = false;
    });
