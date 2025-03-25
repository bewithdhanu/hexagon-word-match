class WordSearchGame {
    constructor(words, gridSize = 8) {
        this.words = words.map(word => word.toUpperCase());
        this.gridSize = gridSize;
        this.grid = [];
        this.selectedCells = [];
        this.isDragging = false;
        this.foundWords = new Set();
        this.pathElement = null;
        this.currentWordElement = document.querySelector('.current-word');
        
        this.initializeGrid();
        this.setupEventListeners();
        this.displayWords();
        this.initializeSVG();
    }

    initializeSVG() {
        const svg = document.querySelector('.path-overlay');
        const container = document.querySelector('.game-container');
        svg.setAttribute('width', container.offsetWidth);
        svg.setAttribute('height', container.offsetHeight);
        
        this.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.pathElement.setAttribute('class', 'selection-path');
        svg.appendChild(this.pathElement);
    }

    initializeGrid() {
        // Initialize empty grid
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = new Array(this.gridSize).fill(null);
        }

        // Sort words by length (longest first)
        const sortedWords = [...this.words].sort((a, b) => b.length - a.length);

        // Try to place each word with multiple attempts and different starting positions
        sortedWords.forEach(word => {
            let placed = false;
            let attempts = 0;
            const maxAttempts = 200; // Increased max attempts

            while (!placed && attempts < maxAttempts) {
                const row = Math.floor(Math.random() * this.gridSize);
                const col = Math.floor(Math.random() * this.gridSize);
                
                // Get valid directions from current position
                const directions = this.getValidDirections(row, col);
                
                // Shuffle the directions array for more varied placement
                this.shuffleArray(directions);
                
                if (directions.length > 0) {
                    // Try each direction
                    for (const direction of directions) {
                        if (this.canPlaceWord(word, row, col, direction)) {
                            if (this.placeWordAt(word, row, col, direction)) {
                                placed = true;
                                break;
                            }
                        }
                    }
                }
                attempts++;
            }

            if (!placed) {
                console.warn(`Could not place word: ${word}`);
            }
        });

        // Fill empty cells with random letters
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (!this.grid[i][j]) {
                    this.grid[i][j] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                }
            }
        }

        // Create the grid in the DOM
        const gameGrid = document.querySelector('.game-grid');
        gameGrid.innerHTML = '';

        for (let row = 0; row < this.gridSize; row++) {
            const hexRow = document.createElement('div');
            hexRow.className = 'hex-row';
            
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'letter-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.textContent = this.grid[row][col];
                hexRow.appendChild(cell);
            }
            
            gameGrid.appendChild(hexRow);
        }
    }

    // Fisher-Yates shuffle algorithm for randomizing directions
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    getValidDirections(row, col) {
        const isEvenRow = row % 2 === 0;
        
        // Define all possible directions in a hexagonal grid
        const possibleDirections = [
            [0, 1],   // right
            [0, -1],  // left
            [-1, isEvenRow ? 0 : 1],  // up-right
            [-1, isEvenRow ? -1 : 0], // up-left
            [1, isEvenRow ? 0 : 1],   // down-right
            [1, isEvenRow ? -1 : 0]   // down-left
        ];

        // Add diagonal directions to increase variety
        // These match the extended neighbor connections in getNeighborPositions
        const diagonalDirections = [
            [-2, 0],  // up-up
            [2, 0],   // down-down
            [0, 2],   // right-right
            [0, -2]   // left-left
        ];
        
        const allDirections = [...possibleDirections, ...diagonalDirections];

        // Filter out directions that would lead outside the grid based on word length
        return allDirections.filter(([dRow, dCol]) => {
            // Check if any position for this word would be invalid
            for (let i = 0; i < Math.min(this.words[0].length, this.gridSize); i++) {
                const newRow = row + (dRow * i);
                const newCol = col + (dCol * i);
                if (!this.isValidPosition(newRow, newCol)) {
                    return false;
                }
            }
            return true;
        });
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
    }

    canPlaceWord(word, startRow, startCol, direction) {
        const [dRow, dCol] = direction;
        const positions = [];
        
        // Check if all positions are valid and either empty or matching
        for (let i = 0; i < word.length; i++) {
            const row = startRow + (dRow * i);
            const col = startCol + (dCol * i);

            if (!this.isValidPosition(row, col)) {
                return false;
            }

            // Check if cell is empty or has matching letter
            if (this.grid[row][col] && this.grid[row][col] !== word[i]) {
                return false;
            }

            positions.push([row, col]);
        }

        // Verify consecutive positions are adjacent - critical for diagonal placements
        for (let i = 1; i < positions.length; i++) {
            const [prevRow, prevCol] = positions[i - 1];
            const [currRow, currCol] = positions[i];
            
            const neighbors = this.getNeighborPositions(prevRow, prevCol);
            const isAdjacent = neighbors.some(([nRow, nCol]) => 
                nRow === currRow && nCol === currCol
            );

            if (!isAdjacent) {
                return false;
            }
        }

        return true;
    }

    placeWordAt(word, startRow, startCol, direction) {
        const [dRow, dCol] = direction;
        const positions = [];
        
        // First, collect all positions
        for (let i = 0; i < word.length; i++) {
            const row = startRow + (dRow * i);
            const col = startCol + (dCol * i);
            positions.push([row, col, word[i]]);
        }

        // Double-check adjacency
        for (let i = 1; i < positions.length; i++) {
            const [prevRow, prevCol] = positions[i - 1];
            const [currRow, currCol] = positions[i];
            
            const neighbors = this.getNeighborPositions(prevRow, prevCol);
            const isAdjacent = neighbors.some(([nRow, nCol]) => 
                nRow === currRow && nCol === currCol
            );

            if (!isAdjacent) {
                return false;
            }
        }

        // If all checks pass, place the word
        positions.forEach(([row, col, letter]) => {
            this.grid[row][col] = letter;
        });
        
        return true;
    }

    getCellCenter(cell) {
        const rect = cell.getBoundingClientRect();
        const containerRect = document.querySelector('.game-container').getBoundingClientRect();
        return {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2
        };
    }

    updatePath() {
        if (this.selectedCells.length === 0) {
            this.pathElement.setAttribute('d', '');
            return;
        }

        const points = this.selectedCells.map(cell => this.getCellCenter(cell));
        const path = `M ${points[0].x} ${points[0].y} ` + 
                    points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        
        this.pathElement.setAttribute('d', path);
    }

    isAdjacent(cell1, cell2) {
        const row1 = parseInt(cell1.dataset.row);
        const col1 = parseInt(cell1.dataset.col);
        const row2 = parseInt(cell2.dataset.row);
        const col2 = parseInt(cell2.dataset.col);

        // Get all possible neighbors for the current cell
        const neighbors = this.getNeighborPositions(row1, col1);

        // Check if cell2's position matches any of the valid neighbor positions
        return neighbors.some(([nRow, nCol]) => nRow === row2 && nCol === col2);
    }

    getNeighborPositions(row, col) {
        const isEvenRow = row % 2 === 0;
        const neighbors = [];

        // Define all possible neighbor positions for a hexagonal grid
        const directions = [
            [0, 1],   // right
            [0, -1],  // left
            [-1, isEvenRow ? 0 : 1],  // up-right
            [-1, isEvenRow ? -1 : 0], // up-left
            [1, isEvenRow ? 0 : 1],   // down-right
            [1, isEvenRow ? -1 : 0],  // down-left
            // Add diagonal connections
            [-2, 0],  // up-up
            [2, 0],   // down-down
            [0, 2],   // right-right
            [0, -2]   // left-left
        ];

        // Add all valid neighbor positions
        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (this.isValidPosition(newRow, newCol)) {
                neighbors.push([newRow, newCol]);
            }
        }

        return neighbors;
    }

    updateCurrentWord() {
        const word = this.selectedCells.map(cell => cell.textContent).join('');
        this.currentWordElement.innerHTML = word.split('').map(letter => 
            `<span>${letter}</span>`
        ).join('');
    }

    setupEventListeners() {
        const gameGrid = document.querySelector('.game-grid');

        // Mouse events
        gameGrid.addEventListener('mousedown', (e) => this.handleDragStart(e));
        gameGrid.addEventListener('mouseover', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', () => this.handleDragEnd());

        // Touch events
        gameGrid.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            this.handleDragStart({ target: element });
        }, { passive: false });

        gameGrid.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            this.handleDragMove({ target: element });
        }, { passive: false });

        document.addEventListener('touchend', () => this.handleDragEnd());
        document.addEventListener('touchcancel', () => this.handleDragEnd());

        // Handle window resize
        window.addEventListener('resize', () => {
            const svg = document.querySelector('.path-overlay');
            const container = document.querySelector('.game-container');
            svg.setAttribute('width', container.offsetWidth);
            svg.setAttribute('height', container.offsetHeight);
            this.updatePath();
        });
    }

    handleDragStart(e) {
        if (e.target.classList.contains('letter-cell')) {
            this.isDragging = true;
            this.selectedCells = [e.target];
            e.target.classList.add('selected');
            this.updatePath();
            this.updateCurrentWord();
        }
    }

    handleDragMove(e) {
        if (this.isDragging && e.target && e.target.classList.contains('letter-cell')) {
            const lastCell = this.selectedCells[this.selectedCells.length - 1];
            
            if (!this.selectedCells.includes(e.target) && this.isAdjacent(lastCell, e.target)) {
                this.selectedCells.push(e.target);
                e.target.classList.add('selected');
                this.updatePath();
                this.updateCurrentWord();
            }
        }
    }

    handleDragEnd() {
        if (this.isDragging) {
            this.checkSelection();
            this.selectedCells.forEach(cell => cell.classList.remove('selected'));
            this.selectedCells = [];
            this.isDragging = false;
            this.updatePath();
            this.currentWordElement.innerHTML = '';
        }
    }

    displayWords() {
        const wordList = document.querySelector('.word-list');
        wordList.innerHTML = ''; // Clear existing words
        
        this.words.forEach(word => {
            const wordElement = document.createElement('div');
            wordElement.className = 'word-item';
            wordElement.textContent = word.toUpperCase();
            wordElement.dataset.word = word.toUpperCase();
            wordList.appendChild(wordElement);
        });
    }

    checkSelection() {
        const selectedWord = this.selectedCells
            .map(cell => cell.textContent)
            .join('');
        
        const reversedWord = selectedWord.split('').reverse().join('');
        
        if (this.words.includes(selectedWord) || this.words.includes(reversedWord)) {
            const word = this.words.includes(selectedWord) ? selectedWord : reversedWord;
            const isReversed = this.words.includes(reversedWord) && !this.words.includes(selectedWord);
            
            if (!this.foundWords.has(word)) {
                this.foundWords.add(word);
                const wordElement = document.querySelector(`[data-word="${word}"]`);
                wordElement.classList.add('found');
                
                // Add animation flash
                wordElement.style.animation = 'none';
                wordElement.offsetHeight; // Trigger reflow
                wordElement.style.animation = 'flash 0.5s';
                
                // Apply permanent color to the found word cells
                const cellsToHighlight = isReversed ? [...this.selectedCells].reverse() : this.selectedCells;
                const colors = ['#FFC107', '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#00BCD4', '#FF9800'];
                const colorIndex = Array.from(this.foundWords).indexOf(word) % colors.length;
                const highlightColor = colors[colorIndex];
                
                cellsToHighlight.forEach(cell => {
                    cell.classList.add('filled');
                });
                
                if (this.foundWords.size === this.words.length) {
                    setTimeout(() => alert('Congratulations! You found all the words!'), 100);
                }
            }
        }
    }
}

// Initialize the game with sample words
const words = ['HELLO', 'WORLD', 'GAME', 'PLAY', 'FUN'];
new WordSearchGame(words);