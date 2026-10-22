import "./coin-icon.scss";

export default function CoinIcon() {
  return (
    <svg className="coin-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#e3a531" stroke="#ffd877" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#9a6a12" strokeWidth="1.2" />
      <path d="M9.2 15.2V8.8l2.8 3.4 2.8-3.4v6.4" fill="none" stroke="#5b3d06" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
