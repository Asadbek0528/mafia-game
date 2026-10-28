import "./shield-orb.scss";

type ShieldOrbProps = {
  size?: number;
  burst?: boolean;
};

export default function ShieldOrb({ size = 200, burst = false }: ShieldOrbProps) {
  return (
    <span className={burst ? "shield-orb shield-orb-burst" : "shield-orb"} style={{ width: size, height: size }} aria-hidden="true">
      {burst && (
        <>
          <span className="shield-orb-wave" />
          <span className="shield-orb-wave" />
          <span className="shield-orb-wave" />
        </>
      )}
      <span className="shield-orb-ring shield-orb-ring-outer" />
      <span className="shield-orb-ring shield-orb-ring-inner" />
      <span className="shield-orb-dome" />
      <svg className="shield-orb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6l-8-3Z" fill="rgba(120, 210, 255, 0.18)" />
        <path d="m8.5 12 2.4 2.4 4.6-5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
