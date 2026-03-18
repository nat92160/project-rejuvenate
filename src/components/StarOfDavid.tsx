const StarOfDavid = ({ size = 80 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id="starGradHero" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#f0d68a" }} />
        <stop offset="50%" style={{ stopColor: "#d4a843" }} />
        <stop offset="100%" style={{ stopColor: "#b8860b" }} />
      </linearGradient>
      <filter id="starGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <polygon points="50,10 90,70 10,70" fill="none" stroke="url(#starGradHero)" strokeWidth="4" strokeLinejoin="round" filter="url(#starGlow)" />
    <polygon points="50,90 10,30 90,30" fill="none" stroke="url(#starGradHero)" strokeWidth="4" strokeLinejoin="round" filter="url(#starGlow)" />
    <polygon points="50,10 90,70 10,70" fill="url(#starGradHero)" fillOpacity="0.08" />
    <polygon points="50,90 10,30 90,30" fill="url(#starGradHero)" fillOpacity="0.08" />
  </svg>
);

export default StarOfDavid;
