document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소들
  const boardElement = document.getElementById('game-board');
  const timerElement = document.getElementById('timer');
  const difficultySelect = document.getElementById('difficulty');
  const newGameBtn = document.getElementById('new-game-btn');
  const resetBtn = document.getElementById('reset-btn');
  const undoBtn = document.getElementById('undo-btn');
  const hintBtn = document.getElementById('hint-btn');
  const rulesBtn = document.getElementById('rules-btn');
  const recordsBtn = document.getElementById('records-btn');

  // 모달 관련 요소들
  const rulesModal = document.getElementById('rules-modal');
  const closeRulesBtn = document.getElementById('close-rules-btn');
  const winModal = document.getElementById('win-modal');
  const clearTimeElement = document.getElementById('clear-time');
  const viewBoardBtn = document.getElementById('view-board-btn');
  const playAgainBtn = document.getElementById('play-again-btn');
  const recordsModal = document.getElementById('records-modal');
  const closeRecordsBtn = document.getElementById('close-records-btn');
  const recordsList = document.getElementById('records-list');
  const fireworksCanvas = document.getElementById('fireworks-canvas');

  const BOARD_SIZE = 8;
  let boardState = [],
    regionMap = [],
    history = [];
  let timerInterval, seconds = 0,
    hintCount = 0;
  let isMouseDown = false,
    isDragging = false,
    startCell = null;
  let currentErrors = new Set();
  let processedCells = new Set(); // 드래그 중 처리된 칸들을 추적
  let dragMode = null; // 'add' 또는 'remove' 모드
  let isGameFinished = false; // 게임이 끝났는지 추적
  let solutionBoard = []; // 정답 보드 상태

  const mediumColors = ['bg-purple-300', 'bg-blue-300', 'bg-green-300', 'bg-yellow-300', 'bg-orange-300', 'bg-gray-300', 'bg-pink-300', 'bg-indigo-300'];
  const lightBorderColors = ['border-purple-200', 'border-blue-200', 'border-green-200', 'border-yellow-200', 'border-orange-200', 'border-gray-200', 'border-pink-200', 'border-indigo-200'];
  const queenIconName = 'chess_queen';
  const xIconName = 'close';

  function initGame() {
    clearInterval(timerInterval);
    seconds = 0;
    hintCount = 0;
    timerElement.textContent = '00:00';
    history = [];
    isGameFinished = false; // 게임 상태 초기화
    updateUndoButton();
    boardState = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    generateRegions();
    renderBoard();
    
    // 보드 스타일 초기화
    boardElement.style.pointerEvents = 'auto';
    boardElement.style.opacity = '1';
    boardElement.style.filter = 'none';
    
    startTimer();
    saveState();
    validateAndHighlight();
  }

  function resetBoard() {
    clearInterval(timerInterval);
    seconds = 0;
    hintCount = 0;
    timerElement.textContent = '00:00';
    history = [];
    isGameFinished = false; // 게임 상태 초기화
    updateUndoButton();
    boardState = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    // regionMap은 그대로 사용
    renderBoard();
    
    // 보드 스타일 초기화
    boardElement.style.pointerEvents = 'auto';
    boardElement.style.opacity = '1';
    boardElement.style.filter = 'none';
    
    startTimer();
    saveState();
    validateAndHighlight();
  }

  function generateRegions() {
    let success = false;
    let generatedMap = null;
    while (!success) {
      const result = tryGenerateRegions();
      if (result && result.map && result.solution) {
        generatedMap = result.map;
        solutionBoard = result.solution;
        success = true;
      }
    }
    regionMap = generatedMap;
  }

  function tryGenerateRegions() {
    const difficulty = difficultySelect.value;
    
    // 1단계: 먼저 8개의 퀸 위치를 정함 (서로 공격할 수 없는 위치)
    const queenPositions = generateValidQueenPositions();
    if (!queenPositions) return null;
    
    // 2단계: 퀸들을 포함하는 영역들을 만듦
    const map = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(-1));
    
    // 각 퀸을 중심으로 영역 생성 (마지막 영역 제외)
    for (let regionId = 0; regionId < BOARD_SIZE - 1; regionId++) {
      const queen = queenPositions[regionId];
      const targetSize = getRegionSize(difficulty, regionId);
      
      // 퀸 위치를 해당 영역에 할당
      map[queen.r][queen.c] = regionId;
      
      // 영역 크기가 1보다 크면 주변 칸들을 추가로 할당
      if (targetSize > 1) {
        const remainingSize = targetSize;
        expandRegion(map, queen.r, queen.c, regionId, remainingSize);
      }
    }
    
    // 3단계: 마지막 영역에 남은 모든 칸들을 할당 (연결성 유지)
    const lastRegionId = BOARD_SIZE - 1;
    const lastQueen = queenPositions[lastRegionId];
    
    // 마지막 퀸 위치를 마지막 영역에 할당
    map[lastQueen.r][lastQueen.c] = lastRegionId;
    
    // 남은 모든 빈 칸들을 마지막 영역에 할당 (연결성 유지)
    fillRemainingCellsToLastRegion(map, lastRegionId);
    
    // 4단계: 정답 보드 생성
    const solution = generateSolutionBoard(map, queenPositions);
    
    return { map, solution };
  }

  function generateSolutionBoard(regionMap, queenPositions) {
    // 정답 보드 초기화 (모든 칸을 0으로)
    const solution = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    
    // 퀸 위치에 2 표시
    queenPositions.forEach(queen => {
      solution[queen.r][queen.c] = 2;
    });
    
    // 각 영역에서 퀸이 없는 칸들에 1(X 표시) 추가
    for (let regionId = 0; regionId < BOARD_SIZE; regionId++) {
      const regionCells = [];
      
      // 해당 영역의 모든 칸 찾기
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (regionMap[r][c] === regionId) {
            regionCells.push({ r, c });
          }
        }
      }
      
      // 이 영역에 퀸이 있는지 확인
      const hasQueen = regionCells.some(cell => solution[cell.r][cell.c] === 2);
      
      // 퀸이 없다면 전략적으로 X 표시 추가
      if (!hasQueen) {
        // 영역의 중심에 가까운 칸에 X 표시
        const centerR = Math.floor(regionCells.reduce((sum, cell) => sum + cell.r, 0) / regionCells.length);
        const centerC = Math.floor(regionCells.reduce((sum, cell) => sum + cell.c, 0) / regionCells.length);
        
        // 중심에 가장 가까운 빈 칸에 X 표시
        let bestSpot = null;
        let minDistance = Infinity;
        
        regionCells.forEach(cell => {
          if (solution[cell.r][cell.c] === 0) {
            const distance = Math.abs(cell.r - centerR) + Math.abs(cell.c - centerC);
            if (distance < minDistance) {
              minDistance = distance;
              bestSpot = cell;
            }
          }
        });
        
        if (bestSpot) {
          solution[bestSpot.r][bestSpot.c] = 1;
        }
      }
    }
    
    return solution;
  }

  function expandRegion(map, startR, startC, regionId, targetSize) {
    const regionCells = [{ r: startR, c: startC }];
    let currentSize = 1;
    
    while (currentSize < targetSize) {
        const frontier = [];
      
      // 현재 영역에 속한 모든 칸들의 이웃을 찾기
        for (const cell of regionCells) {
        const neighbors = getAvailableNeighbors(cell.r, cell.c, map);
        for (const neighbor of neighbors) {
          if (!frontier.some(f => f.r === neighbor.r && f.c === neighbor.c)) {
            frontier.push(neighbor);
          }
        }
      }
      
      if (frontier.length === 0) break; // 더 이상 확장할 수 없음
      
      // 랜덤하게 이웃 선택하여 영역에 추가
      const randomIndex = Math.floor(Math.random() * frontier.length);
      const newCell = frontier[randomIndex];
      map[newCell.r][newCell.c] = regionId;
      regionCells.push(newCell);
      currentSize++;
    }
  }

  function generateValidQueenPositions() {
    const positions = [];
    const attempts = 1000; // 최대 시도 횟수
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      positions.length = 0; // 배열 초기화
      
      for (let i = 0; i < BOARD_SIZE; i++) {
        const validPositions = findValidPositionsForQueen(i, positions);
        if (validPositions.length === 0) {
          break; // 이 시도는 실패, 다음 시도로
        }
        
        // 랜덤하게 위치 선택
        const randomIndex = Math.floor(Math.random() * validPositions.length);
        positions.push(validPositions[randomIndex]);
      }
      
      if (positions.length === BOARD_SIZE) {
        return positions; // 성공!
      }
    }
    
    return null; // 실패
  }

  function findValidPositionsForQueen(queenIndex, existingQueens) {
    const validPositions = [];
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (isValidQueenPosition(r, c, existingQueens)) {
          validPositions.push({ r, c });
        }
      }
    }
    
    return validPositions;
  }

  function isValidQueenPosition(r, c, existingQueens) {
    for (const queen of existingQueens) {
      // 같은 행, 같은 열, 또는 인접한 대각선에 있으면 안됨
      if (r === queen.r || c === queen.c || 
          (Math.abs(r - queen.r) === 1 && Math.abs(c - queen.c) === 1)) {
        return false;
      }
    }
    return true;
  }

  function getRegionSize(difficulty, regionId) {
    if (difficulty === 'easy') {
      const sizes = [1, 2, 2, 3, 3, 4, 4];
      return sizes[regionId];
    } else if (difficulty === 'medium') {
      const sizes = [2, 3, 3, 4, 5, 6, 8];
      return sizes[regionId];
    } else { // hard
      const sizes = [3, 3, 4, 5, 6, 7, 8];
      return sizes[regionId];
    }
  }

  function getAvailableNeighbors(r, c, map) {
    const neighbors = [];
    const directions = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, 
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
    ];
    
    for (const dir of directions) {
      const nr = r + dir.dr;
      const nc = c + dir.dc;
      
      if (isValid(nr, nc) && map[nr][nc] === -1) {
        neighbors.push({ r: nr, c: nc });
      }
    }
    
    return neighbors;
  }



  function fillRemainingCellsToLastRegion(map, lastRegionId) {
    // 먼저 마지막 영역과 연결된 칸들을 찾아서 할당
    let changed = true;
    while (changed) {
      changed = false;
      
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (map[r][c] === -1) { // 아직 할당되지 않은 칸
            // 마지막 영역과 인접한지 확인
            if (hasAdjacentLastRegion(r, c, map, lastRegionId)) {
              map[r][c] = lastRegionId;
              changed = true;
            }
          }
        }
      }
    }
    
    // 아직 남은 칸들이 있다면 가장 가까운 마지막 영역 칸에 할당
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (map[r][c] === -1) {
          map[r][c] = lastRegionId;
        }
      }
    }
  }

  function hasAdjacentLastRegion(r, c, map, lastRegionId) {
    const directions = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, 
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
    ];
    
    for (const dir of directions) {
      const nr = r + dir.dr;
      const nc = c + dir.dc;
      
      if (isValid(nr, nc) && map[nr][nc] === lastRegionId) {
        return true;
      }
    }
    
    return false;
  }

  function getShuffledNeighbors(r, c) {
    const n = [{ r: r + 1, c }, { r: r - 1, c }, { r, c: c + 1 }, { r, c: c - 1 }];
    for (let i = n.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [n[i], n[j]] = [n[j], n[i]];
    }
    return n;
  }

  function isValid(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  function renderBoard() {
    boardElement.innerHTML = '';
    boardElement.className = 'w-full grid grid-cols-8 bg-white cursor-pointer select-none';
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = document.createElement('div');
        const regionId = regionMap[r][c];
        let borderClasses = '';
        if (c < BOARD_SIZE - 1 && regionId !== regionMap[r][c + 1]) {
          borderClasses += ' border-r-2 border-r-white';
        } else {
          borderClasses += ` border-r ${lightBorderColors[regionId % lightBorderColors.length]}`;
        }
        if (r < BOARD_SIZE - 1 && regionId !== regionMap[r + 1][c]) {
          borderClasses += ' border-b-2 border-b-white';
        } else {
          borderClasses += ` border-b ${lightBorderColors[regionId % lightBorderColors.length]}`;
        }
        cell.className = `relative aspect-square ${mediumColors[regionId % mediumColors.length]}${borderClasses}`;
        cell.dataset.r = r;
        cell.dataset.c = c;

        const content = document.createElement('span');
        content.className = 'absolute inset-0 flex items-center justify-center text-black text-3xl md:text-4xl';
        cell.appendChild(content);
        boardElement.appendChild(cell);
        updateCellDOM(r, c);
      }
    }
  }

  function updateCellDOM(r, c) {
    const cell = boardElement.querySelector(`[data-r='${r}'][data-c='${c}']`);
    if (cell) {
      const content = cell.firstChild;
      content.textContent = '';
      content.classList.remove('material-symbols-outlined');
      if (boardState[r][c] === 1) {
        content.textContent = xIconName;
        content.classList.add('material-symbols-outlined', 'transition-colors', 'duration-300');
      } else if (boardState[r][c] === 2) {
        content.textContent = queenIconName;
        content.classList.add('material-symbols-outlined', 'transition-colors', 'duration-300');
      }
    }
  }

  function validateAndHighlight() {
    const queens = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 2) queens.push({ r, c });
      }
    }

    const newErrors = new Set();
    
    // 1. 퀸들 간의 충돌 검사
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const q1 = queens[i];
        const q2 = queens[j];
        const isAdjacentDiagonal = Math.abs(q1.r - q2.r) === 1 && Math.abs(q1.c - q2.c) === 1;
        if (q1.r === q2.r || q1.c === q2.c || isAdjacentDiagonal) {
          newErrors.add(`${q1.r}-${q1.c}`);
          newErrors.add(`${q2.r}-${q2.c}`);
        }
      }
    }
    
    // 2. 같은 영역에 퀸이 2개 이상 있는지 검사
    const regionQueens = {};
    queens.forEach(q => {
      const regionId = regionMap[q.r][q.c];
      if (!regionQueens[regionId]) regionQueens[regionId] = [];
      regionQueens[regionId].push(q);
    });
    for (const regionId in regionQueens) {
      if (regionQueens[regionId].length > 1) {
        regionQueens[regionId].forEach(q => newErrors.add(`${q.r}-${q.c}`));
      }
    }

    // 기존 에러 표시 제거
    currentErrors.forEach(coord => {
      if (!newErrors.has(coord)) {
        const [r, c] = coord.split('-');
        const cell = boardElement.querySelector(`[data-r='${r}'][data-c='${c}']`);
        cell?.classList.remove('error-highlight');
        cell?.firstChild.classList.remove('error-icon');
      }
    });

    // 새로운 에러 표시 추가 (지속적으로 유지)
    newErrors.forEach(coord => {
      const [r, c] = coord.split('-');
      const cell = boardElement.querySelector(`[data-r='${r}'][data-c='${c}']`);
      if (cell && !currentErrors.has(coord)) {
        cell.classList.add('error-highlight');
        const icon = cell.firstChild;
        icon.classList.add('error-icon');
      }
    });
    currentErrors = newErrors;
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      seconds++;
      const min = Math.floor(seconds / 60).toString().padStart(2, '0');
      const sec = (seconds % 60).toString().padStart(2, '0');
      timerElement.textContent = `${min}:${sec}`;
    }, 1000);
  }

  function saveState() {
    history.push(JSON.stringify(boardState));
    updateUndoButton();
  }

  function undo() {
    if (history.length > 1) {
      history.pop();
      boardState = JSON.parse(history[history.length - 1]);
      renderBoard();
      validateAndHighlight();
      updateUndoButton();
    }
  }

  function updateUndoButton() {
    undoBtn.disabled = history.length <= 1;
  }

  function handleInteractionStart(e) {
    if (isGameFinished) return; // 게임이 끝났으면 상호작용 불가
    e.preventDefault();
    isMouseDown = true;
    isDragging = false;
    startCell = e.target.closest('[data-r]');
    processedCells.clear(); // 새로운 드래그 시작 시 처리된 칸들 초기화
    
    // 드래그 모드 결정만 하고 시작 칸은 처리하지 않음
    if (startCell) {
      const r = parseInt(startCell.dataset.r);
      const c = parseInt(startCell.dataset.c);
      
      // 시작 칸의 상태에 따라 드래그 모드 결정
      if (boardState[r][c] === 0) {
        dragMode = 'add'; // 빈 칸에서 시작하면 X 추가 모드
      } else if (boardState[r][c] === 1) {
        dragMode = 'remove'; // X 표시에서 시작하면 X 제거 모드
      } else {
        dragMode = null; // 퀸이 있는 칸에서는 드래그 불가
      }
    }
  }

  function handleInteractionMove(e) {
    if (!isMouseDown || !dragMode || isGameFinished) return; // 게임이 끝났으면 상호작용 불가
    e.preventDefault();
    isDragging = true;
    const targetEl = e.type === 'touchmove' ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) : e.target;
    const cell = targetEl.closest('[data-r]');
    if (cell) {
      const r = parseInt(cell.dataset.r);
      const c = parseInt(cell.dataset.c);
      const cellKey = `${r}-${c}`;
      
      // 이미 처리된 칸인지 확인
      if (processedCells.has(cellKey)) {
        return; // 이미 처리된 칸은 건너뛰기
      }
      
      if (dragMode === 'add') {
        // X 추가 모드: 빈 칸에만 X 표시
      if (boardState[r][c] === 0) {
          boardState[r][c] = 1; // X 표시
        updateCellDOM(r, c);
          processedCells.add(cellKey);
        }
      } else if (dragMode === 'remove') {
        // X 제거 모드: X 표시가 있는 칸만 빈 칸으로 변경
        if (boardState[r][c] === 1) {
          boardState[r][c] = 0; // X 제거
          updateCellDOM(r, c);
          processedCells.add(cellKey);
        }
      }
    }
  }

  function handleInteractionEnd(e) {
    if (!isMouseDown || isGameFinished) return; // 게임이 끝났으면 상호작용 불가
    e.preventDefault();
    
    if (isDragging) {
      // 드래그가 있었으면 시작 칸도 처리
      if (startCell && dragMode) {
        const r = parseInt(startCell.dataset.r);
        const c = parseInt(startCell.dataset.c);
        const cellKey = `${r}-${c}`;
        
        if (!processedCells.has(cellKey)) {
          if (dragMode === 'add' && boardState[r][c] === 0) {
            boardState[r][c] = 1;
            updateCellDOM(r, c);
          } else if (dragMode === 'remove' && boardState[r][c] === 1) {
            boardState[r][c] = 0;
            updateCellDOM(r, c);
          }
        }
      }
      saveState();
      validateAndHighlight();
      checkWinCondition();
    } else if (startCell) {
      // 클릭만 했으면 시작 칸 상태 변경
      const r = parseInt(startCell.dataset.r);
      const c = parseInt(startCell.dataset.c);
      boardState[r][c] = (boardState[r][c] + 1) % 3;
      updateCellDOM(r, c);
      saveState();
      validateAndHighlight();
      checkWinCondition();
    }
    
    isMouseDown = false;
    isDragging = false;
    startCell = null;
  }

  function checkWinCondition() {
    const queens = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 2) queens.push({ r, c });
      }
    }
    if (queens.length !== BOARD_SIZE || currentErrors.size > 0) return false;

    clearInterval(timerInterval);
    clearTimeElement.textContent = timerElement.textContent;
    saveRecord();
    winModal.classList.remove('hidden');
    runFireworks();
    isGameFinished = true; // 게임 종료 상태 업데이트
    
    // 게임이 끝났을 때 보드 스타일 변경
    boardElement.style.pointerEvents = 'none';
    boardElement.style.opacity = '0.8';
    boardElement.style.filter = 'grayscale(20%)';
    
    return true;
  }

  function saveRecord() {
    const records = JSON.parse(localStorage.getItem('queensRecords')) || [];
    const newRecord = { date: new Date().toISOString(), time: seconds, hints: hintCount, boardState: boardState, regionMap: regionMap };
    records.unshift(newRecord);
    localStorage.setItem('queensRecords', JSON.stringify(records));
  }

  function renderRecords() {
    const records = JSON.parse(localStorage.getItem('queensRecords')) || [];
    recordsList.innerHTML = '';
    if (records.length === 0) {
      recordsList.innerHTML = `<p class="text-center text-gray-500">아직 성공한 기록이 없어요.</p>`;
      return;
    }
    records.forEach(record => {
      const recordEl = document.createElement('div');
      recordEl.className = 'flex items-center space-x-4 p-2 border rounded-lg';
      const min = Math.floor(record.time / 60).toString().padStart(2, '0');
      const sec = (record.time % 60).toString().padStart(2, '0');
      const date = new Date(record.date);
      const dateString = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
      let miniBoardHTML = '<div class="grid grid-cols-8 w-24 h-24 border border-gray-400">';
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const regionId = record.regionMap[r][c];
          const colorClass = mediumColors[regionId % mediumColors.length];
          const hasQueen = record.boardState[r][c] === 2;
          miniBoardHTML += `<div class="${colorClass} relative flex items-center justify-center">${hasQueen ? '<div class="w-1.5 h-1.5 bg-black rounded-full"></div>' : ''}</div>`;
        }
      }
      miniBoardHTML += '</div>';
      recordEl.innerHTML = `${miniBoardHTML}
        <div class="flex-grow">
          <p class="font-bold text-lg">${min}:${sec}</p>
          <p class="text-sm text-gray-500">${dateString}</p>
          <p class="text-xs text-gray-500 mt-1">힌트: ${record.hints || 0}회</p>
        </div>`;
      recordsList.appendChild(recordEl);
    });
  }

  function applyHintAnimation(cell) {
    if (cell) {
      cell.classList.remove('hint-animation'); // 애니메이션 재시작을 위해 클래스 제거
      void cell.offsetWidth; // 리플로우 강제
      cell.classList.add('hint-animation');
    }
  }

  function showHint() {
    hintCount++;

    // 2. 잘못 놓인 X 표시들을 제거 (퀸을 놓을 수 있는 곳에 X가 있으면 제거)
    const wrongXs = findWrongXs();
    if (wrongXs.length > 0) {
      // 첫 번째 잘못된 X 표시 제거
      const wrongX = wrongXs[0];
      boardState[wrongX.r][wrongX.c] = 2;
      updateCellDOM(wrongX.r, wrongX.c);
      const cell = boardElement.querySelector(`[data-r='${wrongX.r}'][data-c='${wrongX.c}']`);
      if (cell) {
        applyHintAnimation(cell);
      }
      saveState();
      validateAndHighlight();
      return;
    }

    // 3. 랜덤한 위치의 X 표시
    const randomXSpots = findRandomXSpots();
    if (randomXSpots) {
      // 첫 번째 위치에 X 표시
      const spot = randomXSpots;
      boardState[spot.r][spot.c] = 1;
      updateCellDOM(spot.r, spot.c);
      const cell = boardElement.querySelector(`[data-r='${spot.r}'][data-c='${spot.c}']`);
      if (cell) {
        applyHintAnimation(cell);
      }
      saveState();
      validateAndHighlight();
      return;
    }

    // 4. 퀸을 놓을 수 있는 위치 찾기
    const queens = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 0 && canPlaceQueenHere(r, c)) {
          queens.push({ r, c });
        }
      }
    }

    if (queens.length > 0) {
      const spot = queens[Math.floor(Math.random() * queens.length)];
      boardState[spot.r][spot.c] = 2;
      updateCellDOM(spot.r, spot.c);
      const cell = boardElement.querySelector(`[data-r='${spot.r}'][data-c='${spot.c}']`);
      if (cell) {
        applyHintAnimation(cell);
      }
      saveState();
      validateAndHighlight();
      checkWinCondition();
      return;
    }
  }

  function findRandomXSpots() {
    const availableSpots = [];
    
    // 빈 칸들을 모두 수집
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 0 && solutionBoard[r][c] === 0) {
          availableSpots.push({ r, c });
        }
      }
    }
    
    if (availableSpots.length === 0) return false;
    
    // 요청된 개수만큼 반환
    return availableSpots[Math.floor(Math.random() * availableSpots.length)];
  }

  function findSolution() {
    // 현재 보드 상태를 기반으로 정답을 찾는 알고리즘
    // 백트래킹을 사용하여 모든 가능한 해를 찾음
    const solution = solvePuzzle();
    return solution;
  }

  function solvePuzzle() {
    // 간단한 백트래킹 솔버
    const tempBoard = boardState.map(row => [...row]);
    const queens = [];
    
    // 현재 놓인 퀸들을 수집
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (tempBoard[r][c] === 2) {
          queens.push({ r, c });
        }
      }
    }
    
    // 백트래킹으로 해 찾기
    if (solveBacktrack(tempBoard, queens, 0)) {
      return tempBoard;
    }
    
    return null;
  }

  function solveBacktrack(board, queens, depth) {
    if (depth >= BOARD_SIZE) {
      return true; // 모든 퀸을 놓았음
    }
    
    // 현재 depth에 해당하는 영역 찾기
    const targetRegion = depth;
    let regionCells = [];
    
    // 해당 영역의 모든 칸 찾기
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (regionMap[r][c] === targetRegion) {
          regionCells.push({ r, c });
        }
      }
    }
    
    // 이미 이 영역에 퀸이 있는지 확인
    let hasQueenInRegion = false;
    for (const queen of queens) {
      if (regionMap[queen.r][queen.c] === targetRegion) {
        hasQueenInRegion = true;
        break;
      }
    }
    
    if (hasQueenInRegion) {
      // 이미 퀸이 있으면 다음 영역으로
      return solveBacktrack(board, queens, depth + 1);
    }
    
    // 이 영역에 퀸을 놓을 수 있는 위치 찾기
    for (const cell of regionCells) {
      if (board[cell.r][cell.c] === 0 && canPlaceQueenAt(board, cell.r, cell.c, queens)) {
        // 퀸을 놓아봄
        board[cell.r][cell.c] = 2;
        queens.push({ r: cell.r, c: cell.c });
        
        if (solveBacktrack(board, queens, depth + 1)) {
          return true;
        }
        
        // 백트래킹: 퀸 제거
        board[cell.r][cell.c] = 0;
        queens.pop();
      }
    }
    
    return false;
  }

  function canPlaceQueenAt(board, r, c, existingQueens) {
    for (const queen of existingQueens) {
      // 같은 행, 같은 열, 또는 인접한 대각선에 있으면 안됨
      if (r === queen.r || c === queen.c || 
          (Math.abs(r - queen.r) === 1 && Math.abs(c - queen.c) === 1)) {
        return false;
      }
    }
    return true;
  }

  function findBestHint(solution) {
    if (!solution) return null;
    
    // 1. 잘못 놓인 퀸이나 X 제거
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] !== solution[r][c]) {
          if (boardState[r][c] !== 0) {
            // 잘못 놓인 것이 있음 - 제거
            return { type: 'remove', r, c };
          }
        }
      }
    }
    
    // 2. 정답과 다른 빈 칸에 퀸이나 X 놓기
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 0 && solution[r][c] !== 0) {
          if (solution[r][c] === 2) {
            // 퀸을 놓아야 함
            return { type: 'queen', r, c };
          } else if (solution[r][c] === 1) {
            // X를 놓아야 함
            return { type: 'x', r, c };
          }
        }
      }
    }
    
    return null;
  }

  function findWrongXs() {
    const wrongXs = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 1) { // X가 있는 칸이라면
          // 이 X를 제거했을 때 퀸을 놓을 수 있는지 확인
          if (canPlaceQueenHere(r, c)) {
            wrongXs.push({ r, c });
          }
        }
      }
    }
    return wrongXs;
  }

  function canPlaceQueenHere(r, c) {
    return solutionBoard[r][c] === 2;
  }

  function findStrategicXSpots() {
    const strategicSpots = [];
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 0) { // 빈 칸이라면
          // 이 위치에 X를 놓으면 게임 진행에 도움이 되는지 확인
          if (isStrategicXPlacement(r, c)) {
            const score = calculateStrategicScore(r, c);
            strategicSpots.push({ r, c, score });
          }
        }
      }
    }
    
    // 점수 순으로 정렬 (높은 점수부터)
    strategicSpots.sort((a, b) => b.score - a.score);
    return strategicSpots;
  }

  function isStrategicXPlacement(r, c) {
    // X를 놓으면 퀸을 놓을 수 없게 되는 위치인지 확인
    // 즉, 이 위치에 퀸을 놓을 수 있다면 X를 놓는 것이 전략적
    return isMoveValid(r, c, boardState);
  }

  function calculateStrategicScore(r, c) {
    let score = 0;
    
    // 행과 열에 퀸이 없는 경우 높은 점수
    const hasQueenInRow = hasQueenInLine(r, -1);
    const hasQueenInCol = hasQueenInLine(-1, c);
    
    if (!hasQueenInRow) score += 3;
    if (!hasQueenInCol) score += 3;
    
    // 영역에 퀸이 없는 경우 높은 점수
    const regionId = regionMap[r][c];
    if (!hasQueenInRegion(regionId)) score += 2;
    
    // 주변에 퀸이 없는 경우 높은 점수
    if (!hasQueenNearby(r, c)) score += 1;
    
    return score;
  }

  function findBestQueenSpot() {
    const validSpots = [];
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 0 && isMoveValid(r, c, boardState)) {
          const score = calculateQueenPlacementScore(r, c);
          validSpots.push({ r, c, score });
        }
      }
    }
    
    if (validSpots.length === 0) return null;
    
    // 점수 순으로 정렬 (높은 점수부터)
    validSpots.sort((a, b) => b.score - a.score);
    return validSpots[0];
  }

  function calculateQueenPlacementScore(r, c) {
    let score = 0;
    
    // 행과 열에 퀸이 없는 경우 높은 점수
    if (!hasQueenInLine(r, -1)) score += 5;
    if (!hasQueenInLine(-1, c)) score += 5;
    
    // 영역에 퀸이 없는 경우 높은 점수
    const regionId = regionMap[r][c];
    if (!hasQueenInRegion(regionId)) score += 4;
    
    // 주변에 퀸이 없는 경우 높은 점수
    if (!hasQueenNearby(r, c)) score += 3;
    
    return score;
  }

  function findForcedSpot() {
    // 강제로 놓을 수밖에 없는 위치 찾기
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 0) {
          // 이 위치에 퀸을 놓을 수 있는지 확인
          if (isMoveValid(r, c, boardState)) {
            return { r, c, type: 'queen' };
          }
          // 이 위치에 X를 놓을 수 있는지 확인
          if (isValidXPlacement(r, c)) {
            return { r, c, type: 'x' };
          }
        }
      }
    }
    return null;
  }

  // 헬퍼 함수들
  function hasQueenInLine(row, col) {
    if (row >= 0) {
    // 행 검사
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[row][c] === 2) return true;
    }
    } else if (col >= 0) {
    // 열 검사
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (boardState[r][col] === 2) return true;
      }
    }
    return false;
  }

  function hasQueenInRegion(regionId) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (regionMap[r][c] === regionId && boardState[r][c] === 2) {
          return true;
        }
      }
    }
    return false;
  }

  function hasQueenNearby(r, c) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (isValid(nr, nc) && boardState[nr][nc] === 2) {
          return true;
        }
      }
    }
    return false;
  }

  function validateGameState() {
    // 간단한 게임 상태 검증
    const queens = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardState[r][c] === 2) queens.push({ r, c });
      }
    }
    
    // 퀸들이 서로 공격할 수 없는지 확인
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const q1 = queens[i];
        const q2 = queens[j];
        if (q1.r === q2.r || q1.c === q2.c || 
            (Math.abs(q1.r - q2.r) === 1 && Math.abs(q1.c - q2.c) === 1)) {
          return false;
        }
      }
    }
    
    // 같은 영역에 퀸이 2개 이상 있는지 확인
    const regionQueens = {};
    queens.forEach(q => {
      const regionId = regionMap[q.r][q.c];
      if (!regionQueens[regionId]) regionQueens[regionId] = [];
      regionQueens[regionId].push(q);
    });
    
    for (const regionId in regionQueens) {
      if (regionQueens[regionId].length > 1) {
        return false;
      }
    }
    
    return true;
  }

  function isValidXPlacement(r, c) {
    // X를 놓아도 게임 규칙을 위반하지 않는지 확인
    return true; // 기본적으로 X는 어디든 놓을 수 있음
  }

  function isMoveValid(r, c, currentState) {
    if (currentState[r][c] !== 0) return false;
    const queens = [];
    for (let qr = 0; qr < BOARD_SIZE; qr++) {
      for (let qc = 0; qc < BOARD_SIZE; qc++) {
        if (currentState[qr][qc] === 2) queens.push({ r: qr, c: qc });
      }
    }
    const newQueen = { r, c };
    for (const q of queens) {
      const isAdjacentDiagonal = Math.abs(q.r - newQueen.r) === 1 && Math.abs(q.c - newQueen.c) === 1;
      if (q.r === newQueen.r || q.c === newQueen.c || isAdjacentDiagonal) return false;
    }
    const regionId = regionMap[newQueen.r][newQueen.c];
    for (const q of queens) {
      if (regionMap[q.r][q.c] === regionId) return false;
    }
    return true;
  }

  let animationFrameId;

  function runFireworks() {
    const ctx = fireworksCanvas.getContext('2d');
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
    let fireworks = [];
    let particles = [];

    function Firework(sx, sy, tx, ty) {
      this.x = sx;
      this.y = sy;
      this.sx = sx;
      this.sy = sy;
      this.tx = tx;
      this.ty = ty;
      this.distanceToTarget = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));
      this.distanceTraveled = 0;
      this.coordinates = [];
      this.coordinateCount = 3;
      while (this.coordinateCount--) {
        this.coordinates.push([this.x, this.y]);
      }
      this.angle = Math.atan2(ty - sy, tx - sx);
      this.speed = 2;
      this.acceleration = 1.05;
      this.brightness = Math.random() * 50 + 50;
    }

    Firework.prototype.update = function(index) {
      this.coordinates.pop();
      this.coordinates.unshift([this.x, this.y]);
      this.speed *= this.acceleration;
      let vx = Math.cos(this.angle) * this.speed;
      let vy = Math.sin(this.angle) * this.speed;
      this.distanceTraveled = Math.sqrt(Math.pow(this.x - this.sx, 2) + Math.pow(this.y - this.sy, 2));
      if (this.distanceTraveled >= this.distanceToTarget) {
        fireworks.splice(index, 1);
        let particleCount = 30;
        while (particleCount--) {
          particles.push(new Particle(this.tx, this.ty));
        }
      } else {
        this.x += vx;
        this.y += vy;
      }
    };

    Firework.prototype.draw = function() {
      ctx.beginPath();
      ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = 'hsl(' + Math.random() * 360 + ', 100%, ' + this.brightness + '%)';
      ctx.stroke();
    };

    function Particle(x, y) {
      this.x = x;
      this.y = y;
      this.coordinates = [];
      this.coordinateCount = 5;
      while (this.coordinateCount--) {
        this.coordinates.push([this.x, this.y]);
      }
      this.angle = Math.random() * Math.PI * 2;
      this.speed = Math.random() * 10 + 1;
      this.friction = 0.95;
      this.gravity = 1;
      this.hue = Math.random() * 360;
      this.brightness = Math.random() * 50 + 50;
      this.alpha = 1;
      this.decay = Math.random() * 0.03 + 0.015;
    }

    Particle.prototype.update = function(index) {
      this.coordinates.pop();
      this.coordinates.unshift([this.x, this.y]);
      this.speed *= this.friction;
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed + this.gravity;
      this.alpha -= this.decay;
      if (this.alpha <= this.decay) {
        particles.splice(index, 1);
      }
    };

    Particle.prototype.draw = function() {
      ctx.beginPath();
      ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
      ctx.stroke();
    };

    function loop() {
      animationFrameId = requestAnimationFrame(loop);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
      ctx.globalCompositeOperation = 'lighter';

      let i = fireworks.length;
      while (i--) {
        fireworks[i].draw();
        fireworks[i].update(i);
      }

      let j = particles.length;
      while (j--) {
        particles[j].draw();
        particles[j].update(j);
      }

      if (Math.random() < 0.05) {
        fireworks.push(new Firework(fireworksCanvas.width / 2, fireworksCanvas.height, Math.random() * fireworksCanvas.width, Math.random() * fireworksCanvas.height / 2));
      }
    }

    cancelAnimationFrame(animationFrameId);
    loop();
  }

  function stopFireworks() {
    cancelAnimationFrame(animationFrameId);
    const ctx = fireworksCanvas.getContext('2d');
    ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
  }

  // --- 이벤트 리스너 ---
  boardElement.addEventListener('mousedown', handleInteractionStart);
  boardElement.addEventListener('mousemove', handleInteractionMove);
  document.addEventListener('mouseup', handleInteractionEnd);
  boardElement.addEventListener('touchstart', handleInteractionStart, { passive: false });
  boardElement.addEventListener('touchmove', handleInteractionMove, { passive: false });
  boardElement.addEventListener('touchend', handleInteractionEnd, { passive: false });

  newGameBtn.addEventListener('click', initGame);
  resetBtn.addEventListener('click', resetBoard);
  difficultySelect.addEventListener('change', initGame);
  undoBtn.addEventListener('click', undo);
  hintBtn.addEventListener('click', showHint);
  rulesBtn.addEventListener('click', () => rulesModal.classList.remove('hidden'));
  closeRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));

  playAgainBtn.addEventListener('click', () => {
    winModal.classList.add('hidden');
    stopFireworks();
    initGame();
  });
  viewBoardBtn.addEventListener('click', () => {
    winModal.classList.add('hidden');
    stopFireworks();
  });

  recordsBtn.addEventListener('click', () => {
    renderRecords();
    recordsModal.classList.remove('hidden');
  });
  closeRecordsBtn.addEventListener('click', () => recordsModal.classList.add('hidden'));

  initGame();
});