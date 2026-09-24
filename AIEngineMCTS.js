import AIEngineHeuristic from './AIEngineHeuristic.js';

function legalMoves(h,v) {
    const moves = [];
    for(let i=0; i<h.length; i++) {
        for(let j=0; j<h[i].length; j++) {
            if(h[i][j] == 0) {
                moves.push(['h',i,j]);
            }
        }
    }
    for(let i=0; i<v.length; i++) {
        for(let j=0; j<v[i].length; j++) {
            if(v[i][j] == 0) {
                moves.push(['v',i,j]);
            }
        }
    }
    return moves;
}
function cloneMatrix(matrix) {
    return matrix.map(row => [...row]);
}
// Moves that close at least one box (the missing edge of every 3-sided box).
// When takes exist, any optimal player takes instead of playing elsewhere:
// refusing a take just hands the box (and the extra turn) to the opponent.
function takeMoves(h,v) {
    const takes = [];
    const height = v.length, width = h.length;
    for(let y=0; y<height; y++) {
        for(let x=0; x<width; x++) {
            const top = h[x][y] > 0, bottom = h[x][y+1] > 0;
            const left = v[y][x] > 0, right = v[y][x+1] > 0;
            if(top + bottom + left + right == 3) {
                if(!top) takes.push(['h',x,y]);
                else if(!bottom) takes.push(['h',x,y+1]);
                else if(!left) takes.push(['v',y,x]);
                else takes.push(['v',y,x+1]);
            }
        }
    }
    // two adjacent 3-sided boxes can share the same missing edge
    return takes.filter((m,i) => takes.findIndex(n => n[0]==m[0]&&n[1]==m[1]&&n[2]==m[2]) == i);
}
function makeMove(h, v, move) {
    const [type, i, j] = move;
    let x,y;
    let closed = 0;
    if(type == 'h') {
        h[i][j] = 1;
        y = [j-1,j];
        x = [i,i];
    } else if(type == 'v') {
        v[i][j] = 1;
        y = [i,i];
        x = [j-1,j]
    }
    for(let i=0; i<2; i++) {
        if(checkClosed(y[i],x[i],h,v)) {
            closed++;
        }
    }
    return closed;
}
function checkClosed(y,x,h,v) {
    if(y<0 || x<0 || y >= v.length || x >= h.length) {
        return false;
    }
    let s = 0;
    s += (h[x][y] > 0);
    s += (h[x][y+1] > 0);
    s += (v[y][x] > 0);
    s += (v[y][x+1] > 0);
    if(s == 4) {
        return true;
    } else {
        return false;
    }
}

export default class AIEngineMCTS { 
    constructor(iterations) {
        this.iterations = iterations;
        this.rolloutPolicy = new AIEngineHeuristic();
    }
    async move(h,v,squaresLeft) {

        let node, move;
        let AIboxesClosed;
        let newNode, newH, newV;
        let moves, closed;

        let root = new Node(cloneMatrix(h),cloneMatrix(v),1);

        for(let i=0; i<this.iterations; i++) {
            node = root;

            // Selection: descend while the node is fully expanded. A node that
            // still has untried moves stops here so it can be expanded;
            // otherwise the tree would grow as a single chain and the other
            // moves would never be tried.
            while(node.children.length > 0 && node.untried_moves.length == 0) {
                node = node.selectChild();
            }

            // if this node has been visited, expand a single child for one
            // untried move and simulate from it
            if(node.visits > 0 && node.untried_moves.length > 0) {
                const pick = node.untried_moves.splice(
                    Math.floor(Math.random() * node.untried_moves.length), 1)[0];
                newH = cloneMatrix(node.h);
                newV = cloneMatrix(node.v);
                closed = makeMove(newH,newV,pick);
                newNode = new Node(newH,newV,node.turn,node,pick);
                if(node.turn == 1) {
                    newNode.aiSquares += closed;
                }
                if(closed == 0) {
                    newNode.turn = 1 - newNode.turn;
                }
                node.children.push(newNode);
                node = newNode;
            }

            // rollout node (simulation)
            AIboxesClosed = 0;
            let curH = cloneMatrix(node.h);
            let curV = cloneMatrix(node.v);
            let curTurn = node.turn;
            while((moves = legalMoves(curH,curV)) && moves.length > 0) {
                closed = makeMove(curH,curV,this.rolloutPolicy.chooseMove(curH,curV));
                if(curTurn == 1) {
                    AIboxesClosed += closed;
                }
                if(closed == 0) {
                    curTurn = 1 - curTurn;
                }
            }

            // backpropegate visit and AIboxesClosed
            const reward = (node.aiSquares + AIboxesClosed) / squaresLeft;
            do {
                node.visits++;
                node.percentAIBoxes += reward;
                node = node.parent;
            } while(node);
        }

        move = root.children.reduce((best, child) =>
            child.visits > best.visits ? child : best
        ).move;
        return move[0]+','+move[1]+','+move[2];
    }
}

export class Node {
    constructor(h,v,turn,parent,move) {
        this.h = h;
        this.v = v;
        this.turn = turn; // 1 = AI, 0 = opponent
        this.parent = parent;
        this.move = move;

        if(this.parent) {
            this.aiSquares = this.parent.aiSquares;
        } else {
            this.aiSquares = 0;
        }

        this.children = [];
        this.visits = 0;
        this.percentAIBoxes = 0; // % of remaining boxes AI wins
        // Forced takes: below the root, when a box can be taken the tree only
        // considers taking it. Exploring non-takes there just lets UCT try
        // blunders that the greedy rollout punishes with 0.00/1.00 extremes,
        // drowning the real signal. The root keeps all moves so it can still
        // find "don't take" sacrifices like the winning v,1,2.
        const takes = this.parent ? takeMoves(this.h,this.v) : [];
        this.untried_moves = takes.length > 0 ? takes : legalMoves(this.h,this.v);
    }
    selectChild() {
        let bestChild = null;
        let highestValue = -Infinity;
        for (const child of this.children) {
            const uctValue = this.calculateUCT(child);
    
            if (uctValue > highestValue) {
                highestValue = uctValue;
                bestChild = child;
            }
        }
        return bestChild;
    }
    calculateUCT(child) {
        // If a node hasn't been visited yet, prioritize exploring it immediately
        if (child.visits === 0) return Infinity; 
    
        let percentCurPlayerBoxes = child.percentAIBoxes;
        if(this.turn == 0) {
            percentCurPlayerBoxes = child.visits - percentCurPlayerBoxes;
        }
        const exploitation = percentCurPlayerBoxes / child.visits;

        const exploration = Math.sqrt(2 * Math.log(this.visits) / child.visits);
    
        return exploitation + exploration;
    }
}