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
function getRandomUntriedMove(untried_moves) {
    return untried_moves[Math.floor(Math.random() * untried_moves.length)];
}
function cloneMatrix(matrix) {
    return matrix.map(row => [...row]);
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
    }
    async move(h,v,squaresLeft) {

        let node, move;
        let AIboxesClosed;
        let newNode, newH, newV;
        let moves, closed;

        let root = new Node(cloneMatrix(h),cloneMatrix(v),1);

        for(let i=0; i<this.iterations; i++) {
            node = root;

            // traverse by maximizing UCB1 until we reach leaf node
            while(node.children.length > 0) {
                node = node.selectChild();
            }

            // if this node has been visited add children and set node to first child
            if(node.visits > 0) {
                for(move of node.untried_moves) {
                    // add children
                    newH = cloneMatrix(node.h);
                    newV = cloneMatrix(node.v);
                    closed = makeMove(newH,newV,move);
                    newNode = new Node(newH,newV,node.turn,node,move);
                    if(node.turn == 1) {
                        newNode.aiSquares += closed;
                    }
                    if(closed == 0) {
                        newNode.turn = 1 - newNode.turn;
                    }
                    node.children.push(newNode);
                }
                if(node.children.length) {
                    node = node.children[0];
                }
            }

            // rollout node (simulation)
            AIboxesClosed = 0;
            let curH = cloneMatrix(node.h);
            let curV = cloneMatrix(node.v);
            let curTurn = node.turn;
            while((moves = legalMoves(curH,curV)) && moves.length > 0) {
                closed = makeMove(curH,curV,getRandomUntriedMove(moves));
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
        this.untried_moves = legalMoves(this.h,this.v);
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
            percentCurPlayerBoxes = 1 - percentCurPlayerBoxes;
        }
        const exploitation = percentCurPlayerBoxes / child.visits;

        const exploration = Math.sqrt(2 * Math.log(this.visits) / child.visits);
    
        return exploitation + exploration;
    }
}