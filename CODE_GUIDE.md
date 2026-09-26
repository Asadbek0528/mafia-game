# Mafia — как устроен frontend

## Установка

1. Скопировать в проект папки `src/`, `public/img/` и файл `next.config.ts` (заменить).
2. Установить Sass:
   ```
   npm install sass
   ```
3. Удалить файлы, которые создал `create-next-app` (они мешают):
   - `src/app/page.tsx` — главная теперь в `src/app/(home)/page.tsx`
   - `src/app/page.module.css`
   - `src/app/globals.css` — теперь `globals.scss`
   - `src/app/layout.c.tsx` — лишний файл
4. Запустить: `npm run dev` → открыть http://localhost:3000/register

## Структура

```
src/
├── app/                        ← ТОЛЬКО адреса (роуты). Внутри почти нет кода
│   ├── layout.tsx              ← общий для всех страниц: шрифты, Header, Toast
│   ├── globals.scss            ← цвета, кнопки .btn, поля .input, панели .panel
│   ├── (home)/page.tsx         ← адрес /
│   ├── register/page.tsx       ← адрес /register
│   ├── profile/page.tsx        ← адрес /profile
│   ├── roles/page.tsx          ← адрес /roles
│   └── room/[id]/page.tsx      ← адрес /room/83491
│
├── components/
│   ├── layout/                 ← части, общие для сайта
│   │   ├── header/  Header.tsx + header.scss   (боковое меню)
│   │   └── footer/  Footer.tsx + footer.scss
│   │
│   └── pages/                  ← у каждой страницы своя папка
│       ├── home/
│       │   ├── HomePage.tsx + home-page.scss
│       │   ├── hero/               Hero.tsx + hero.scss
│       │   ├── rooms-table/        RoomsTable.tsx + rooms-table.scss
│       │   ├── online-players/     OnlinePlayers.tsx + online-players.scss
│       │   └── create-room-modal/  CreateRoomModal.tsx + create-room-modal.scss
│       ├── register/
│       │   ├── RegisterPage.tsx + register-page.scss
│       │   ├── blood-background/   BloodBackground.tsx (кровь, «БЕГИ»)
│       │   └── register-form/      RegisterForm.tsx (поля и кнопки)
│       ├── room/
│       │   ├── RoomPage.tsx + room-page.scss   ← вся логика комнаты здесь
│       │   ├── room-header/  players-list/  room-settings/  invite-box/
│       ├── game/                   ← САМА ИГРА (адрес /game/12)
│       │   ├── GamePage.tsx + game-page.scss   ← вся логика игры здесь
│       │   ├── role-reveal/    RoleReveal.tsx (карточка крутится и показывает роль)
│       │   ├── game-header/    GameHeader.tsx (Ночь 1, таймер, моя роль)
│       │   ├── target-picker/  TargetPicker.tsx (выбор игрока: ночью и на голосовании)
│       │   ├── game-log/       GameLog.tsx (события: «ночью убит ...»)
│       │   ├── dead-banner/    DeadBanner.tsx («Вы погибли»)
│       │   └── game-over/      GameOver.tsx (победа мафии / жителей)
│       ├── profile/  ProfilePage.tsx
│       ├── roles/    RolesPage.tsx
│       └── widgets/            ← маленькие детали, нужные на разных страницах
│           ├── avatar/  toast/  role-cards/  profile-card/  game-history/
│
└── lib/                        ← логика без дизайна
    ├── api.ts      ← ВСЕ запросы к backend (пути в ENDPOINTS)
    ├── auth.ts     ← кто вошёл: аккаунт или гость (localStorage)
    ├── roles.ts    ← роли, время фаз, проверка раскладки ролей
    ├── demo.ts     ← демо-данные, пока backend не готов (потом удалить)
    └── demo-game.ts← игра с ботами без сервера (адрес /game/demo-...)
```

## Правила, по которым написан код

