import "./dead-banner.scss";

export default function DeadBanner() {
  return (
    <div className="dead-banner" role="status">
      <svg className="dead-banner-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="currentColor"
          d="M24 4C13.5 4 7 11.2 7 20.5c0 5.300 2.200 9.300 5.500 12.100V38c0 1.700 1.300 3 3 3h1.500v3.500h4V41h6v3.500h4V41h1.500c1.700 0 3-1.300 3-3v-5.400c3.300-2.800 5.500-6.800 5.500-12.100C41 11.200 34.500 4 24 4z"
        />
        <path fill="#140203" d="M12.500 19.500c3.500-1.800 7-1.300 9 1.500-.5 3.800-2.700 6-5.500 6s-4.500-3-3.500-7.500zM35.500 19.500c-3.500-1.800-7-1.300-9 1.500.5 3.800 2.700 6 5.500 6s4.500-3 3.500-7.500zM24 27l2.500 5h-5z" />
      </svg>
      <div className="dead-banner-body">
        <p className="dead-banner-title">Вы погибли</p>
        <p className="dead-banner-text">
          Теперь вы наблюдатель: видите роли всех игроков. Ваши сообщения в чате видят только погибшие.
        </p>
      </div>
    </div>
  );
}
