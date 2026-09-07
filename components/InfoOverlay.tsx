import React, { useState } from 'react';

interface InfoOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoOverlay: React.FC<InfoOverlayProps> = ({ isOpen, onClose }) => {
  const [showFullKey, setShowFullKey] = useState(false);
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();

  const orgLinks = [
    { label: 'GITHUB', url: 'https://github.com/Artifact-Virtual' },
    { label: 'X_TWITTER', url: 'https://x.com/siriusly_alpha' },
    { label: 'GITBOOK', url: 'https://artifact-virtual.gitbook.io/home/' },
    { label: 'DISCORD', url: 'https://discord.gg/cbAHXzcVS' },
    { label: 'LINKEDIN', url: 'https://www.linkedin.com/company/artifactvirtual/' },
  ];

  const personalLinks = [
    { label: 'LINKEDIN', url: 'https://www.linkedin.com/in/ali-shakil-a790b2109?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app' },
    { label: 'GITHUB', url: 'https://github.com/amuzetnoM' },
    { label: 'X_TWITTER', url: 'https://x.com/siriusly_alpha' },
    { label: 'INSTAGRAM', url: 'https://www.instagram.com/siriusly_ali_shakil?igsh=YWtudmtqOTh5cjV1' },
  ];

  const pgpKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBGl5yPUBEADCDJutWLH9cbXq8TpOPN4DX7M5giw3ToK4iEKu0Na/YFV2Aze7
H4AZbziLNI8Gyhf0bO2H3ssnahC9PrnS8M4M3XIcOBzYWVl5ZDpgmEwv9SAyr2F8
/N4aljy59O1tPcWOc44LAah8L5Er1B5RVvnLqzUJcqv8BAUz0Zmg7DtUOW3b6D3k
UzTATVp60rD/vZreeRdI9Tw03DhCBBZUUXqkC8XevzTbDVQkWaGqzkyWKqEbvVng
qTt/7IrH0bTIw+UZ/FdIxPgUt55KS6U69vKktxK8ZfrJvB+t6UNeNgXfXjBHk+zE
mKdFUF4ccaC8GwOSfu4UVdvdMad3hI4vXrLPtMDRdDOid75ZU9XOTHsb+0zQkMsZ
XzwrGDypfFE3el+iNiA843QBh1Ikd+jugwh7OcoAiQgR80QP4Q9H2GFtT7wF2674
iBIajVGGB8ONg7nqy4jYAZdVPZohVDwOVhC1DvdJ9dO9Dy87jMtK/48mquOZKftL
CqkyZKfmLRL+uA3zwa2YMe37VXI4djmtsPpAzP1l5PYqWwKYkvpFuWDyXKCNqmtl
bPkuo+q/g9Ci3DxLcvGmodfBpxqV/sZtcKDpTYuW8wKvXkZuGp02my8Xo8f1JTyn
H2t1lxJiuuMx9W7LNqLS8lQng/UDTi4t6wX4Kg+N0zGz9BcENjRaqp8hPQARAQAB
tCtBbGkgQS4gU2hha2lsIDxzdXBwb3J0QGFydGlmYWN0dmlydHVhbC5jb20+iQJt
BBMBCABXFiEEqKXpwSINu51yOZNLgqwW1hhusBMFAml5yPUbFIAAAAAABAAObWFu
dTIsMi41KzEuMTEsMiwxAhsPBQsJCAcCAiICBhUKCQgLAgQWAgMBAh4HAheAAAoJ
EIKsFtYYbrATYdQQAI6A9dYs/0+dKcQzXFwzZcGqBheQx3HVpd4Spm7zeNNBQgYm
2/aCmwJV5AD5gDx1tmx9lK8o/mBgazgsacIrE+IqDI5iMefE9WcUqUlu9rwN5D64
Ua0yH/nj5ge+DZRBN+666smiVGxgXB12GdQr9481S3TDtXSNzaBacfDqngg1urr4
6ZpSZgo2mzftYcOvX32iYWh1pAePAXJiMZP0n1iu4YXpREdiNrosnInnON5fDGQp
Bymvvj2COuJ8UDj+8XB5kf4/tlThJOiFExQ8EXOXeYQ8gmhum8z2gZSequMigIms
VAhQeEPo6fOLjUXytu/33t4HtpqR1SXN2+7IKq/BZ9h8XnIYSCpbQ9cHYfJUKL2g
rbbmeBlGep8ffyNYIbVlmmgZbtMQ4oyXVgih62YuVjA6JlOBnUIaPr8XKU2iozVn
kmWeb9WxZD4rxi9ZPh6TLk+LgJ+ALCAK40Bd7oZfBqVgDizbAyDePFtx7i9NXQsX
79OVdxLKAt5t0e1z/c2PkQ8eOTnhlhjyUBzuaKcpcT7PtP0/nDlKslLFizOk3HLE
Qj9hMia4+qNGlYgB+oaaAcjgCgN561nP1nV/xK+Sd3s5sA+FnQJXV16C8rpbyuJt
L2Z1naIWabD32peknSXErlxyoY7KR8rxZ4mv33O8p0g5XB6BPwzNIs7myGxo
=f8Xw
-----END PGP PUBLIC KEY BLOCK-----`;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center animate-in slide-in-from-top-full duration-500 ease-in-out">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md"
        onClick={onClose}
      ></div>
      
      <div className="relative w-full h-auto min-h-[60vh] lg:min-h-[80vh] bg-black border-b border-white/20 p-8 md:p-16 overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 pt-12">
          
          {/* Close Trigger */}
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors p-4 group z-20"
          >
            <span className="text-[10px] font-mono tracking-[0.5em] mr-4 opacity-0 group-hover:opacity-100 transition-opacity">CLOSE_MENU</span>
            <i className="fa-solid fa-chevron-up text-xl"></i>
          </button>

          {/* Left Column: Mission */}
          <div className="lg:col-span-6 space-y-12">
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.4em]">MANIFESTO_0.1</span>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9]">
                Architecting systems for digital sovereignty and governance.
              </h2>
            </div>
            
            <p className="text-white/40 font-medium text-lg md:text-xl leading-relaxed max-w-lg italic border-l border-white/10 pl-8">
              Artifact functions as a research and development collective dedicated to digital sovereignty and governance in the age of general intelligence.
            </p>

            <div className="pt-12 hidden lg:block">
              <div className="w-16 h-16 border border-white flex items-center justify-center font-bold text-white italic text-xl mb-6">
                AV
              </div>
              <p className="text-[8px] font-mono text-white/10 tracking-[0.5em] uppercase leading-relaxed">
                © {currentYear} ARTIFACT VIRTUAL R&D SYSTEMS.<br />
                ALL PROTOCOLS RESERVED.
              </p>
            </div>
          </div>

          {/* Right Columns: Metadata & Socials */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-12">
            
            {/* Org Socials */}
            <div className="space-y-8">
              <section>
                <h4 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.4em] mb-4">ORG_PROTOCOLS</h4>
                <ul className="space-y-3">
                  {orgLinks.map((link) => (
                    <li key={link.label}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 group">
                        <div className="w-1.5 h-[1px] bg-white/20 group-hover:w-4 transition-all"></div>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h4 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.4em] mb-4">SYSTEM_INFO</h4>
                <div className="space-y-2 font-mono text-[10px] text-white/40">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>BUILD_VERSION</span>
                    <span className="text-white">v2.5.0-STABLE</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>UPTIME</span>
                    <span className="text-white">99.999%</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Personal Socials & Contact */}
            <div className="space-y-8">
              <section>
                <h4 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.4em] mb-4">FOUNDING_NODE</h4>
                <div className="mb-4">
                  <p className="text-white font-bold tracking-widest text-[11px] uppercase">ALI SHAKIL</p>
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">SYSTEM_ARCHITECT</p>
                </div>
                <ul className="space-y-3">
                  {personalLinks.map((link) => (
                    <li key={link.label + '_personal'}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 group">
                        <div className="w-1.5 h-[1px] bg-white/10 group-hover:w-4 transition-all"></div>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.4em] mb-4">CONTACT_GATEWAY</h4>
                  <a href="mailto:support@artifactvirtual.com" className="text-xs text-white/60 font-bold tracking-widest leading-loose hover:text-white transition-colors">
                    SUPPORT@ARTIFACTVIRTUAL.COM
                  </a>
                  <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-1">ENCRYPTED_COMMS_ONLY</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div>
                    <h5 className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">PGP_FINGERPRINT</h5>
                    <p className="text-[10px] font-mono text-white/40 break-all leading-tight">
                      A8A5 E9C1 220D BB9D 7239 934B 82AC 16D6 186E B013
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h5 className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">PGP_PUBLIC_KEY</h5>
                      <button 
                        onClick={() => setShowFullKey(!showFullKey)}
                        className="text-[8px] font-mono text-white/30 hover:text-white uppercase transition-colors"
                      >
                        {showFullKey ? '[ MINIMIZE ]' : '[ VIEW_FULL ]'}
                      </button>
                    </div>
                    <div className={`relative group/key overflow-hidden transition-all duration-500 ${showFullKey ? 'h-64' : 'h-24'}`}>
                      <pre className="text-[7px] font-mono text-white/20 bg-white/[0.02] p-2 rounded overflow-x-hidden overflow-y-auto h-full select-all leading-[1.1]">
                        {pgpKey}
                      </pre>
                      {!showFullKey && (
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Mobile Copyright Only */}
              <div className="lg:hidden pt-8 pb-8">
                <p className="text-[8px] font-mono text-white/10 tracking-[0.5em] uppercase leading-relaxed">
                  © {currentYear} ARTIFACT VIRTUAL.<br />
                  ALL PROTOCOLS RESERVED.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Aesthetic Scanline removed for clean bg */}
    </div>
  );
};

export default InfoOverlay;