export default class AIEngineHeuristic {
    constructor() {
        this.h = [];
        this.v = [];
        this.squares = [];
        this.x = undefined;
        this.y = undefined;
        this.twos = [];
        this.visited = [];
        this.smallestArea = [];
        this.curArea = [];
        this.touchedOnes = [];
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async move(h,v) {

        await this.sleep(100);

        const m = this.chooseMove(h,v);
        return m[0]+','+m[1]+','+m[2];
    }
    // Synchronous move choice, also used as the MCTS rollout policy.
    // Returns [type, i, j]. Deliberately not optimal: rollouts need a fast,
    // sensible, slightly random signal, and the tree search corrects the rest.
    chooseMove(h,v) {

        this.h = h;
        this.v = v;
        this.x = this.h.length;
        this.y = this.v.length;
        this.countSquares();
        let i, j;
        let moves = [];

        // complete any available squares
        for(i=0; i<this.y; i++) {
            for(j=0; j<this.x; j++) {
                if(this.squares[i][j] == 3) {
                    if(this.h[j][i] == 0) {
                        return ['h',j,i];
                    }
                    if(this.h[j][i+1] == 0) {
                        return ['h',j,i+1];
                    }
                    if(this.v[i][j] == 0) {
                        return ['v',i,j];
                    }
                    if(this.v[i][j+1] == 0) {
                        return ['v',i,j+1];
                    }
                }
            }
        }

        // choose spot that doesn't result in any closable squares
        for(i=0; i<this.y; i++) {
            for(j=0; j<this.x; j++) {
                // look in all <2 squares
                if(this.squares[i][j] < 2) {
                    // check top of each box is available
                    if(this.h[j][i] == 0) {
                        // if we're in top row or above us is <2, top can be taken
                        if(i==0 || this.squares[i-1][j] < 2) {
                            moves.push(['h',j,i]);
                        }
                    }
                    // if we're on bottom row, bottom can be taken
                    if(i==(this.y-1) && this.h[j][i+1] == 0) {
                        moves.push(['h',j,i+1]);
                    }
                    // check left of each box is available
                    if(this.v[i][j] == 0) {
                        // if we're in first column or left of us is <2, left can be taken
                        if(j==0 || this.squares[i][j-1] < 2) {
                            moves.push(['v',i,j]);
                        }
                    }
                    // if we're in last column, right can be taken
                    if(j==(this.x-1) && this.v[i][j+1] == 0) {
                        moves.push(['v',i,j+1]);
                    }
                }
            }
        }
        if(moves.length > 0) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // must give squares, so find smallest area to give
        let two;
        this.twos = [];
        // 1) make list of all 2s
        for(i=0; i<this.y; i++) {
            for(j=0; j<this.x; j++) {
                if(this.squares[i][j] == 2) {
                    this.twos.push(i+","+j);
                }
            }
        }
        // 2) remove one at a time to test
        this.smallestArea = [];
        this.visited = Array.from({ length: this.y }, () => Array(this.x).fill(0));
        while(two = this.twos[0]) {
            this.curArea = [];

            // 3) recursively merge adjoining 2s and remove from testing list
            this.touchedOnes = Array.from({ length: this.y }, () => Array(this.x).fill(0));
            this.addAdjacent(two);

            // 4) save set if it's smallest so far
            if(this.smallestArea.length == 0 || this.curArea.length < this.smallestArea.length) {
                // don't save if it touches a one more than once (because it would merge with another area)
                if(!this.touchedOnes.flat().includes(2)) {
                    this.smallestArea = this.curArea;
                }
            }
        }
        // pick random square from smallestArea and set moves to all available borders
        [i,j] = this.smallestArea[Math.floor(Math.random() * this.smallestArea.length)].split(',').map(num => parseInt(num));
        if(this.h[j][i] == 0) {
            moves.push(['h',j,i]);
        }
        if(this.h[j][i+1] == 0) {
            moves.push(['h',j,i+1]);
        }
        if(this.v[i][j] == 0) {
            moves.push(['v',i,j]);
        }
        if(this.v[i][j+1] == 0) {
            moves.push(['v',i,j+1]);
        }

        // choose random move
        return moves[Math.floor(Math.random() * moves.length)];
    }
    addAdjacent(two) {
        let i,j;
        [i,j] = two.split(',').map(num => parseInt(num));

        if(this.visited[i][j]) {
            return;
        }
        this.visited[i][j] = 1;
        this.twos.splice(this.twos.indexOf(two),1);
        this.curArea.push(i+","+j);

        // as we merge 2s, count touched ones, and if we touch any 1 twice, this isn't smallest area (because it would merge with another)
        if(i>0 && this.h[j][i] == 0 && this.squares[i-1][j] == 1) {
            this.touchedOnes[i-1][j]++;
        }
        if(i<(this.y-1) && this.h[j][i+1] == 0 && this.squares[i+1][j] == 1) {
            this.touchedOnes[i+1][j]++;
        }
        if(j>0 && this.v[i][j] == 0 && this.squares[i][j-1] == 1) {
            this.touchedOnes[i][j-1]++;
        }
        if(j<(this.x-1) && this.v[i][j+1] == 0 && this.squares[i][j+1] == 1) {
            this.touchedOnes[i][j+1]++;
        }

        if(i>0 && this.h[j][i] == 0 && this.squares[i-1][j] == 2) {
            this.addAdjacent((i-1)+","+j);
        }
        if(i<(this.y-1) && this.h[j][i+1] == 0 && this.squares[i+1][j] == 2) {
            this.addAdjacent((i+1)+","+j);
        }
        if(j>0 && this.v[i][j] == 0 && this.squares[i][j-1] == 2) {
            this.addAdjacent(i+","+(j-1));
        }
        if(j<(this.x-1) && this.v[i][j+1] == 0 && this.squares[i][j+1] == 2) {
            this.addAdjacent(i+","+(j+1));
        }

    }
    countSquares() {
        this.squares = [];
        for(let i=0; i<this.v.length; i++) {
            this.squares[i] = [];
            for(let j=0; j<this.h.length; j++) {
                this.squares[i][j] = (this.h[j][i] != 0) + (this.h[j][i+1] != 0) + (this.v[i][j] != 0) + (this.v[i][j+1] != 0);
            }
        }
    }
}
