const API = {
    appName: 'AuraAI',

    saavn: {
        mirrors: [
            'https://jiosaavn-api-gamma.vercel.app',
            'https://jio-saavn-api.vercel.app',
            'https://saavn.me',
            'https://sumit.is-a.dev/jiosaavn-api'
        ],
        searchPath: '/api/search/songs'
    },
    ytmusic: {
        mirrors: [
            'https://pipedapi.kavin.rocks',
            'https://pipedapi.smnz.de',
            'https://pipedapi.lunar.icu'
        ],
        searchPath: '/search'
    }
};

document.addEventListener('DOMContentLoaded', () => {

    let queue = [];
    let queueIndex = -1;
    let isPlaying = false;
    let currentTrack = null;

    const FALLBACK_IMAGE = 'https://ui-avatars.com/api/?name=Music&background=6c5ce7&color=fff';

    const applyBackgroundImageWithFallback = (el, url) => {
        if (!el) return;
        const finalUrl = url || FALLBACK_IMAGE;
        const img = new Image();
        img.onload = () => {
            el.style.backgroundImage = `url('${finalUrl}')`;
        };
        img.onerror = () => {
            el.style.backgroundImage = `url('${FALLBACK_IMAGE}')`;
        };
        img.src = finalUrl;
    };

    const audioPlayer = document.getElementById('audio-player');

    const updateQueueView = () => {
        const grid = document.getElementById('queue-grid');
        if (!grid) return;

        if (!queue.length) {
            grid.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 40px;">Queue is empty</p>';
            return;
        }

        grid.innerHTML = queue.map((t, i) => `
            <div class="media-card ${i === queueIndex ? 'playing active-track' : ''}" data-index="${i}">
                <div class="card-image"></div>
                <h4>${t.title}</h4>
                <p>${t.artist}</p>
                ${i === queueIndex ? '<div class="playing-badge">Now Playing</div>' : ''}
            </div>
        `).join('');

        grid.querySelectorAll('.media-card').forEach((card) => {
            const idx = parseInt(card.dataset.index);
            card.addEventListener('click', () => loadTrack(idx));
            applyBackgroundImageWithFallback(card.querySelector('.card-image'), queue[idx]?.artwork);
        });
    };

    const showView = (view) => {
        const mainView = document.getElementById('main-view');
        const searchView = document.getElementById('search-results-view');
        const queueView = document.getElementById('queue-view');
        const localView = document.getElementById('local-files-view');

        if (mainView) mainView.style.display = view === 'main' ? 'block' : 'none';
        if (searchView) searchView.style.display = view === 'search' ? 'block' : 'none';
        if (queueView) queueView.style.display = view === 'queue' ? 'block' : 'none';
        if (localView) localView.style.display = view === 'local' ? 'block' : 'none';
    };

    let lastView = 'main';
    const toggleQueueView = () => {
        const queueView = document.getElementById('queue-view');
        if (!queueView) return;

        const isVisible = queueView.style.display !== 'none' && queueView.style.display !== '';

        if (!isVisible) {
            const mainView = document.getElementById('main-view');
            const searchView = document.getElementById('search-results-view');
            const localView = document.getElementById('local-files-view');

            if (mainView && mainView.style.display !== 'none') lastView = 'main';
            else if (searchView && searchView.style.display !== 'none') lastView = 'search';
            else if (localView && localView.style.display !== 'none') lastView = 'local';

            showView('queue');
            updateQueueView();
        } else {
            showView(lastView);
        }
    };

    // 🔗 Proxy function
    const proxy = (url) => {
        if (!url) return '';
        // If it's already a proxied URL or a local blob, don't proxy again
        if (url.includes('localhost:5500/proxy') || url.startsWith('blob:')) return url;
        return `http://localhost:5500/proxy?url=${encodeURIComponent(url)}`;
    };

    // 🎧 LOAD & PLAY TRACK
    const loadTrack = async (index) => {
        if (index < 0 || index >= queue.length) return;

        queueIndex = index;
        const track = queue[index];

        console.log('Playing track:', track.title, 'Source:', track.src);

        let finalUrl = track.src;

        if (track.playback === 'ytmusic' && track.src.includes('/streams/')) {
            try {
                // Fetch the actual audio stream from piped API
                const streamData = await fetch(proxy(track.src)).then(r => r.json());
                const audioStreams = streamData.audioStreams;
                if (audioStreams && audioStreams.length > 0) {
                    // Try to get high quality m4a or webm
                    const bestAudio = audioStreams.find(s => s.codec === 'mp4a.40.2') || audioStreams[0];
                    finalUrl = proxy(bestAudio.url);
                } else {
                    throw new Error("No audio streams found");
                }
            } catch (err) {
                console.error("Failed to fetch YT stream:", err);
                showToast('Failed to load YT stream', '⚠');
                return;
            }
        } else if (!track.src) {
            showToast('No playable source found', '⚠');
            return;
        } else {
            // IMPORTANT: Saavn API full songs often need to be proxied to work properly
            // without being cut off or blocked by CORS.
            finalUrl = proxy(track.src);
        }

        audioPlayer.src = finalUrl;
        audioPlayer.load(); 

        audioPlayer.play().then(() => {
            console.log('Playback started');
        }).catch((err) => {
            console.error('Playback error:', err);
            // Fallback to direct URL if proxy fails
            audioPlayer.src = track.src;
            audioPlayer.play().catch(e => {
                showToast('Playback error', '⚠');
            });
        });

        // Show player bar
        document.querySelector('.app-container')?.classList.add('has-player');

        document.getElementById('current-title').textContent = track.title;
        document.getElementById('current-artist').textContent = track.artist;

        // artwork (optional)
        const art = document.querySelector('.playing-artwork .artwork-placeholder');
        if (art) {
            applyBackgroundImageWithFallback(art, track.artwork);
            art.classList.add('playing');
        }
        
        // Update play button icon
        const playIcon = document.querySelector('#main-play-btn i');
        if (playIcon) {
            playIcon.className = 'ph-fill ph-pause';
        }
        isPlaying = true;
        
        // Update highlight in queue view if open
        updateQueueView();
    };

    // 🕒 PROGRESS BAR & VOLUME
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.querySelector('.time-current');
    const totalTimeEl = document.querySelector('.time-total');
    const progressContainer = document.getElementById('progress-container');

    const formatTime = (secs) => {
        if (isNaN(secs)) return '0:00';
        const mins = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${mins}:${s.toString().padStart(2, '0')}`;
    };

    audioPlayer.addEventListener('timeupdate', () => {
        if (!audioPlayer.duration) return;
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        if (totalTimeEl) totalTimeEl.textContent = formatTime(audioPlayer.duration);
    });

    progressContainer?.addEventListener('click', (e) => {
        if (!audioPlayer.duration) return;
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pos * audioPlayer.duration;
    });

    // 🔊 VOLUME
    const volumeFill = document.querySelector('.volume-bar-fill');
    const volumeContainer = document.querySelector('.volume-bar-bg');

    volumeContainer?.addEventListener('click', (e) => {
        const rect = volumeContainer.getBoundingClientRect();
        const vol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioPlayer.volume = vol;
        if (volumeFill) volumeFill.style.width = `${vol * 100}%`;
    });

    let isShuffle = false;
    let repeatMode = 'off'; // off, one, all

    document.getElementById('shuffle-btn')?.addEventListener('click', () => {
        isShuffle = !isShuffle;
        document.getElementById('shuffle-btn').classList.toggle('active', isShuffle);
        showToast(isShuffle ? "Shuffle On" : "Shuffle Off", "🔀");
    });

    document.getElementById('repeat-btn')?.addEventListener('click', () => {
        const icon = document.querySelector('#repeat-btn i');
        if (repeatMode === 'off') {
            repeatMode = 'all';
            document.getElementById('repeat-btn').classList.add('active');
            if (icon) icon.className = 'ph ph-repeat';
        } else if (repeatMode === 'all') {
            repeatMode = 'one';
            if (icon) icon.className = 'ph ph-repeat-once';
        } else {
            repeatMode = 'off';
            document.getElementById('repeat-btn').classList.remove('active');
            if (icon) icon.className = 'ph ph-repeat';
        }
        showToast(`Repeat ${repeatMode}`, "🔁");
    });

    // 🔍 SEARCH FUNCTION
    const performSearch = async (query) => {
        if (!query) return;
        const grid = document.getElementById('search-grid');
        if (!grid) return;
        
        grid.innerHTML = '<div class="loader-container"><div class="loader"></div><p>Summoning Aura...</p></div>';
        showView('search');

        let tracks = [];
        let searchSuccess = false;

        const selectedEngine = document.querySelector('input[name="search_engine"]:checked')?.value || 'saavn';

        if (selectedEngine === 'ytmusic') {
            // YouTube Music via Piped API
            for (const mirror of API.ytmusic.mirrors) {
                try {
                    const ytUrl = `${mirror}${API.ytmusic.searchPath}?q=${encodeURIComponent(query)}&filter=music_songs`;
                    console.log(`Searching YT Music mirror: ${mirror}`);
                    
                    const res = await fetch(proxy(ytUrl));
                    if (!res.ok) throw new Error(`Mirror ${mirror} returned ${res.status}`);
                    
                    const data = await res.json();
                    
                    if (data?.items?.length > 0) {
                        tracks = data.items.map(item => ({
                            title: item.title,
                            artist: item.uploaderName || 'Unknown Artist',
                            artwork: item.thumbnail || '',
                            // we'll get the real stream dynamically, but we can set src to the stream proxy endpoint
                            src: `${mirror}/streams/${item.url.split('?v=')[1] || item.url.split('/watch?v=')[1]}`,
                            playback: 'ytmusic',
                            originalUrl: item.url
                        }));
                        searchSuccess = true;
                        break;
                    }
                } catch (err) {
                    console.warn(`YT Mirror ${mirror} failed:`, err.message);
                    continue;
                }
            }
        } else if (selectedEngine === 'saavn') {
            // Try mirrors in sequence for Saavn
            for (const mirror of API.saavn.mirrors) {
                try {
                    const saavnUrl = `${mirror}${API.saavn.searchPath}?query=${encodeURIComponent(query)}`;
                    console.log(`Searching mirror: ${mirror}`);
                    
                    const res = await fetch(proxy(saavnUrl));
                    if (!res.ok) throw new Error(`Mirror ${mirror} returned ${res.status}`);
                    
                    const data = await res.json();
                    console.log(`Success from ${mirror}:`, data);

                if (data?.data?.results?.length > 0) {
                    tracks = data.data.results.map(item => {
                        const dlArr = item.downloadUrl || [];
                        const best = dlArr.find(d => String(d.quality) === '320kbps') || 
                                   dlArr.find(d => String(d.quality) === '160kbps') ||
                                   dlArr[dlArr.length - 1];
                        
                        let downloadUrl = best?.url || best?.link || '';
                        
                        if (downloadUrl.includes('preview')) {
                            const better = dlArr.find(d => String(d.quality) === '320kbps');
                            if (better) downloadUrl = better.url || better.link;
                        }
                        
                        const decode = (str) => {
                            const txt = document.createElement('textarea');
                            txt.innerHTML = str;
                            return txt.value;
                        };

                        return {
                            title: decode(item.name),
                            artist: decode(item.primaryArtists),
                            artwork: item.image?.find(img => img.quality === '500x500')?.url || 
                                     item.image?.[item.image.length - 1]?.url,
                            src: downloadUrl,
                            playback: 'saavn'
                        };
                    });
                    searchSuccess = true;
                    break; 
                }
            } catch (err) {
                console.warn(`Saavn Mirror ${mirror} failed:`, err.message);
                continue; 
            }
        }
        }

        // 🔁 2. Fallback or selected engine iTunes
        if (!searchSuccess && (selectedEngine === 'itunes' || selectedEngine === 'saavn')) {
            try {
                console.log('Using iTunes...');
                const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`;
                const res2 = await fetch(proxy(itunesUrl));
                const data2 = await res2.json();

                if (data2?.results?.length > 0) {
                    tracks = data2.results.map(item => ({
                        title: item.trackName,
                        artist: item.artistName,
                        artwork: item.artworkUrl100?.replace('100x100', '300x300'),
                        src: item.previewUrl,
                        playback: 'itunes'
                    }));
                    searchSuccess = true;
                }
            } catch (err) {
                console.error('iTunes search failed:', err);
            }
        }

        if (!searchSuccess || !tracks.length) {
            grid.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                    <i class="ph ph-magnifying-glass" style="font-size: 48px; opacity: 0.3; margin-bottom: 20px;"></i>
                    <h3>No results found</h3>
                    <p style="color: var(--text-muted);">Try searching for something else or check your connection.</p>
                </div>`;
            return;
        }

        // 🎨 RENDER UI
        grid.innerHTML = tracks.map((t, i) => `
            <div class="media-card" data-index="${i}">
                <div class="card-image"></div>
                <div class="card-content" style="padding: 12px 0;">
                    <h4 style="margin: 0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.title}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.artist}</p>
                </div>
            </div>
        `).join('');

        // 🖱 CLICK EVENTS
        grid.querySelectorAll('.media-card').forEach((card, i) => {
            card.addEventListener('click', () => {
                queue = tracks;
                loadTrack(i);
                updateQueueView();
            });
            applyBackgroundImageWithFallback(card.querySelector('.card-image'), tracks[i].artwork);
        });
    };

    // ⌨️ SEARCH INPUT
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });

    document.getElementById('search-btn')?.addEventListener('click', () => {
        const val = document.getElementById('search-input')?.value || '';
        if (val.trim()) performSearch(val.trim());
    });

    // 🔘 ENGINE SELECTOR
    document.querySelectorAll('.engine-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const radio = btn.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                showToast(`Search engine swiched to ${btn.textContent.trim()}`, '🔍');
            }
        });
    });

    document.getElementById('queue-toggle-btn')?.addEventListener('click', toggleQueueView);
    document.getElementById('clear-queue-btn')?.addEventListener('click', () => {
        queue = [];
        queueIndex = -1;
        updateQueueView();
    });

    document.querySelectorAll('#main-view .media-card').forEach((card) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const q = card.dataset.query;
            if (q) performSearch(q);
        });

        const imgEl = card.querySelector('.card-image');
        const bg = imgEl?.style?.backgroundImage;
        if (imgEl && bg && bg !== 'none') {
            const match = bg.match(/url\(["']?(.*?)["']?\)/i);
            const url = match?.[1];
            applyBackgroundImageWithFallback(imgEl, url);
        } else if (imgEl) {
            applyBackgroundImageWithFallback(imgEl, FALLBACK_IMAGE);
        }
    });

    // 📱 Navigation Menu Handling
    document.querySelectorAll('.nav-menu li').forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all
            document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
            // Add active class to clicked
            item.classList.add('active');

            const text = item.textContent.trim().toLowerCase();
            
            // Handle genre links specifically
            if (item.classList.contains('genre-link')) {
                const query = item.dataset.query;
                if (query) performSearch(query);
                return;
            }

            if (text.includes('home')) {
                showView('main');
            } else if (text.includes('discover')) {
                performSearch('trending hits');
            } else if (text.includes('radio')) {
                performSearch('lofi radio');
            } else if (text.includes('artists')) {
                performSearch('popular artists');
            } else if (text.includes('local files')) {
                showView('local');
            } else if (text.includes('queue')) {
                showView('queue');
                updateQueueView();
            } else if (text.includes('favorites')) {
                showToast('Favorites coming soon!', '❤');
            } else if (text.includes('recent')) {
                showToast('Recent history coming soon!', '🕒');
            }
        });
    });

    // ⏭ NEXT
    document.getElementById('next-btn')?.addEventListener('click', () => {
        if (!queue.length) return;
        const nextIndex = queueIndex + 1;
        loadTrack(nextIndex >= queue.length ? 0 : nextIndex);
    });

    // ⏮ PREVIOUS
    document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (!queue.length) return;
        const prevIndex = queueIndex - 1;
        loadTrack(prevIndex < 0 ? queue.length - 1 : prevIndex);
    });

    // ▶ PLAY / PAUSE
    document.getElementById('main-play-btn')?.addEventListener('click', () => {
        if (!audioPlayer.src) return;
        const playIcon = document.querySelector('#main-play-btn i');
        if (audioPlayer.paused) {
            audioPlayer.play().catch(() => showToast('Playback error', '⚠'));
            isPlaying = true;
            if (playIcon) playIcon.className = 'ph-fill ph-pause';
        } else {
            audioPlayer.pause();
            isPlaying = false;
            if (playIcon) playIcon.className = 'ph-fill ph-play';
        }
    });

    // 🔁 AUTO NEXT
    audioPlayer.addEventListener('ended', () => {
        if (!queue.length) return;
        const nextIndex = queueIndex + 1;
        loadTrack(nextIndex >= queue.length ? 0 : nextIndex);
    });

});

// 🔔 TOAST MESSAGE
function showToast(msg, icon) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.innerHTML = `${icon} ${msg}`;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}