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

    // ─── Ghost comments: sync dark mode ─────────────────────────────────────────
    // comments-ui renders its widget inside a SAME-ORIGIN <iframe>. Two separate
    // things control how it looks in dark mode:
    //   1. data-color-scheme="dark" on the Ghost script → makes the widget add a
    //      `.dark` class to its internal <section>, styling text/buttons. This is
    //      set in post.hbs (template default 'dark', inline script flips to light).
    //   2. The iframe document's own `color-scheme` → controls the browser's
    //      default iframe backdrop. If left `normal`, the backdrop paints WHITE
    //      regardless of the widget's internal dark styling — that was the white
    //      box. We must reach into the iframe and set color-scheme to match.
    // Parent-page CSS cannot touch anything inside the iframe, which is why every
    // stylesheet approach failed.
    function applyCommentsScheme() {
        var iframe = document.querySelector('#ghost-comments-root iframe');
        if (!iframe) return false;
        var idoc;
        try { idoc = iframe.contentDocument; } catch (e) { return false; }
        if (!idoc || !idoc.documentElement) return false;
        idoc.documentElement.style.colorScheme =
            getEffectiveTheme() === 'dark' ? 'dark' : 'light';
        return true;
    }

    function syncCommentWidget() {
        // Keep data-color-scheme in sync (drives the widget's internal styling).
        var script = document.querySelector('script[data-ghost-comments]');
        if (script) {
            script.setAttribute('data-color-scheme',
                getEffectiveTheme() === 'dark' ? 'dark' : 'light');
        }
        // Fix the iframe backdrop (works once the iframe exists).
        applyCommentsScheme();
    }

    // The comments iframe is created asynchronously by React after the deferred
    // bundle loads, and comments-ui may replace it when the user navigates between
    // sign-in / comment states. Watch #ghost-comments-root and (re)apply the
    // color-scheme to every iframe that appears, including after it finishes loading.
    (function watchComments() {
        var root = document.getElementById('ghost-comments-root');
        var rootParent = document.querySelector('.post-comments-inner') || document.body;
        if (!rootParent) return;

        function hook(iframe) {
            applyCommentsScheme();
            iframe.addEventListener('load', applyCommentsScheme);
        }

        // Hook any iframe already present.
        var existing = document.querySelector('#ghost-comments-root iframe');
        if (existing) hook(existing);

        var obs = new MutationObserver(function () {
            var iframe = document.querySelector('#ghost-comments-root iframe');
            if (iframe && !iframe.__tivHooked) {
                iframe.__tivHooked = true;
                hook(iframe);
            }
        });
        obs.observe(rootParent, { childList: true, subtree: true });
    })();

    function applyCommentsFilter() {
        // legacy no-op kept for safety
    }

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
    // Shared, persistent counts live in Supabase (window.TIV_SUPABASE = {url, key}).
    // The browser cookie only remembers THIS reader's own choice (like/dislike/none)
    // so we can toggle and show the active state — never the counts themselves.
    // If Supabase isn't configured, we fall back to per-browser cookie counts so the
    // buttons still work (just not shared across readers).
    var reactionsEl = document.getElementById('postActionBar');

    if (reactionsEl) {
        var postSlug = reactionsEl.getAttribute('data-post-slug') || 'post';
        var memberId = reactionsEl.getAttribute('data-member') || '';
        var likeBtn = document.getElementById('reactionLike');
        var dislikeBtn = document.getElementById('reactionDislike');
        var likeCountEl = document.getElementById('likeCount');
        var dislikeCountEl = document.getElementById('dislikeCount');

        var sb = window.TIV_SUPABASE;
        var hasServer = !!(sb && sb.url && sb.key);

        // Cookie remembers this reader's own choice. Namespaced by member so a
        // logged-in member's choice follows their account on this browser.
        var cookieName = 'tiv_reaction_' + postSlug + (memberId ? '_' + memberId.slice(0, 8) : '');

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

        function parseState() {
            try {
                var raw = getCookie(cookieName);
                var s = raw ? JSON.parse(decodeURIComponent(raw)) : null;
                if (!s) return { reaction: null, likes: 0, dislikes: 0 };
                return { reaction: s.reaction || null, likes: s.likes || 0, dislikes: s.dislikes || 0 };
            } catch (e) {
                return { reaction: null, likes: 0, dislikes: 0 };
            }
        }

        function saveState(s) {
            // In server mode we only persist the reader's choice; counts come from
            // Supabase. In fallback mode we keep counts in the cookie too.
            var payload = hasServer
                ? { reaction: s.reaction }
                : { reaction: s.reaction, likes: s.likes, dislikes: s.dislikes };
            setCookie(cookieName, encodeURIComponent(JSON.stringify(payload)), 365);
        }

        function render(s) {
            if (likeCountEl) likeCountEl.textContent = s.likes;
            if (dislikeCountEl) dislikeCountEl.textContent = s.dislikes;
            if (likeBtn) {
                likeBtn.classList.toggle('is-active', s.reaction === 'like');
                likeBtn.setAttribute('aria-pressed', s.reaction === 'like' ? 'true' : 'false');
            }
            if (dislikeBtn) {
                dislikeBtn.classList.toggle('is-active', s.reaction === 'dislike');
                dislikeBtn.setAttribute('aria-pressed', s.reaction === 'dislike' ? 'true' : 'false');
            }
        }

        // ── Supabase helpers ──
        function sbHeaders(extra) {
            var h = { 'apikey': sb.key, 'Authorization': 'Bearer ' + sb.key };
            if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
            return h;
        }

        function fetchCounts() {
            return fetch(sb.url + '/rest/v1/post_reactions?slug=eq.' +
                    encodeURIComponent(postSlug) + '&select=likes,dislikes',
                    { headers: sbHeaders() })
                .then(function (r) { return r.json(); })
                .then(function (rows) {
                    if (rows && rows[0]) {
                        state.likes = rows[0].likes || 0;
                        state.dislikes = rows[0].dislikes || 0;
                    } else {
                        state.likes = 0;
                        state.dislikes = 0;
                    }
                    render(state);
                })
                .catch(function () {/* keep optimistic values */});
        }

        // Fire-and-forget atomic increment via the `react` RPC (validates +/-1 only).
        function react(field, delta) {
            if (!hasServer) return;
            fetch(sb.url + '/rest/v1/rpc/react', {
                method: 'POST',
                headers: sbHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ p_slug: postSlug, p_field: field, p_delta: delta }),
                keepalive: true
            }).catch(function () {});
        }

        var state = parseState();

        if (hasServer) {
            // Counts come from the server; cookie only told us our own choice.
            state.likes = 0;
            state.dislikes = 0;
            render(state);
            fetchCounts();
        } else {
            render(state);
        }

        function applyDelta(target) {
            var other = target === 'like' ? 'dislike' : 'like';
            var targetCount = target === 'like' ? 'likes' : 'dislikes';
            var otherCount = other === 'like' ? 'likes' : 'dislikes';

            if (state.reaction === target) {
                // Toggle off
                state[targetCount] = Math.max(0, state[targetCount] - 1);
                state.reaction = null;
                react(targetCount, -1);
            } else {
                if (state.reaction === other) {
                    state[otherCount] = Math.max(0, state[otherCount] - 1);
                    react(otherCount, -1);
                }
                state[targetCount] += 1;
                state.reaction = target;
                react(targetCount, 1);
            }
            saveState(state);
            render(state);
        }

        if (likeBtn) likeBtn.addEventListener('click', function () { applyDelta('like'); });
        if (dislikeBtn) dislikeBtn.addEventListener('click', function () { applyDelta('dislike'); });
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

    /* ── Custom search overlay ─────────────────────────────────────────────
       Themed replacement for Ghost's default search. Reads the Content API
       config from the sodo-search script Ghost injects, fetches all posts once,
       then filters client-side as the user types. */
    (function initSearch() {
        var overlay = document.getElementById('tivSearch');
        var input = document.getElementById('tivSearchInput');
        var results = document.getElementById('tivSearchResults');
        var openBtn = document.getElementById('searchToggleBtn');
        if (!overlay || !input || !results) return;

        // Pull API root + key from whichever Ghost script exposes it.
        var sodo = document.querySelector('script[data-sodo-search]');
        var comments = document.querySelector('script[data-ghost-comments]');
        var apiRoot, apiKey;
        if (sodo) {
            apiRoot = sodo.getAttribute('data-sodo-search');
            apiKey = sodo.getAttribute('data-key');
        } else if (comments) {
            apiRoot = comments.getAttribute('data-ghost-comments');
            apiKey = comments.getAttribute('data-key');
        }
        if (apiRoot && apiRoot.charAt(apiRoot.length - 1) !== '/') apiRoot += '/';

        var posts = null;          // cached corpus
        var loading = false;
        var lastQuery = '';

        function escapeHtml(str) {
            return (str || '').replace(/[&<>"']/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
            });
        }

        function loadPosts() {
            if (posts || loading || !apiRoot || !apiKey) return Promise.resolve(posts || []);
            loading = true;
            var url = apiRoot + 'ghost/api/content/posts/?key=' + encodeURIComponent(apiKey) +
                '&limit=all&fields=title,url,excerpt&include=tags&order=published_at%20desc';
            return fetch(url)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    posts = (data.posts || []).map(function (p) {
                        var tagNames = (p.tags || []).map(function (t) { return t.name; });
                        return {
                            title: p.title || '',
                            url: p.url || '#',
                            excerpt: p.excerpt || '',
                            tags: tagNames,
                            haystack: ((p.title || '') + ' ' + (p.excerpt || '') + ' ' + tagNames.join(' ')).toLowerCase()
                        };
                    });
                    loading = false;
                    return posts;
                })
                .catch(function () { loading = false; posts = []; return posts; });
        }

        function render(query) {
            var q = query.trim().toLowerCase();
            if (!q) {
                results.innerHTML = '<p class="tiv-search-empty">Start typing to search essays and tags.</p>';
                return;
            }
            if (!posts) {
                results.innerHTML = '<p class="tiv-search-empty">Searching…</p>';
                return;
            }
            var terms = q.split(/\s+/);
            var matches = posts.filter(function (p) {
                return terms.every(function (t) { return p.haystack.indexOf(t) !== -1; });
            }).slice(0, 8);

            if (!matches.length) {
                results.innerHTML = '<p class="tiv-search-empty">No essays found for “' + escapeHtml(query.trim()) + '”.</p>';
                return;
            }
            results.innerHTML = matches.map(function (p) {
                var tag = p.tags.length ? '<span class="tiv-search-tag">' + escapeHtml(p.tags[0]) + '</span>' : '';
                return '<a class="tiv-search-result" href="' + escapeHtml(p.url) + '" role="option">' +
                    '<span class="tiv-search-result-title">' + escapeHtml(p.title) + '</span>' +
                    (p.excerpt ? '<span class="tiv-search-result-excerpt">' + escapeHtml(p.excerpt.slice(0, 120)) + '</span>' : '') +
                    tag +
                    '</a>';
            }).join('');
        }

        var debounceTimer;
        input.addEventListener('input', function () {
            var val = input.value;
            lastQuery = val;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () { render(val); }, 120);
        });

        function openSearch() {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('search-open');
            loadPosts().then(function () { if (overlay.classList.contains('is-open')) render(lastQuery); });
            render(input.value);
            setTimeout(function () { input.focus(); }, 30);
        }

        function closeSearch() {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('search-open');
        }

        if (openBtn) openBtn.addEventListener('click', openSearch);

        overlay.addEventListener('click', function (e) {
            if (e.target.closest('[data-search-close]')) closeSearch();
        });

        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                overlay.classList.contains('is-open') ? closeSearch() : openSearch();
            } else if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
                closeSearch();
            }
        });
    })();

})();
