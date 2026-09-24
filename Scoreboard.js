export default class Scoreboard {
    constructor(p1Card,p2Card,player1ScoreOutput,player2ScoreOutput) {
        this.cards = [p1Card,p2Card];
        this.scores = [0,0];
        this.scoreOutput = [player1ScoreOutput,player2ScoreOutput];

    }
    switchActivePlayer(activePlayer) {
        activePlayer--;
        let inactivePlayer = 1 - activePlayer;
        this.cards[activePlayer].classList.add('active');
        this.cards[inactivePlayer].classList.remove('active');
    }
    point(player) {
        player--;
        this.scores[player]++;
        this.scoreOutput[player].textContent = this.scores[player];
    }
    reset() {
        this.scores = [0,0];
        this.scoreOutput[0].textContent = 0;
        this.scoreOutput[1].textContent = 0;
        this.switchActivePlayer(1);
    }
    whoWon() {
        if(this.scores[0] > this.scores[1]) {
            return 1;
        } else if(this.scores[1] > this.scores[0]) {
            return 2;
        } else {
            return 0;
        }
    }
}
