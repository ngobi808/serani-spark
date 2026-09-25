export function Footer() {
  return (
    <footer style={{ background: 'var(--ss-green-dark)', color: 'var(--ss-text-light)', marginTop: '2rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <a href="https://www.instagram.com/seranispark/" target="_blank" rel="noreferrer" style={{ color: 'var(--ss-gold)', textDecoration: 'none', fontWeight: 600 }}>
            Instagram
          </a>
          <a href="https://www.tiktok.com/@seranispark" target="_blank" rel="noreferrer" style={{ color: 'var(--ss-gold)', textDecoration: 'none', fontWeight: 600 }}>
            TikTok
          </a>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>© {new Date().getFullYear()} Serani Spark Company Ltd</p>
      </div>
    </footer>
  );
}
