
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

let chosenID;
let playerID;
let getID;
let playerSide;
let yourTurn = false;

ws.onclose = () => {
	console.log("closing ws");
	ws = new WebSocket('ws://xo.t.javascript.ninja/games');
}

ws.onmessage = (event) => {
  const res = JSON.parse(event.data);
  console.log("ws state ", ws.readyState)

  if (res.hasOwnProperty('error')) {
    console.log(res.error);
  } else if (res.action === 'add') {
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


    const gameReq = new XMLHttpRequest();
    const reqBody = {
      player: playerID,
      game: chosenID,
    };

    playerA.disabled = false;
    playerA.textContent = 'Сдаться...';

    const formatReq = JSON.stringify(reqBody);
    console.log('posted on startGame ', formatReq);
    gameReq.open('POST', gameReadyURL);
    gameReq.setRequestHeader('Content-Type', 'application/json');
    gameReq.send(formatReq);

    gameReq.onreadystatechange = () => {
      if (gameReq.readyState === gameReq.DONE) {
        const parseReq = JSON.parse(gameReq.response);
        playerSide = parseReq.side;

        if (firstMove(playerSide)) {
          yourTurn = true;
        }
        start(pendingMsg, playerSide);
      }
    };
  }
};

closePopup.addEventListener('click', () => {
  popup.classList.add('hide');
});

function buttonFunc(element) {
  const el = element;
  el.addEventListener('click', () => {
    if (el.textContent === 'Сдаться...') {
      const xhr = new XMLHttpRequest();
      try {
        xhr.open('PUT', surrenderURL);
        xhr.setRequestHeader('Game-ID', chosenID);
        xhr.setRequestHeader('Player-ID', playerID);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();

        xhr.onreadystatechange = () => {
          if (xhr.readyState === xhr.DONE) {
            if (xhr.status === 200) {
              el.textContent = 'Новая игра!';
              games.classList.remove('hide');
            }
          }
        };
      } catch (error) {
        if (error.hasOwnProperty('message')) {
          console.log(error);
        } else {
          console.log('Неизвестная ошибка');
        }
      }
    } else {
    	clearGame();
      try {
        el.disabled = true;
        const post = new XMLHttpRequest();
        post.open('POST', newGameURL);
        post.send();
        post.onreadystatechange = () => {
          if (post.readyState === post.DONE) {
            getID = post.response;
            ws.onopen = () => {
              const regObj = JSON.stringify({ register: getID });
              ws.send(regObj);
            };
          }
        };
      } catch (error) {
        console.log('Error at "create game" stage ', error);
        el.disabled = false;
        const errorMsg = genTextAlert('Ошибка создания игры');
        content.appendChild(errorMsg);
      }
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
}

function modal(copy) {
	popup.classList.remove('hide');
  popup.querySelector('p').textContent = copy;
}

function listenOnPOST(table, side) {
  const oppositeSide = side === 'o' ? 'x' : 'o';

  try {
  	const xhr = new XMLHttpRequest();
	  xhr.open('GET', moveURL);
	  xhr.setRequestHeader('Game-ID', chosenID);
	  xhr.setRequestHeader('Player-ID', playerID);
	  xhr.setRequestHeader('Content-Type', 'application/json');

	  xhr.send();


	  xhr.onreadystatechange = () => {
	    if (xhr.readyState === xhr.DONE) {
	      const res = JSON.parse(xhr.response);
	      if (xhr.status === 200) {
	        if (res.hasOwnProperty('win')) {
	        	modal(res.win);
	          gameOver(res);
	        } else if (res.hasOwnProperty('move')) {
	          console.log(`listening on ${res}`);
	          move(res.move, oppositeSide.toUpperCase());
	          yourTurn = true;
	        }
	      } else {
	        console.log(`Move request failed: ${res.message}`);
	      }
	    }
	  };

  } catch (error) {
  	console.log("at get ", error)
  }
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
  const xhr = new XMLHttpRequest();
  xhr.open('POST', moveURL);
  xhr.setRequestHeader('Game-ID', chosenID);
  xhr.setRequestHeader('Player-ID', playerID);
  xhr.setRequestHeader('Content-Type', 'application/json');
  const obj = JSON.stringify({ move: cell });
  xhr.send(obj);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === xhr.DONE) {
      const res = JSON.parse(xhr.response);
      if (xhr.status === 200) {
        if (res.hasOwnProperty('win')) {
        	modal(res.win);
          gameOver();
        } else {
          move(cell, side.toUpperCase());
          yourTurn = false;
          listenOnPOST(table, side);
        }
      } else {
        let failMsg;
        if (res.hasOwnProperty('win')) {
          failMsg = res.win;
        } else if (res.hasOwnProperty('message')) {
          failMsg = res.message;
        } else {
      	  failMsg = 'Неизвестная ошибка';
        }
        modal(failMsg);
        console.log(`Move request failed: ${failMsg}`);
        gameOver();
      }
    }
  };
}
