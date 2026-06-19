(function () {
    'use strict';

    // ─── Theme helpers ───────────────────────────────────────────────────────────
    function getEffectiveTheme() {
        var cl = document.documentElement.classList;
        if (cl.contains('dark'))  return 'dark';
        if (cl.contains('light')) return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyThemeClass(theme) {
        var html = document.documentElement;
        html.classList.remove('dark', 'light');
        if (theme === 'dark' || theme === 'light') {
            html.classList.add(theme);
            document.cookie = 'tiv-theme=' + theme + '; max-age=' + (30 * 24 * 60 * 60) + '; path=/; SameSite=Lax';
        } else {
            document.cookie = 'tiv-theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
        }
        syncCommentWidget();
    }

    // ─── Ghost comments iframe: clear any old inline filters ────────────────────
    // Dark mode is handled by a cream-island CSS rule on .post-comments-inner;
    // no iframe filter is needed. This function removes any stale inline filter.
    function applyCommentsFilter() {
        document.querySelectorAll('.post-comments iframe').forEach(function (iframe) {
            iframe.style.filter = '';
        });
    }
    applyCommentsFilter();

    function syncCommentWidget() { applyCommentsFilter(); }

    // ─── Comments panel toggle ───────────────────────────────────────────────────
    var commentsToggleBtn = document.getElementById('commentsToggleBtn');
    if (commentsToggleBtn) {
        commentsToggleBtn.addEventListener('click', function () {
            var panel = document.getElementById('commentsPanel');
            if (!panel) return;
            var isExpanded = panel.classList.toggle('is-expanded');
            commentsToggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            commentsToggleBtn.classList.toggle('is-active', isExpanded);
            if (isExpanded) {
                applyCommentsFilter();
                setTimeout(function () {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 80);
            }
        });
    }

    // ─── Theme toggle button ─────────────────────────────────────────────────────
    var themeToggleBtn = document.querySelector('.theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function () {
            applyThemeClass(getEffectiveTheme() === 'dark' ? 'light' : 'dark');
        });
    }

    // ─── Mobile menu ────────────────────────────────────────────────────────────
    var menuBtn = document.getElementById('mobileMenuBtn');
    var menuClose = document.getElementById('mobileMenuClose');
    var mobileMenu = document.getElementById('mobileMenu');
    var overlay = document.getElementById('mobileOverlay');

    function openMenu() {
        if (!menuBtn || !mobileMenu) return;
        menuBtn.setAttribute('aria-expanded', 'true');
        mobileMenu.classList.add('is-open');
        mobileMenu.removeAttribute('aria-hidden');
        if (overlay) overlay.classList.add('is-visible');
        document.body.classList.add('menu-open');
    }

    function closeMenu() {
        if (!menuBtn || !mobileMenu) return;
        menuBtn.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('is-open');
        mobileMenu.setAttribute('aria-hidden', 'true');
        if (overlay) overlay.classList.remove('is-visible');
        document.body.classList.remove('menu-open');
    }

    if (menuBtn) menuBtn.addEventListener('click', function () {
        menuBtn.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });
    if (menuClose) menuClose.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Nav links do a full page load — no need to close the menu manually.
    // Calling closeMenu() on tap was causing iOS Safari to cancel the navigation.

    // ─── Nav scroll shadow ───────────────────────────────────────────────────────
    var header = document.getElementById('siteHeader');

    window.addEventListener('scroll', function () {
        if (!header) return;
        header.classList.toggle('is-scrolled', window.scrollY > 60);
    }, { passive: true });

    // ─── Reading progress bar ────────────────────────────────────────────────────
    var progressBar = document.getElementById('readingProgress');

    function updateProgress() {
        if (!progressBar) return;
        var article = document.querySelector('.post-content');
        if (!article) return;
        var articleTop = article.getBoundingClientRect().top + window.scrollY;
        var articleBottom = articleTop + article.offsetHeight;
        var windowBottom = window.scrollY + window.innerHeight;
        var total = articleBottom - articleTop;
        var progress = Math.min(Math.max(windowBottom - articleTop, 0), total);
        var pct = Math.round((progress / total) * 100);
        progressBar.style.width = pct + '%';
        progressBar.setAttribute('aria-valuenow', pct);
    }

    if (progressBar) {
        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    }

    // ─── Card scroll animations ──────────────────────────────────────────────────
    var cards = document.querySelectorAll('.js-animate-card');

    if ('IntersectionObserver' in window && cards.length) {
        var cardObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    cardObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        cards.forEach(function (card) { cardObserver.observe(card); });
    } else {
        cards.forEach(function (card) { card.classList.add('is-visible'); });
    }

    // ─── Active nav state for tag pages ─────────────────────────────────────────
    // Ghost's {{#if current}} only works for @site.navigation items.
    // Since we now use {{#get "tags"}} in the nav, we detect the active tag via URL.
    (function () {
        var path = window.location.pathname; // e.g. /tag/rationalism/

        // Highlight the matching tag link in desktop + mobile navs
        document.querySelectorAll('.js-tag-nav').forEach(function (link) {
            var slug = link.getAttribute('data-tag-slug');
            if (slug && path === '/tag/' + slug + '/') {
                link.classList.add('active');
                var li = link.parentElement;
                if (li) li.classList.add('active');
            }
        });

        // Highlight Home link when on root
        if (path === '/') {
            document.querySelectorAll('.js-nav-home').forEach(function (link) {
                link.classList.add('active');
            });
        }
    })();

    // ─── Page fade-in ────────────────────────────────────────────────────────────
    document.documentElement.classList.remove('no-js');
    document.body.classList.remove('is-loading');

    // ─── Share helpers ───────────────────────────────────────────────────────────
    window.sharePost = function (url, title) {
        if (navigator.share) {
            navigator.share({ title: title, url: url }).catch(function () {});
        } else {
            window.copyPostLink(url);
        }
    };

    window.copyPostLink = function (url) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(showCopyConfirm);
        } else {
            var el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showCopyConfirm();
        }
    };

    function showCopyConfirm() {
        var existing = document.querySelector('.copy-toast');
        if (existing) return;
        var toast = document.createElement('div');
        toast.className = 'copy-toast';
        toast.textContent = 'Link copied!';
        document.body.appendChild(toast);
        requestAnimationFrame(function () {
            toast.classList.add('is-visible');
            setTimeout(function () {
                toast.classList.remove('is-visible');
                setTimeout(function () {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }, 2200);
        });
    }

    // ─── Reactions (Like / Dislike) ──────────────────────────────────────────────
    // Counts stored in cookies per post slug (no localStorage per user preference)
    var reactionsEl = document.getElementById('postActionBar');

    if (reactionsEl) {
        var postSlug = reactionsEl.getAttribute('data-post-slug') || 'post';
        var likeBtn = document.getElementById('reactionLike');
        var dislikeBtn = document.getElementById('reactionDislike');
        var likeCountEl = document.getElementById('likeCount');
        var dislikeCountEl = document.getElementById('dislikeCount');

        var cookieName = 'tiv_reaction_' + postSlug;

        function getCookie(name) {
            var value = '; ' + document.cookie;
            var parts = value.split('; ' + name + '=');
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }

        function setCookie(name, value, days) {
            var expires = '';
            if (days) {
                var d = new Date();
                d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = '; expires=' + d.toUTCString();
            }
            document.cookie = name + '=' + value + expires + '; path=/; SameSite=Lax';
        }

        function parseReaction() {
            try {
                var raw = getCookie(cookieName);
                return raw ? JSON.parse(decodeURIComponent(raw)) : { reaction: null, likes: 0, dislikes: 0 };
            } catch (e) {
                return { reaction: null, likes: 0, dislikes: 0 };
            }
        }

        function saveReaction(state) {
            setCookie(cookieName, encodeURIComponent(JSON.stringify(state)), 365);
        }

        function renderReactions(state) {
            if (!likeCountEl || !dislikeCountEl) return;
            likeCountEl.textContent = state.likes;
            dislikeCountEl.textContent = state.dislikes;
            if (likeBtn) {
                likeBtn.classList.toggle('is-active', state.reaction === 'like');
                likeBtn.setAttribute('aria-pressed', state.reaction === 'like' ? 'true' : 'false');
            }
            if (dislikeBtn) {
                dislikeBtn.classList.toggle('is-active', state.reaction === 'dislike');
                dislikeBtn.setAttribute('aria-pressed', state.reaction === 'dislike' ? 'true' : 'false');
            }
        }

        var state = parseReaction();
        renderReactions(state);

        if (likeBtn) {
            likeBtn.addEventListener('click', function () {
                if (state.reaction === 'like') {
                    // Un-like
                    state.likes = Math.max(0, state.likes - 1);
                    state.reaction = null;
                } else {
                    // Switch from dislike if needed
                    if (state.reaction === 'dislike') {
                        state.dislikes = Math.max(0, state.dislikes - 1);
                    }
                    state.likes += 1;
                    state.reaction = 'like';
                }
                saveReaction(state);
                renderReactions(state);
            });
        }

        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', function () {
                if (state.reaction === 'dislike') {
                    // Un-dislike
                    state.dislikes = Math.max(0, state.dislikes - 1);
                    state.reaction = null;
                } else {
                    // Switch from like if needed
                    if (state.reaction === 'like') {
                        state.likes = Math.max(0, state.likes - 1);
                    }
                    state.dislikes += 1;
                    state.reaction = 'dislike';
                }
                saveReaction(state);
                renderReactions(state);
            });
        }
    }

    /* ── Smart Related Essays ──────────────────────────────────────────── */
    function initRelatedEssays() {
        var section = document.querySelector('.related-essays');
        if (!section) return;
        var grid = document.getElementById('relatedEssaysGrid');
        if (!grid) return;

        var currentTags    = (section.dataset.currentTags    || '').split(',').filter(Boolean);
        var currentTitle   = (section.dataset.currentTitle   || '').toLowerCase();
        var currentExcerpt = (section.dataset.currentExcerpt || '').toLowerCase();
        var currentRt      = parseInt(section.dataset.currentRt) || 5;

        var stop = {a:1,an:1,the:1,and:1,or:1,but:1,in:1,on:1,at:1,to:1,for:1,
                    of:1,with:1,by:1,from:1,is:1,it:1,its:1,that:1,this:1,was:1,
                    are:1,be:1,have:1,has:1,had:1,not:1,as:1,do:1,did:1,will:1,
                    can:1,all:1,she:1,he:1,we:1,they:1,their:1,our:1,his:1,her:1,
                    i:1,you:1,one:1,would:1,when:1,what:1,which:1,who:1,how:1,
                    been:1,more:1,into:1,than:1,also:1,about:1,after:1,before:1};

        function kw(text) {
            return (text || '').toLowerCase()
                .replace(/[^a-z\s]/g, ' ')
                .split(/\s+/)
                .filter(function(w) { return w.length > 3 && !stop[w]; });
        }

        var ckw = kw(currentTitle + ' ' + currentExcerpt);

        var cards = Array.prototype.slice.call(
            grid.querySelectorAll('.related-essay-card')
        );

        var scored = cards.map(function(card) {
            var cardTags = (card.dataset.tags || '').split(',').filter(Boolean);
            var cardKw   = kw((card.dataset.title || '') + ' ' + (card.dataset.excerpt || ''));
            var cardRt   = parseInt(card.dataset.rt) || 5;
            var score    = 0;

            /* Shared tags — strongest signal */
            cardTags.forEach(function(t) {
                if (currentTags.indexOf(t) !== -1) score += 10;
            });

            /* Keyword overlap in title/excerpt */
            ckw.forEach(function(k) {
                if (cardKw.indexOf(k) !== -1) score += 3;
            });

            /* Reading-time proximity */
            var diff = Math.abs(cardRt - currentRt);
            if (diff <= 1) score += 5;
            else if (diff <= 3) score += 2;

            return { card: card, score: score };
        });

        /* Sort descending, keep top 3 */
        scored.sort(function(a, b) { return b.score - a.score; });

        scored.forEach(function(item, i) {
            if (i < 3) {
                grid.appendChild(item.card);
            } else if (item.card.parentNode) {
                item.card.parentNode.removeChild(item.card);
            }
        });

        if (scored.length === 0) {
            section.style.display = 'none';
        }
    }

    initRelatedEssays();

})();
