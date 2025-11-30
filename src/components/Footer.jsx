export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--glass-border)',
            padding: 'var(--space-md) var(--space-sm)',
            marginTop: 'auto',
            width: '100%'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)'
            }}>
                {/* Main Footer Content */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: 'var(--space-md)',
                    textAlign: 'center'
                }}>
                    {/* About Section */}
                    <div>
                        <h4 style={{
                            fontSize: '1rem',
                            marginBottom: 'var(--space-sm)',
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            📍 Live Location Tracker
                        </h4>
                        <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                            Stay connected with your group in crowded places. Real-time location tracking made simple and secure.
                        </p>
                    </div>

                    {/* Contact Section */}
                    <div>
                        <h4 style={{
                            fontSize: '1rem',
                            marginBottom: 'var(--space-sm)',
                            color: 'var(--text-secondary)'
                        }}>
                            Contact
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                            <a
                                href="mailto:anujsinghpp123@gmail.com"
                                style={{
                                    color: 'var(--primary)',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'color var(--transition-fast)'
                                }}
                                onMouseOver={(e) => e.target.style.color = 'var(--primary-light)'}
                                onMouseOut={(e) => e.target.style.color = 'var(--primary)'}
                            >
                                📧 anujsinghpp123@gmail.com
                            </a>
                            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
                                👨‍💻 Anuj Kumar Singh
                            </p>
                        </div>
                    </div>

                    {/* Features Section */}
                    <div>
                        <h4 style={{
                            fontSize: '1rem',
                            marginBottom: 'var(--space-sm)',
                            color: 'var(--text-secondary)'
                        }}>
                            Features
                        </h4>
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: 0,
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                        }}>
                            <li>🔄 Location Sharing Toggle</li>
                            <li>⏱️ Time-Limited Groups</li>
                            <li>🚨 Geofencing Alerts</li>
                            <li>📱 Mobile Responsive</li>
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div style={{
                    height: '1px',
                    background: 'var(--glass-border)',
                    width: '100%'
                }}></div>

                {/* Bottom Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-sm)',
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)'
                }}>
                    <p style={{ margin: 0 }}>
                        © {currentYear} Anuj Kumar Singh. All rights reserved.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                        <span>Made with ❤️ for tracking in crowded areas</span>
                    </div>
                </div>

                {/* Tech Stack */}
                <div style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    paddingTop: 'var(--space-sm)',
                    borderTop: '1px solid var(--glass-border)'
                }}>
                    <p style={{ margin: 0 }}>
                        Built with React ⚛️ • Node.js 🟢 • Leaflet 🗺️ • 100% Free & Open Source
                    </p>
                </div>
            </div>
        </footer>
    );
}
