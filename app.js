import DotGame from './DotGame.js';
import Player from './Player.js';
import Scoreboard from './Scoreboard.js';

function init() {
    const canvas = document.getElementById('board');
    const parentContainer = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const heightRange = document.getElementById('heightRange');
    const widthRange = document.getElementById('widthRange');
    const heightValue = document.getElementById('heightValue');
    const widthValue = document.getElementById('widthValue');
    const newGameButton = document.getElementById('newGameButton');
    let dotGame;
    let scoreboard = new Scoreboard(document.getElementById('p1Card'),
                                    document.getElementById('p2Card'),
                                    document.getElementById('player1Score'),
                                    document.getElementById('player2Score'));
    heightRange.addEventListener('input', (e) => {
        heightValue.textContent = e.target.value;
    });
    widthRange.addEventListener('input', (e) => {
        widthValue.textContent = e.target.value;
    });
    newGameButton.addEventListener('click', () => {
        const player1Type = document.getElementById('player1Type');
        const player2Type = document.getElementById('player2Type');
        const height = parseInt(heightRange.value);
        const width = parseInt(widthRange.value);
        const player1 = new Player('1','#BF616A','#E5B3B8',player1Type.options[player1Type.selectedIndex].value);
        const player2 = new Player('2','#5E81AC','#88C0D0',player2Type.options[player2Type.selectedIndex].value);
        dotGame = new DotGame(height,width,player1,player2,ctx,scoreboard);
        scoreboard.reset();
        dotGame.render();
    });
    function handleResize() {
        canvas.width = parentContainer.clientWidth;
        canvas.height= parentContainer.clientHeight;
        render();
    }
    function render() {
        if(dotGame) {
            dotGame.render();
        }
    }
    window.addEventListener('resize', handleResize)
    handleResize();
}

init();