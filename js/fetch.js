
let ws = new WebSocket('ws://xo.t.javascript.ninja/games');
const games = document.querySelector('.games');
const content = document.querySelector('.content');
const playerA = document.querySelector('#playerA');
const closePopup = document.querySelector('.close');
const popup = document.querySelector('.popup');

const newGameURL = 'http://xo.t.javascript.ninja/newGame';
const gameReadyURL = 'http://xo.t.javascript.ninja/gameReady';
const moveURL = 'http:/xo.t.javascript.ninja/move';
const surrenderURL = 'http://xo.t.javascript.ninja/surrender';
const wsURL = 'ws://xo.t.javascript.ninja/games';

let chosenID;
let playerID;
let getID;
let playerSide;
let yourTurn = false;

ws.onclose = () => {
	console.log("closing WS");
	ws = new WebSocket(wsURL);
}

ws.onerror = (err) => {
  console.log("WS error ", err);
  modal(err);
}

ws.onmessage = (event) => {
  const res = JSON.parse(event.data);
  if (res.action === 'add') {
    const newGame = document.createElement('li');
    newGame.textContent = res.id;
    newGame.dataset.id = res.id;
    games.appendChild(newGame);
  } else if (res.action === 'remove') {
    const toRemove = res.id;
    const currentGames = games.querySelectorAll('li');

    Array.from(currentGames).forEach((x) => {
      if (x.dataset.id === toRemove) {
        games.removeChild(x);
      }
    });
  } else if (res.action === 'startGame') {
    const pendingMsg = genTextAlert('Ожидаем начала игры...');
    playerID = res.id;
    games.classList.add('hide');

    content.insertBefore(pendingMsg, games);
    pendingMsg.classList.add('pending');

    fetch(gameReadyURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player: playerID,
        game: chosenID,
      }),
    })
    .then((r) => {
      if (r.status !== 200) {
        throw new Error(r.status);
      }
      return r.json();
    })
    .then((data) => {
      playerA.disabled = false;
      playerA.textContent = 'Сдаться...';
      const resStart = data;
      playerSide = resStart.side;
      if (firstMove(playerSide)) {
        yourTurn = true;
      }
      start(pendingMsg, playerSide);
    })
    .catch((error) => {
      let failMsg = 'Неизвестная ошибка старта игры';
      if (error === 410) {
        failMsg = 'Ошибка старта игры: другой игрок не ответил';
      }
      modal(failMsg);
      console.log(error);
    });
  }
};

closePopup.addEventListener('click', () => {
  popup.classList.add('hide');
});

function buttonFunc(element) {
  const el = element;
  el.addEventListener('click', () => {
    if (el.textContent === 'Сдаться...') {
      const req = fetch(surrenderURL, {
        method: 'PUT',
        headers: {
          'Game-ID': chosenID,
          'Player-ID': playerID,
        }
      })
      .then(r => r.text())
      .then((data) => {
        el.textContent = 'Новая игра';
        games.classList.remove('hide');
      })
      .catch((error) => {
        console.log(error);
        let failMsg;
        if (error.hasOwnProperty('message')) {
          failMsg = error.message;
        } else {
          failMsg = 'Неизвестная ошибка';
        }
        modal(failMsg);
      });

    } else {
      const post = fetch(newGameURL, {
        method: 'POST',
      })
      .then(r => r.text())
      .then((data) => {
        clearGame();
        el.disabled = true;
        getID = JSON.parse(data);
        console.log("date on post ", getID.yourId);
        const regObj = JSON.stringify({ register: getID.yourId });
        console.log("ws state ", ws.readyState);
        ws.onopen = () => {
          ws.send(regObj);
        };
      })
      .catch((error) => {
        el.disabled = false;
        modal('Ошибка создания игры');
      });
    }
  });
}

buttonFunc(playerA);

function clearGame() {
  const gameEls = document.querySelectorAll('.gameon');
  Array.from(gameEls).forEach((x) => {
    content.removeChild(x);
  });
}

games.addEventListener('click', (ev) => {
	clearGame();
  const listElements = games.querySelectorAll('li');
  Array.from(listElements).forEach((x) => {
    if (ev.target === x) {
      chosenID = x.dataset.id;
      const regObj2 = JSON.stringify({ register: chosenID });
      ws.send(regObj2);
    }
  });
});

function generateBoard(size) {
  const table = document.createElement('table');
  let startIndex = 1;
  for (let i = 0; i < size; i++) {
    const tr = document.createElement('tr');
    for (let ii = 0; ii < size; ii++) {
      const td = document.createElement('td');
      tr.appendChild(td);
      td.dataset.index = startIndex;
      ++startIndex;
    }
    table.appendChild(tr);
  }
  return table;
}

function genTextAlert(msg) {
  const p = document.createElement('p');
  p.textContent = msg;
  return p;
}

function firstMove(side) {
  if (side === 'x') return true;
  return false;
}

function move(cell, player) {
  const cellIndex = `[data-index = '${cell}']`;
  const targetCell = content.querySelector(cellIndex);
  targetCell.textContent = player;
}

function cellResponse(table, side) {
  const cells = table.querySelectorAll('td');
  Array.from(cells).forEach((x) => {
    x.addEventListener('click', () => {
      console.log(`its your turn ${yourTurn}`);
      if (yourTurn) {
        moveReq(x.dataset.index, side, table);
      }
    });
  });
}

function gameOver() {
  playerA.textContent = 'Новая игра!';
  games.classList.remove('hide');
  const gameEls = content.querySelectorAll('.gameon');
  Array.from(gameEls).forEach((x) => {
    x.classList.add('gameover');
  });
}

function modal(copy) {
  popup.classList.remove('hide');
  popup.querySelector('p').textContent = copy;
}

function listenOnPOST(table, side) {
  const oppositeSide = side === 'o' ? 'x' : 'o';
  fetch(moveURL, {
    method: 'GET',
    headers: {
      'Game-ID': chosenID,
      'Player-ID': playerID,
      'Content-Type': 'application/json',
    },
  })
  .then(r => r.json())
  .then((data) => {
    console.log(data);
    const res = data;
    if (res.hasOwnProperty('win')) {
      modal(res.win);
      gameOver(res);
    }
    if (res.hasOwnProperty('move')) {
      move(res.move, oppositeSide.toUpperCase());
      yourTurn = true;
    }
  })
  .catch((err) => {
    console.log(err);
    modal(err);
  });
}

function start(pendingMsg, side) {
  const table = generateBoard(10);
  content.appendChild(table);
  table.classList += ('boardgame gameon');
  content.removeChild(pendingMsg);
  const sideReminder = genTextAlert(`Player: ${side.toUpperCase()}`);
  content.insertBefore(sideReminder, table);
  sideReminder.classList += ('right gameon');
  if (!yourTurn) {
    listenOnPOST(table, side);
    cellResponse(table, side);
  } else {
    cellResponse(table, side);
  }
}

function moveReq(cell, side, table) {
  fetch(moveURL, {
    method: 'POST',
    headers: {
      'Game-ID': chosenID,
      'Player-ID': playerID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ move: cell }),
  })
  .then((r) => r.json())
  .then((data) => {
    const res = data;
    const gameWon = res.hasOwnProperty('win');
    if (res.hasOwnProperty('message')) {
      modal(res.message);
      return;
    }
    if (gameWon) {
      modal(res.win);
      gameOver();
    }
    move(cell, side.toUpperCase());
    yourTurn = false;
    if (!gameWon) listenOnPOST(table, side);
  })
  .catch((error) => {
    modal(error);
    console.log('Move request failed: ', error);
    gameOver();
  });
}