**1 компонент = 1 папка = 2 файла.** `Hero.tsx` и `hero.scss` лежат рядом, стиль подключается внутри компонента: `import "./hero.scss";`

**Имена классов — полные, без `&__`.** Класс начинается с имени компонента, чтобы не было конфликтов:
```scss
.hero { ... }            // сам блок
.hero-title { ... }      // заголовок внутри hero
.hero-buttons { ... }    // кнопки внутри hero
```
Внутри scss используем `&` только для состояний: `&:hover`, `&:disabled`, `&::before`.
Адаптив (`@media`) всегда в конце файла под комментарием `Адаптив`.

**Цвета — только через переменные** из `globals.scss`: `var(--color-red)`, `var(--color-line)`. Хотите поменять красный на всём сайте — меняете одну строку.

**Общие классы** (из `globals.scss`), их можно ставить на любой элемент:

| Класс | Что это |
|---|---|
| `btn btn-red` | красная кнопка |
| `btn btn-dark` | тёмная кнопка |
| `btn btn-green` | зелёная кнопка («Готов») |
| `btn-small`, `btn-full` | маленькая / на всю ширину |
| `input` | поле ввода |
| `panel`, `panel-top`, `panel-title` | тёмный блок с рамкой и заголовком |
| `status-dot`, `status-dot-yellow`, `status-dot-red` | точка статуса |

**Размеры экрана:** телефон до 860px (меню снизу), планшет до 1280px, дальше ноутбук.

## API

- Фронт ходит на `/backend/...`, Next.js пересылает на `http://13.211.79.228/...` (см. `next.config.ts`).
- Все пути — в `src/lib/api.ts` → `ENDPOINTS`.
- Backend отдаёт данные по-своему (`room_name`, `owner_id`). В `api.ts` они переводятся в вид для страниц (`name`, `owner`). Страницы про формат backend ничего не знают.
- Если backend не отвечает совсем (нет сети или ошибка 5xx) — показываются демо-данные. Если backend ответил ошибкой (комнаты нет, она полная) — показываем ошибку.

| Что на сайте | Какой endpoint |
|---|---|
| Регистрация / вход | `POST /auth/register`, `POST /auth/login` |
| Вход через Google | `GET /auth/google/login` → Google → страница `/auth/google/callback` → `GET /auth/google/callback?code=` |
| Обновить токен | `POST /auth/access_generate` (само, при ошибке 401) |
| Профиль | `GET /user/detail`, `GET /statistic/{id}` |
| Имена игроков | `GET /user/list` (один раз), потом `GET /user/detail` для новых |
| Список комнат | `GET /room/list` + `GET /room-player/list` (считаем игроков) |
| Создать комнату | `POST /room/create` (с ролями и временем) + `POST /room-player/create` |
| Зайти / выйти | `POST /room-player/create` / `DELETE /room-player/delete/{id}` |
| Настройки комнаты | `PUT /room/update/{id}` (роли и время хранятся на сервере) |
| Начать игру | `POST /game/create` |
| Игра | `GET /game/detail` (с `phase_ends_at` — таймер), `/game-player/list`, `/game-round/list`, `/game-round/detail` |
| Ночью | `POST /night-action/create` (KILL / HEAL / CHECK; для CHECK сервер возвращает `is_mafia`) |
| Голосование | `POST /vote/create` |
| Смена фаз | `POST /game/end-night`, `/start-voting`, `/end-voting` (вызывает браузер создателя, когда наступил `phase_ends_at`) |

**Google:** в настройках backend адрес возврата (redirect_uri) должен быть страницей фронта: `http://localhost:3000/auth/google/callback`.

## WebSocket (живые обновления)

У backend пока нет WebSocket, поэтому рядом с фронтом работает свой маленький сервер `scripts/ws-server.mjs` (порт 3001).
`npm run dev` запускает его вместе с Next.js.

Как работает: игрок что-то сделал (зашёл, сохранил настройки, начал игру, проголосовал, сменил фазу) → браузер шлёт в канал комнаты/игры сигнал → остальные сразу заново загружают данные через API.
Если WebSocket недоступен — страница опрашивает сервер каждые 2–3 секунды.

