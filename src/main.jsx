import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Crown, Shield, Skull, Users, Moon, Sun, Vote,
  Crosshair, ChevronRight, LogIn
} from "lucide-react";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const demoUser = {
  id: String(tg?.initDataUnsafe?.user?.id || "1001"),
  name: tg?.initDataUnsafe?.user?.first_name || "Ashot"
};

const socket = io(API);

function App() {
  const [room, setRoom] = useState(
    new URLSearchParams(location.search).get("room") || "DEMO01"
  );

  const [game, setGame] = useState({
    phase: "lobby",
    day: 0,
    me: {
      id: demoUser.id,
      name: demoUser.name,
      alive: true,
      role: null,
      roleLabel: null
    },
    players: [
      { id: "1", name: "Արամ", alive: true },
      { id: "2", name: "Վարդան", alive: true },
      { id: "3", name: "Տաթև", alive: true },
      { id: "4", name: "Արմեն", alive: true },
      { id: "5", name: "Անի", alive: true }
    ]
  });

  const [notice, setNotice] = useState("");

  useEffect(() => {
    socket.on("game:update", setGame);
    socket.on("error:message", setNotice);
    socket.on("private:result", e => setNotice(e.text));

    socket.emit("room:join", {
      room,
      user: demoUser
    });

    return () => {
      socket.off("game:update", setGame);
      socket.off("error:message", setNotice);
      socket.off("private:result");
    };
  }, [room]);

  const phaseTitle = {
    lobby: "Սպասում ենք խաղացողներին",
    night: `Գիշեր ${game.day}`,
    day: `Օր ${game.day}`,
    voting: "Քվեարկություն",
    finished: "Խաղն ավարտվեց"
  }[game.phase];

  const roleColor = game.me?.role === "don" || game.me?.role === "mafia"
    ? "black"
    : "red";

  function action(targetId, type) {
    socket.emit("night:action", {
      room,
      userId: demoUser.id,
      action: type,
      targetId
    });
  }

  function vote(targetId) {
    socket.emit("vote:cast", {
      room,
      userId: demoUser.id,
      targetId
    });
  }

  function start() {
    socket.emit("game:start", {
      room,
      userId: demoUser.id
    });
  }

  function startVote() {
    socket.emit("vote:start", { room });
  }

  const targets = game.players.filter(
    p => p.alive && p.id !== game.me?.id
  );

  const roleIcon = game.me?.role === "sheriff"
    ? <Shield size={28}/>
    : game.me?.role === "don"
      ? <Crown size={28}/>
      : game.me?.role === "mafia"
        ? <Skull size={28}/>
        : <Users size={28}/>;

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">MAFIA</div>
          <div className="subtitle">ԿԱՐՄԻՐՆԵՐ VS ՍԵՎԵՐ</div>
        </div>
        <div className="room">#{room}</div>
      </header>

      <main>
        <section className="hero">
          <div className={`phase-icon ${roleColor}`}>
            {game.phase === "night" ? <Moon/> :
             game.phase === "day" ? <Sun/> :
             game.phase === "voting" ? <Vote/> :
             roleIcon}
          </div>
          <div>
            <div className="eyebrow">{game.phase.toUpperCase()}</div>
            <h1>{phaseTitle}</h1>
          </div>
        </section>

        <section className={`role-card ${roleColor}`}>
          <div className="role-icon">{roleIcon}</div>
          <div className="role-copy">
            <span>ՔՈ ԳԱՂՏՆԻ ԴԵՐԸ</span>
            <strong>{game.me?.roleLabel || "Դեռ չի որոշվել"}</strong>
          </div>
          <div className="lock">PRIVATE</div>
        </section>

        {notice && (
          <div className="notice">
            {notice}
          </div>
        )}

        {game.phase === "lobby" && (
          <section className="panel">
            <div className="panel-head">
              <span>Խաղացողներ</span>
              <b>{game.players.length}</b>
            </div>

            <div className="players">
              {game.players.map((p, i) => (
                <div className="player" key={p.id}>
                  <div className="avatar">{p.name[0]}</div>
                  <div className="player-name">{p.name}</div>
                  <span className="online">●</span>
                </div>
              ))}
            </div>

            <button className="primary" onClick={start}>
              <LogIn size={18}/>
              ՍԿՍԵԼ ԽԱՂԸ
            </button>
          </section>
        )}

        {game.phase === "night" && (
          <section className="panel">
            <div className="panel-head">
              <span>Գիշերային գործողություն</span>
              <Moon size={18}/>
            </div>

            {game.me?.role === "sheriff" && (
              <>
                <p className="hint">Ընտրիր մեկ խաղացող՝ ստուգելու համար։</p>
                {targets.map(p => (
                  <button className="target" key={p.id}
                    onClick={() => action(p.id, "check")}>
                    <div className="avatar small">{p.name[0]}</div>
                    <span>{p.name}</span>
                    <ChevronRight/>
                  </button>
                ))}
              </>
            )}

            {(game.me?.role === "don" || game.me?.role === "mafia") && (
              <>
                <p className="hint">Ընտրիր Սևերի թիրախը։</p>
                {targets.map(p => (
                  <button className="target danger" key={p.id}
                    onClick={() => action(p.id, "kill")}>
                    <div className="avatar small">{p.name[0]}</div>
                    <span>{p.name}</span>
                    <Crosshair/>
                  </button>
                ))}
              </>
            )}

            {game.me?.role === "civilian" && (
              <div className="waiting">
                <Moon size={38}/>
                <strong>Գիշեր է</strong>
                <span>Սպասիր մյուս խաղացողների գործողություններին։</span>
              </div>
            )}
          </section>
        )}

        {game.phase === "day" && (
          <section className="panel">
            <div className="day-card">
              <Sun size={30}/>
              <strong>Քննարկման ժամանակ</strong>
              <p>Խոսեք խմբում և փորձեք բացահայտել Սևերին։</p>
            </div>
            <button className="primary" onClick={startVote}>
              <Vote size={18}/>
              ՍԿՍԵԼ ՔՎԵԱՐԿՈՒԹՅՈՒՆԸ
            </button>
          </section>
        )}

        {game.phase === "voting" && (
          <section className="panel">
            <div className="panel-head">
              <span>Ո՞ւմ եք կասկածում</span>
              <Vote size={18}/>
            </div>

            {targets.map(p => (
              <button className="target vote" key={p.id}
                onClick={() => vote(p.id)}>
                <div className="avatar small">{p.name[0]}</div>
                <span>{p.name}</span>
                <ChevronRight/>
              </button>
            ))}
          </section>
        )}

        {game.phase === "finished" && (
          <section className="panel finished">
            <Crown size={44}/>
            <h2>Խաղն ավարտվեց</h2>
            <p>Բոլոր դերերը կարելի է բացել խաղի ավարտից հետո։</p>
          </section>
        )}

        <section className="players-summary">
          <div className="summary-title">
            <Users size={17}/> ԽԱՂԱՑՈՂՆԵՐ
          </div>

          {game.players.map(p => (
            <div className={`summary-player ${!p.alive ? "dead" : ""}`} key={p.id}>
              <span>{p.name}</span>
              {!p.alive ? <Skull size={15}/> : <span className="alive-dot"/>}
              {game.phase === "finished" && p.roleLabel && (
                <small>{p.roleLabel}</small>
              )}
            </div>
          ))}
        </section>
      </main>

      <footer>
        <span>MAFIA</span>
        <span>Room #{room}</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
