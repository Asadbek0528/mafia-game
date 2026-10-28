"use client";

import { voteWord } from "@/utils/format";
import type { VotingEndInfo } from "@/utils/game/types";

import { VoteIcon } from "../target-picker/TargetPicker";
import "./voting-end.scss";

export default function VotingEnd({ info }: { info: VotingEndInfo | null }) {
  if (!info) return null;

  if (info.kind === "countdown") {
    return (
      <div className="voting-end voting-end-countdown" role="status" aria-live="assertive">
        <p className="voting-end-label">Голосование заканчивается</p>
        <p key={info.seconds} className="voting-end-number">
          {info.seconds}
        </p>
      </div>
    );
  }

  if (info.kind === "counting") {
    return (
      <div className="voting-end" role="status" aria-live="assertive">
        <p className="voting-end-title">Голосование окончено</p>
        <p className="voting-end-text">Считаем голоса…</p>
      </div>
    );
  }

  if (info.kind === "tie") {
    return (
      <div key={info.key} className="voting-end" role="status" aria-live="assertive">
        <p className="voting-end-label">Голосование окончено</p>
        <p className="voting-end-title">Голоса разделились</p>
        <p className="voting-end-text">Никто не выбывает. Наступает ночь…</p>
      </div>
    );
  }

  return (
    <div key={info.key} className="voting-end voting-end-result" role="status" aria-live="assertive">
      <p className="voting-end-label">Голосование окончено</p>
      <p className="voting-end-title">{info.isMe ? "Город выгоняет вас" : `Город выгоняет ${info.name}`}</p>
      {info.votes !== null && (
        <p className="voting-end-votes">
          <VoteIcon /> {info.votes} {voteWord(info.votes)}
        </p>
      )}
      <p className="voting-end-text">{info.isMe ? "Теперь вы наблюдатель." : "Наступает ночь…"}</p>
    </div>
  );
}