`.env.local`: `NEXT_PUBLIC_WS_URL=auto` — свой сервер на том же адресе, что и сайт (работает и с телефона).
Когда backend сделает свой WebSocket — впишите `ws://адрес`.

## Закрытие комнаты

- Создатель нажимает «назад» → окно «Закрыть комнату?». Если ничего не нажать 20 секунд — комната удаляется сама.
- Если создатель ушёл со страницы комнаты (на главное меню, закрыл вкладку) и не вернулся за 1 минуту — WebSocket-сервер удаляет комнату (`ROOM_OWNER_LEFT_SECONDS` в `.env.local`). Если страница открыта, но телефон «уснул» и не отвечает 3 минуты — тоже удаляет (`ROOM_OWNER_SILENT_SECONDS`). Только пока игра не началась.
- Удаление: сначала удаляются игроки комнаты, потом `DELETE /room/delete/{id}`. Если backend не дал удалить — комната помечается `FINISHED`.
- Остальные игроки получают сигнал `room-closed` и возвращаются в меню. Пустые комнаты (0 игроков) не показываются в списке.

## Брошенные игры

Раз в минуту WebSocket-сервер смотрит идущие игры. Если к игре 5 минут никто не подключён через сайт И 5 минут нет ни одного ночного действия и голоса — игра удаляется, комната закрывается (`GAME_ABANDONED_MINUTES` в `.env.local`).
Оба условия нужны, чтобы не удалить игру, которую backend-команда проверяет через Swagger.

## Если создатель пропал во время игры

Фазу переключает создатель. Если он не сделал этого за 8 секунд после конца таймера — переключает другой игрок (по очереди, с шагом 4 секунды), перед этим проверив на сервере, что фаза ещё не сменилась.

## Профиль, ID игрока и друзья

- `/profile` — карточка (ID, карандаш → `/profile/edit`), друзья, статистика, история.
- `/profile/edit` — редактирование профиля (отдельная страница).
- `/player/<ID>` — чужой профиль: статистика, история, «Добавить в друзья».
- ID игрока (8 цифр) — `src/lib/player-id.ts`: обратимо перемешанный id пользователя из базы. В базе ничего хранить не нужно.
- Друзья — `src/lib/friends.ts`. У backend нет API друзей, поэтому список хранится на устройстве (localStorage). Когда backend добавит — заменить функции в этом файле.
- Статистика и история считаются по законченным играм (`api.getUserStats`), потому что `/statistic/{id}` у backend пока всегда 0.

## Проверка с телефона

1. Телефон и компьютер в одной Wi‑Fi сети.
2. `npm run dev`, на телефоне открыть адрес из строки `Network:` (например `http://192.168.0.32:3000`).
3. Если Windows спросит про доступ Node.js к сети — разрешить (частные сети).

## Боты

`npm run bots -- <номер комнаты> [сколько]` — боты `bot1`, `bot2`… (пароль `botpass123`) входят или регистрируются, заходят в комнату и сами ходят ночью и голосуют.
Фазы переключает браузер создателя комнаты — его вкладку не закрывать.

## Как проверить игру без backend

Создайте комнату (если сервер не отвечает, откроется демо) → «Начать игру» → откроется `/game/demo-...` с ботами.
Или сразу откройте `http://localhost:3000/game/demo-1`.

## Анимация роли

Файл `components/pages/game/role-reveal/role-reveal.scss`, в начале файла описано:
- скорость — `animation: role-reveal-spin 2.8s`
- количество оборотов — `rotateY(1260deg)` в `@keyframes`. Формула: 360 × N + 180.

Как показать сообщение пользователю из любого компонента:
```tsx
import { showToast } from "@/components/pages/widgets/toast/Toast";
showToast("Ссылка скопирована", "success"); // "info" | "success" | "error"
```
