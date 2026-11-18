import { useState, useEffect } from 'react';
import { convertUrlToRealMp3 } from './utils/audioToMp3';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('videoTab');
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('uk_history')) || []);
  const [downloadingIdx, setDownloadingIdx] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const detectPlatform = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return { name: 'YouTube', icon: 'fa-youtube' };
    if (url.includes('instagram.com')) return { name: 'Instagram', icon: 'fa-instagram' };
    if (url.includes('twitter.com') || url.includes('x.com')) return { name: 'Twitter', icon: 'fa-twitter' };
    if (url.includes('tiktok.com')) return { name: 'TikTok', icon: 'fa-tiktok' };
    if (url.includes('facebook.com') || url.includes('fb.watch')) return { name: 'Facebook', icon: 'fa-facebook' };
    return { name: 'Web', icon: 'fa-globe' };
  };

  const saveToHistory = (url, title, thumbnail) => {
    const updated = [{ url, title, thumbnail }, ...history.filter((item) => item.url !== url)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('uk_history', JSON.stringify(updated));
  };

  const handleExtract = async (e, overrideUrl = null) => {
    if (e) e.preventDefault();
    const targetUrl = (overrideUrl || videoUrl).trim();
    if (!targetUrl) return;

    setLoading(true);
    setErrorMsg('');
    setResult(null);
    setActiveTab('videoTab');

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Could not process link.');
      } else {
        setResult(data);
        saveToHistory(targetUrl, data.title || 'Media Found', data.thumbnail || '');
      }
    } catch (err) {
      setErrorMsg('Network Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartButton = async () => {
    if (videoUrl.trim() !== '') {
      setVideoUrl('');
    } else {
      try {
        const text = await navigator.clipboard.readText();
        if (text) setVideoUrl(text);
      } catch {
        alert('Please allow clipboard access or paste manually.');
      }
    }
  };

  const [audioStatus, setAudioStatus] = useState('Converting MP3...');

  const handleForceDownload = async (url, filename, isAudio, idx) => {
    setDownloadingIdx(idx);

    // 1. REAL MP3 CONVERSION (Genuine .mp3 file for ringtones & editors)
    if (isAudio) {
      try {
        await convertUrlToRealMp3(url, (msg) => setAudioStatus(msg));
      } catch (err) {
        alert('Could not convert to MP3 directly: ' + err.message);
      } finally {
        setDownloadingIdx(null);
        setAudioStatus('Converting MP3...');
      }
      return;
    }

    // 2. VIDEO (MP4): Direct original stream (Insta Story / WhatsApp Status 100% safe)
    try {
      const response = await fetch(url, { mode: 'cors' });
      const buffer = await response.arrayBuffer();
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'ukdownloaders.mp4';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ukdownloaders.mp4';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloadingIdx(null);
    }
  };

  // Parse Videos & Audios cleanly
  const parseMedias = () => {
    const videos = [];
    const audios = [];
    const seenAudioUrls = new Set();

    if (result?.medias && Array.isArray(result.medias)) {
      result.medias.forEach((m) => {
        const url = m.url || '';
        const ext = m.extension || '';
        const quality = m.quality || 'Standard';
        const type = m.type || 'video';
        const size = m.formattedSize || 'N/A';

        if (!url || ext === 'webm') return;

        let noAudio = false;
        if (m.audio === false || m.hasAudio === false) noAudio = true;
        if (url.toLowerCase().includes('av01') || url.toLowerCase().includes('avc1')) noAudio = true;
        if (quality === '360p') noAudio = false;

        if (type === 'audio' || ext === 'm4a' || ext === 'mp3') {
          if (!seenAudioUrls.has(url)) {
            seenAudioUrls.add(url);
            audios.push({ url, label: 'Audio', size });
          }
        } else {
          const isHd = /720|1080|hd/i.test(quality);
          let btnClass = 'dl-sd';
          let icon = 'fa-video';
          let label = quality;

          if (noAudio) {
            btnClass = 'dl-mute';
            label += ' 🔇';
            icon = 'fa-video-slash';
          } else if (isHd) {
            btnClass = 'dl-hd';
            icon = 'fa-film';
          }

          videos.push({ url, label, size, btnClass, icon });
        }
      });
    }
    return { videos, audios };
  };

  const { videos, audios } = parseMedias();
  const platform = detectPlatform(videoUrl);

  return (
    <div className="app-wrapper">
      <header>
        <a href="/" className="logo">
          <span className="u-text">U</span>
          <span className="k-text">K</span>
          <span className="downloaders-text">Downloaders</span>
        </a>
        <button className="theme-btn" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle theme">
          <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
      </header>

      <div className="container">
        <a href="/dabbulu.jpeg" target="_blank" rel="noreferrer" className="promo-btn">
          <i className="fas fa-fire"></i> Unlock Free Cash Here
        </a>

        <div className="tool-box">
          <h1>Universal Media Downloader</h1>
          <p className="subtitle">Supports YouTube, Instagram Reels, Twitter X, TikTok & more.</p>

          <form onSubmit={handleExtract}>
            <div className="input-group">
              <button
                type="button"
                className="smart-btn"
                onClick={handleSmartButton}
                title={videoUrl.trim() ? 'Clear input' : 'Paste from clipboard'}
              >
                <i className={`fas ${videoUrl.trim() ? 'fa-times' : 'fa-clipboard'}`}></i>
              </button>
              <input
                type="url"
                placeholder="Paste video link here..."
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <button type="submit" className="download-btn" disabled={loading}>
                <span>{loading ? 'Extracting...' : 'Download'}</span>
                <i
                  className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`}
                  style={{ marginLeft: '6px' }}
                ></i>
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="error-msg">
              <i className="fas fa-exclamation-triangle"></i> {errorMsg}
            </div>
          )}

          {/* Skeleton Shimmer */}
          {loading && (
            <div className="skeleton-wrapper">
              <div className="skeleton skel-badge"></div>
              <div className="skel-preview">
                <div className="skeleton skel-thumb"></div>
                <div className="skel-title-container">
                  <div className="skeleton skel-title-line"></div>
                  <div className="skeleton skel-title-line"></div>
                  <div className="skeleton skel-title-line short"></div>
                </div>
              </div>
              <div className="skel-grid">
                <div className="skeleton skel-btn"></div>
                <div className="skeleton skel-btn"></div>
                <div className="skeleton skel-btn"></div>
                <div className="skeleton skel-btn"></div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="result-area">
              <div className="platform-badge">
                <i className={`fab ${platform.icon}`}></i> {platform.name} Detected
              </div>

              <div className="preview-box">
                {result.thumbnail && <img src={result.thumbnail} alt="Thumbnail" loading="lazy" />}
                <div className="video-title">{result.title || 'Media Found Successfully'}</div>
              </div>

              <div className="tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'videoTab' ? 'active' : ''}`}
                  onClick={() => setActiveTab('videoTab')}
                >
                  Video ({videos.length})
                </button>
                {audios.length > 0 && (
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === 'audioTab' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audioTab')}
                  >
                    Audio
                  </button>
                )}
                {result.thumbnail && (
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === 'thumbTab' ? 'active' : ''}`}
                    onClick={() => setActiveTab('thumbTab')}
                  >
                    Thumbnail
                  </button>
                )}
              </div>

              {activeTab === 'videoTab' && (
                <div className="link-grid">
                  {videos.length > 0 ? (
                    videos.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleForceDownload(v.url, 'ukdownloaders.mp4', false, `v-${i}`)}
                        className={`dl-link ${v.btnClass}`}
                      >
                        <span>
                          <i className={`fas ${downloadingIdx === `v-${i}` ? 'fa-bolt fa-spin' : v.icon}`}></i>{' '}
                          {downloadingIdx === `v-${i}` ? 'Downloading...' : v.label}
                        </span>
                        <span className="size-badge">{v.size}</span>
                      </button>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No video streams found.</p>
                  )}
                </div>
              )}

              {activeTab === 'audioTab' && (
                <div className="link-grid">
                  {audios.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleForceDownload(a.url, 'ukdownloaders-audio.m4a', true, `a-${i}`)}
                      className="dl-link dl-audio"
                    >
                      <span>
                        <i className={`fas ${downloadingIdx === `a-${i}` ? 'fa-bolt fa-spin' : 'fa-music'}`}></i>{' '}
                        {downloadingIdx === `a-${i}` ? 'Downloading Audio...' : a.label}
                      </span>
                      <span className="size-badge">{a.size}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'thumbTab' && result.thumbnail && (
                <div className="link-grid">
                  <a href={`/api/thumbnail?url=${encodeURIComponent(result.thumbnail)}`} className="dl-link dl-thumb">
                    <span>
                      <i className="fas fa-image"></i> Save HD Image
                    </span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent History */}
        {history.length > 0 && (
          <div className="history-container">
            <div className="history-header">
              <h3>Recent Downloads</h3>
              <button
                type="button"
                className="clear-history-btn"
                onClick={() => {
                  if (window.confirm('Clear recent downloads?')) {
                    setHistory([]);
                    localStorage.removeItem('uk_history');
                  }
                }}
              >
                Clear All
              </button>
            </div>
            <div className="history-slider">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="history-card"
                  onClick={() => {
                    setVideoUrl(item.url);
                    handleExtract(null, item.url);
                  }}
                >
                  <img
                    src={item.thumbnail || 'https://via.placeholder.com/150x85?text=No+Image'}
                    className="history-thumb"
                    alt="thumb"
                  />
                  <div className="history-title" title={item.title}>
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer>
        <p>
          <span className="status-dot"></span> System Status: Operational
        </p>
        <p style={{ marginTop: '6px' }}>
          &copy; 2026 UK Downloaders. Made with <i className="fas fa-heart" style={{ color: '#ff4757' }}></i> by{' '}
          <a href="#privacy" onClick={(e) => { e.preventDefault(); setShowPrivacy(!showPrivacy); }} className="author-name">
            Uday Bhaskar N
          </a>{' '}
          •{' '}
          <a href="#privacy" onClick={(e) => { e.preventDefault(); setShowPrivacy(!showPrivacy); }} style={{ color: 'var(--primary)' }}>
            Privacy Policy
          </a>
        </p>

        {showPrivacy && (
          <div style={{ maxWidth: '650px', margin: '18px auto 0', textAlign: 'left', padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', fontSize: '0.82rem' }}>
            <strong>Privacy Policy:</strong> UK Downloaders does not store any downloaded videos or user search history on our servers. All recent download history is saved locally on your own browser device.
          </div>
        )}
      </footer>
    </div>
  );
}