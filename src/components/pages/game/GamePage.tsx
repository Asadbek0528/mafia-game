"use client";

import AchievementUnlocked from "@/components/pages/widgets/achievements/AchievementUnlocked";
import { type HeaderButton, type PhaseView, useGamePage } from "@/utils/game/game-page";

import CheckReveal from "./check-reveal/CheckReveal";
import DeadBanner from "./dead-banner/DeadBanner";
import EffectOverlay from "./effect-overlay/EffectOverlay";
import GameHeader from "./game-header/GameHeader";
import GameChat from "./game-chat/GameChat";
import GameOver from "./game-over/GameOver";
import GameTopBar from "./game-topbar/GameTopBar";
import PhaseTransition from "./phase-transition/PhaseTransition";
import RoleReveal from "./role-reveal/RoleReveal";
import TargetPicker from "./target-picker/TargetPicker";
import VotingEnd from "./voting-end/VotingEnd";
import "./game-page.scss";

export default function GamePage() {
  const { game, isNotFound, loadError, goHome, view } = useGamePage();

  if (!game && isNotFound) {
    return (
      <div className="game-page game-page-night">
        <div className="game-page-connecting" role="status">
          <p className="game-page-connecting-title">Игра не найдена</p>
          <p className="game-page-connecting-error">Возможно, её уже удалили или ссылка неверная.</p>
          <button type="button" className="btn btn-dark btn-small" onClick={goHome}>
            В меню
          </button>
        </div>
      </div>
    );
  }

  if (!game || !view) {
    return (
      <div className="game-page game-page-night">
        <div className="game-page-connecting" role="status">
          <span className="game-page-spinner" />
          <p className="game-page-connecting-title">Подключаемся к игре…</p>
          {loadError && <p className="game-page-connecting-error">Нет связи: {loadError}. Пробуем снова…</p>}
          <button type="button" className="btn btn-dark btn-small" onClick={goHome}>
            В меню
          </button>
        </div>
      </div>
    );
  }

  const { me, isGameOver, lastWord } = view;
  const chatPanel = <GameChat {...view.chat} />;

  return (
    <div className={`game-page game-page-${game.phase.toLowerCase()}`}>
      <div className="game-page-content">
        <GameTopBar {...view.topBar} />

        {isGameOver && game.winner ? (
          <>
            <GameOver winner={game.winner} players={game.players} rounds={game.round} myRole={me?.role ?? null} mafiaCount={game.mafiaCount} backLink={view.backLink} />
            {chatPanel}
          </>
        ) : (
          <>
            <GameHeader phase={game.phase} round={game.round} secondsLeft={view.secondsLeft} duration={view.phaseDuration} hint={view.skyHint} />

            {me && !me.isAlive && <DeadBanner />}

            {lastWord && (
              <p className={lastWord.isMine ? "game-page-last-word game-page-last-word-mine" : "game-page-last-word"} role="status">
                <b>🕯 Последнее слово · {lastWord.secondsLeft} сек</b>
                {lastWord.isMine
                  ? "Вы выбыли, но можете сказать последнее слово — напишите в чат, его увидят все."
                  : `${lastWord.name} говорит последнее слово. Смотрите чат.`}
              </p>
            )}

            <div className={view.isSoloGrid ? "game-page-grid game-page-grid-solo" : "game-page-grid"}>
              <main className="game-page-main">
                {view.hostLine && (
                  <p className="game-page-host" role="status">
                    <b>🎙 Ведущий</b>
                    {view.hostLine}
                  </p>
                )}
                {!me && view.todo.text && (
                  <p className={view.todo.isAction ? "game-page-todo game-page-todo-action" : "game-page-todo"} role="status">
                    {view.todo.text}
                  </p>
                )}
                <Phase phase={view.phase} onShowRole={view.openRole} onToggleRoles={view.toggleRoles} />
              </main>
              {view.showChatSide && <aside className="game-page-side">{chatPanel}</aside>}
            </div>
          </>
        )}
      </div>

      {view.roleReveal && <RoleReveal role={view.roleReveal} onClose={view.closeRole} />}
      <VotingEnd info={view.votingEnd} />
      <PhaseTransition info={view.transition} onDone={view.clearTransition} />
      <EffectOverlay effect={view.effect} onDone={view.clearEffect} />
      <CheckReveal info={view.checkReveal} onClose={view.closeCheckReveal} />
      {isGameOver && !view.isDemo && <AchievementUnlocked />}
    </div>
  );
}

function Phase({ phase, onShowRole, onToggleRoles }: { phase: PhaseView; onShowRole: () => void; onToggleRoles: () => void }) {
  return (
    <>
      {phase.nightTurns && (
        <ol className="game-page-turns" aria-label="Очередь ночных ходов">
          {phase.nightTurns.items.map((item) => (
            <li key={item.role} className={item.className}>
              {item.title}
              {item.isActive && <b>{phase.nightTurns?.seconds}</b>}
              {!item.isActive && item.isDone && <i>✓</i>}
            </li>
          ))}
          <li className={phase.nightTurns.allDone ? "game-page-turn game-page-turn-active" : "game-page-turn"}>Сон</li>
        </ol>
      )}
      <TargetPicker {...phase.picker} headerButton={<HeaderButtonView button={phase.headerButton} onShowRole={onShowRole} onToggleRoles={onToggleRoles} />} />
      {phase.checkResult && (
        <p className={`game-page-check game-page-check-${phase.checkResult.tone}`} role="status">
          <span>Ваша проверка</span>
          {phase.checkResult.text}
        </p>
      )}
    </>
  );
}

function HeaderButtonView({ button, onShowRole, onToggleRoles }: { button: HeaderButton; onShowRole: () => void; onToggleRoles: () => void }) {
  if (!button) return null;

  if (button.kind === "roles") {
    return (
      <button type="button" className="target-picker-button" aria-pressed={button.isShown} onClick={onToggleRoles}>
        <EyeIcon />
        {button.isShown ? "Скрыть роли" : "Смотреть роли"}
      </button>
    );
  }

  return (
    <button type="button" className="target-picker-button" onClick={onShowRole}>
      <EyeIcon />
      Моя роль
    </button>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" fill="currentColor" />
    </svg>
  );
}
