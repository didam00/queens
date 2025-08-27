document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소들
  const boardElement = document.getElementById('game-board');
  const timerElement = document.getElementById('timer');
  const currentDifficultyElement = document.getElementById('current-difficulty');
  const newGameBtn = document.getElementById('new-game-btn');
  const resetBtn = document.getElementById('reset-btn');
  const undoBtn = document.getElementById('undo-btn');
  const hintBtn = document.getElementById('hint-btn');
  const rulesBtn = document.getElementById('rules-btn');
  const recordsBtn = document.getElementById('records-btn');
  const settingsBtn = document.getElementById('settings-btn');

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
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const applySettingsBtn = document.getElementById('apply-settings-btn');
  const boardSizeBtns = document.querySelectorAll('.board-size-btn');
  
  // 로딩 관련 요소들
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingStatus = document.getElementById('loading-status');
  const loadingProgress = document.getElementById('loading-progress');
  const loadingPercentage = document.getElementById('loading-percentage');

  let BOARD_SIZE = 8; // 동적으로 변경 가능한 보드 크기
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
  let currentDifficulty = 'medium'; // 현재 난이도
  let solutionCount = 1; // 현재 보드의 해의 개수
  let pendingBoardSize = 8; // 적용 대기 중인 보드 크기

  const darkColors = ['bg-purple-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-gray-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400', 'bg-lime-400'];
  const mediumColors = ['bg-purple-300', 'bg-blue-300', 'bg-green-300', 'bg-yellow-300', 'bg-orange-300', 'bg-gray-300', 'bg-pink-300', 'bg-indigo-300', 'bg-teal-300', 'bg-lime-300'];
  const lightBorderColors = ['border-purple-200', 'border-blue-200', 'border-green-200', 'border-yellow-200', 'border-orange-200', 'border-gray-200', 'border-pink-200', 'border-indigo-200', 'border-teal-200', 'border-lime-200'];
  const queenIconName = 'chess_queen';
  const xIconName = 'close';

  async function initGame() {
    // 버튼들 비활성화
    newGameBtn.disabled = true;
    resetBtn.disabled = true;
    hintBtn.disabled = true;
    settingsBtn.disabled = true;
    
    clearInterval(timerInterval);
    seconds = 0;
    hintCount = 0;
    timerElement.textContent = '00:00';
    history = [];
    isGameFinished = false; // 게임 상태 초기화
    updateUndoButton();
    boardState = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    
    await generateRegions();
    renderBoard();
    
    // 보드 스타일 초기화
    boardElement.style.pointerEvents = 'auto';
    boardElement.style.opacity = '1';
    boardElement.style.filter = 'none';

    // 버튼들 다시 활성화
    newGameBtn.disabled = false;
    resetBtn.disabled = false;
    hintBtn.disabled = false;
    settingsBtn.disabled = false;

    // for (let r = 0; r < BOARD_SIZE; r++) {
    //   for (let c = 0; c < BOARD_SIZE; c++) {
    //     const cell = boardElement.querySelector(`[data-r='${r}'][data-c='${c}']`);
    //     if (cell) {
    //       cell.style.filter = 'none';
    //     }
    //   }
    // }

    animateWaveFromTopLeft(35, true);
    
    startTimer();
    saveState();
    validateAndHighlight();
  }

  function animateWaveFromTopLeft(step = 35, clear = false) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = boardElement.querySelector(`[data-r='${r}'][data-c='${c}']`);
        if (!cell) continue;

        if (clear) {
          cell.style.visibility = 'hidden';
        }
        
        const delay = (r + c) * step;
        setTimeout(() => {
          if (clear) {
            cell.style.visibility = 'visible';
          }

          cell.animate(
            [
              { translate: '0 0', filter: 'brightness(1.2)' },
              { translate: '0 -8px', filter: 'brightness(1.1)' },
              { translate: '0 0', filter: 'none' }
            ],
            { duration: 300, easing: 'ease-in-out' }
          );
        }, delay);
      }
    }
  }

  function resetBoard() {
    clearInterval(timerInterval);
    seconds = 0;
    hintCount = 0;
    timerElement.textContent = '00:00';
    history = [];
    isGameFinished = false; // 게임 상태 초기화
    updateUndoButton();
    // boardState = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const delay = (r + c) * 35;
        
        setTimeout(() => {
          boardState[r][c] = 0;
          updateCellDOM(r, c);
        }, delay);
      }
    }
    // regionMap은 그대로 사용
    renderBoard();
    animateWaveFromTopLeft(35);

    // 보드 스타일 초기화
    boardElement.style.pointerEvents = 'auto';
    boardElement.style.opacity = '1';
    boardElement.style.filter = 'none';
    
    startTimer();
    saveState();
    validateAndHighlight();

  }

    async function generateRegions() {
    currentDifficultyElement.textContent = '난이도: 생성 중...';
    showLoading();
    
    let success = false;
    let generatedMap = null;
    let attempts = 0;
    const maxAttempts = 200;
    
    try {
      while (!success && attempts < maxAttempts) {
        // 진행률 업데이트 (시도 횟수 기반)
        const progress = (attempts / maxAttempts) * 80; // 80%까지는 시도 과정
        setLoadingProgress(progress, `영역 패턴 생성 중... (${attempts + 1}/${maxAttempts})`);
        
        const result = await tryGenerateRegionsWithSolutionCountAsync();
        if (result && result.map && result.solution && result.solutionCount >= 1 && result.solutionCount <= 3) {
          generatedMap = result.map;
          solutionBoard = result.solution;
          solutionCount = result.solutionCount;
          success = true;
        }
        attempts++;
        
        // UI 업데이트를 위한 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      setLoadingProgress(85, '해 검증 중...');
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (!success) {
        setLoadingProgress(90, '대안 패턴 생성 중...');
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 대안 방법으로 간단한 고정 패턴 사용
        const fallbackResult = generateFallbackRegions();
        regionMap = fallbackResult.map;
        solutionBoard = fallbackResult.solution;
        solutionCount = 1;
      } else {
        regionMap = generatedMap;
      }
      
      setLoadingProgress(95, '난이도 계산 중...');
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 해의 개수에 따라 난이도 설정
      if (solutionCount === 1) {
        currentDifficulty = 'hard';
      } else if (solutionCount === 2) {
        currentDifficulty = 'medium';
      } else if (solutionCount === 3) {
        currentDifficulty = 'easy';
      }
      
      setLoadingProgress(100, '완료!');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // UI 업데이트
      updateDifficultyDisplay();
      
    } finally {
      hideLoading();
    }
  }

  function tryGenerateRegionsWithSolutionCount() {
    // 1단계: 다양한 크기의 연결된 영역들을 생성
    const map = generateVariedRegions();
    if (!map) return null;
    
    // 2단계: 백트래킹으로 모든 해를 찾기
    const puzzleResult = solvePuzzleWithSolutionCount(map);
    if (!puzzleResult || puzzleResult.solutionCount === 0) return null;
    
    return {
      map: map,
      solution: puzzleResult.solutions[0], // 첫 번째 해를 정답으로 사용
      solutionCount: puzzleResult.solutionCount
    };
  }

  async function tryGenerateRegionsWithSolutionCountAsync() {
    // 비동기 버전 - UI 업데이트를 위한 대기 시간 포함
    const map = generateVariedRegions();
    if (!map) return null;
    
    // 짧은 대기를 통해 UI 업데이트 허용
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const puzzleResult = solvePuzzleWithSolutionCount(map);
    if (!puzzleResult || puzzleResult.solutionCount === 0) return null;
    
    return {
      map: map,
      solution: puzzleResult.solutions[0],
      solutionCount: puzzleResult.solutionCount
    };
  }

  function updateDifficultyDisplay() {
    const difficultyText = currentDifficulty === 'easy' ? '쉬움' : 
                          currentDifficulty === 'medium' ? '보통' : '어려움';
    currentDifficultyElement.textContent = `${difficultyText}`;
  }

  function solvePuzzleWithSolutionCount(regionMap) {
    // 백트래킹으로 모든 가능한 해를 찾기 (최대 5개까지)
    const allSolutions = findAllSolutions(regionMap, 5);
    
    if (allSolutions.length === 0) {
      return null; // 해가 없음
    }
    
    return {
      solutions: allSolutions,
      solutionCount: allSolutions.length
    };
  }

  function generateVariedRegions() {
    const map = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(-1));
    
    // 다양한 패턴으로 시작점들을 동적 생성
    const patterns = generateDynamicPatterns();
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    const regionSizes = generateRandomRegionSizes();
    
    // 각 영역을 시드에서 시작하여 확장
    for (let regionId = 0; regionId < BOARD_SIZE; regionId++) {
      const startPoint = selectedPattern[regionId];
      
      // 시작점 찾기 (이미 할당된 곳이면 가까운 빈 곳 찾기)
      const actualStart = findNearestEmptyCell(map, startPoint.r, startPoint.c);
      if (!actualStart) continue;
      
      map[actualStart.r][actualStart.c] = regionId;
      
      // 지정된 크기만큼 영역 확장
      const targetSize = regionSizes[regionId];
      growRegionToSize(map, actualStart.r, actualStart.c, regionId, targetSize);
    }
    
    // 모든 칸이 할당되었는지 확인하고 빈 칸이 있으면 가장 가까운 영역에 할당
    fillRemainingCells(map);
    
    return map;
  }

  function generateRandomRegionSizes() {
    // 총 칸 수를 동적으로 계산
    const totalCells = BOARD_SIZE * BOARD_SIZE;
    const numRegions = BOARD_SIZE;
    const sizes = [];
    let remaining = totalCells;
    
    for (let i = 0; i < numRegions - 1; i++) {
      // 최소 크기는 보드 크기에 따라 조정
      const minSize = Math.max(3, Math.floor(BOARD_SIZE / 2));
      const maxSize = Math.min(Math.floor(BOARD_SIZE * 1.5), remaining - (numRegions - 1 - i) * minSize);
      const size = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      sizes.push(size);
      remaining -= size;
    }
    
    // 마지막 영역에 남은 칸 할당
    sizes.push(remaining);
    
    return sizes;
  }

  function generateDynamicPatterns() {
    const patterns = [];
    
    // 패턴 1: 코너와 센터
    const cornerPattern = [];
    cornerPattern.push({ r: 0, c: 0 }); // 좌상단
    cornerPattern.push({ r: 0, c: BOARD_SIZE - 1 }); // 우상단
    cornerPattern.push({ r: BOARD_SIZE - 1, c: 0 }); // 좌하단
    cornerPattern.push({ r: BOARD_SIZE - 1, c: BOARD_SIZE - 1 }); // 우하단
    
    // 센터 근처 위치들 추가
    const center = Math.floor(BOARD_SIZE / 2);
    for (let i = 4; i < BOARD_SIZE; i++) {
      const offset = (i - 4) % 4;
      const r = center + (offset < 2 ? -1 : 1);
      const c = center + (offset % 2 === 0 ? -1 : 1);
      cornerPattern.push({ r: Math.max(0, Math.min(BOARD_SIZE - 1, r)), 
                          c: Math.max(0, Math.min(BOARD_SIZE - 1, c)) });
    }
    patterns.push(cornerPattern);
    
    // 패턴 2: 대각선
    const diagonalPattern = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      const r = Math.floor(i * (BOARD_SIZE - 1) / (BOARD_SIZE - 1));
      const c = Math.floor(i * (BOARD_SIZE - 1) / (BOARD_SIZE - 1));
      diagonalPattern.push({ r, c });
    }
    patterns.push(diagonalPattern);
    
    // 패턴 3: 격자
    const gridPattern = [];
    const step = Math.max(1, Math.floor(BOARD_SIZE / 3));
    for (let i = 0; i < BOARD_SIZE; i++) {
      const r = (i * step) % BOARD_SIZE;
      const c = ((i * step) + Math.floor(i / 2)) % BOARD_SIZE;
      gridPattern.push({ r, c });
    }
    patterns.push(gridPattern);
    
    // 패턴 4: 랜덤
    const randomPattern = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      randomPattern.push({ 
        r: Math.floor(Math.random() * BOARD_SIZE), 
        c: Math.floor(Math.random() * BOARD_SIZE) 
      });
    }
    patterns.push(randomPattern);
    
    return patterns;
  }

  function findAllSolutions(regionMap, maxSolutions = 10) {
    const solutions = [];
    
    // 각 영역에 퀸을 놓을 수 있는 모든 가능한 조합 시도
    const regionCells = [];
    for (let regionId = 0; regionId < BOARD_SIZE; regionId++) {
      const cells = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (regionMap[r][c] === regionId) {
            cells.push({ r, c });
          }
        }
      }
      regionCells.push(cells);
    }
    
    // 백트래킹으로 해 찾기
    const board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    const queens = [];
    
    function backtrack(regionIndex) {
      if (regionIndex >= BOARD_SIZE) {
        // 모든 영역에 퀸을 놓았음
        const solution = board.map(row => [...row]);
        solutions.push(solution);
        return solutions.length >= maxSolutions;
      }
      
      const currentRegionCells = regionCells[regionIndex];
      
      for (const cell of currentRegionCells) {
        if (canPlaceQueenAt(board, cell.r, cell.c, queens)) {
          // 퀸을 놓아봄
          board[cell.r][cell.c] = 2;
          queens.push({ r: cell.r, c: cell.c });
          
          if (backtrack(regionIndex + 1)) {
            return true; // 충분한 해를 찾았음
          }
          
          // 백트래킹: 퀸 제거
          board[cell.r][cell.c] = 0;
          queens.pop();
        }
      }
      
      return false;
    }
    
    backtrack(0);
    return solutions;
  }

  function generateFallbackRegions() {
    // 간단한 고정 패턴으로 영역 생성
    const map = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    
    // 8x8 그리드를 8개 영역으로 나누기
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (r < 4 && c < 4) map[r][c] = 0;
        else if (r < 4 && c >= 4) map[r][c] = 1;
        else if (r >= 4 && c < 4) map[r][c] = 2;
        else map[r][c] = 3;
        
        if (r < 2 && c < 2) map[r][c] = 4;
        else if (r < 2 && c >= 6) map[r][c] = 5;
        else if (r >= 6 && c < 2) map[r][c] = 6;
        else if (r >= 6 && c >= 6) map[r][c] = 7;
      }
    }
    
    // 간단한 해 생성 (각 영역에 퀸 하나씩)
    const solution = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    const queenPositions = [
      { r: 0, c: 0 }, { r: 0, c: 4 }, { r: 4, c: 0 }, { r: 4, c: 4 },
      { r: 1, c: 1 }, { r: 1, c: 6 }, { r: 6, c: 1 }, { r: 6, c: 6 }
    ];
    
    queenPositions.forEach(queen => {
      solution[queen.r][queen.c] = 2;
    });
    
    return { map, solution };
  }

  function generateConnectedRegions() {
    const map = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(-1));
    const regionSizes = [8, 8, 8, 8, 8, 8, 8, 8]; // 기본 크기
    
    // 시작점들을 균등하게 분산
    const startingPoints = [
      { r: 1, c: 1 }, { r: 1, c: 6 }, { r: 3, c: 0 }, { r: 3, c: 7 },
      { r: 6, c: 1 }, { r: 6, c: 6 }, { r: 4, c: 3 }, { r: 0, c: 4 }
    ];
    
    // 각 영역을 시드에서 시작하여 확장
    for (let regionId = 0; regionId < BOARD_SIZE; regionId++) {
      const startPoint = startingPoints[regionId % startingPoints.length];
      
      // 시작점 찾기 (이미 할당된 곳이면 가까운 빈 곳 찾기)
      const actualStart = findNearestEmptyCell(map, startPoint.r, startPoint.c);
      if (!actualStart) continue;
      
      map[actualStart.r][actualStart.c] = regionId;
      
      // 지정된 크기만큼 영역 확장
      const targetSize = regionSizes[regionId];
      growRegionToSize(map, actualStart.r, actualStart.c, regionId, targetSize);
    }
    
    // 모든 칸이 할당되었는지 확인하고 빈 칸이 있으면 가장 가까운 영역에 할당
    fillRemainingCells(map);
    
    return map;
  }

  function getRegionSizes(difficulty) {
    if (difficulty === 'easy') {
      return [6, 6, 8, 8, 9, 9, 8, 10]; // 총 64칸
    } else if (difficulty === 'medium') {
      return [5, 7, 8, 8, 9, 9, 9, 9]; // 총 64칸
    } else { // hard
      return [4, 6, 7, 8, 8, 9, 10, 12]; // 총 64칸
    }
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

  function findNearestEmptyCell(map, targetR, targetC) {
    // BFS로 가장 가까운 빈 칸 찾기
    const queue = [{ r: targetR, c: targetC, dist: 0 }];
    const visited = new Set();
    
    while (queue.length > 0) {
      const { r, c, dist } = queue.shift();
      const key = `${r}-${c}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      if (!isValid(r, c)) continue;
      if (map[r][c] === -1) return { r, c };
      
      // 인접 칸들을 큐에 추가
      const neighbors = [
        { r: r-1, c: c }, { r: r+1, c: c },
        { r: r, c: c-1 }, { r: r, c: c+1 }
      ];
      
      for (const neighbor of neighbors) {
        if (!visited.has(`${neighbor.r}-${neighbor.c}`)) {
          queue.push({ ...neighbor, dist: dist + 1 });
        }
      }
    }
    
    return null;
  }

  function growRegionToSize(map, startR, startC, regionId, targetSize) {
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

  function fillRemainingCells(map) {
    // 아직 할당되지 않은 칸들을 가장 가까운 영역에 할당
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (map[r][c] === -1) {
          // 가장 가까운 할당된 영역을 찾기
          let nearestRegion = findNearestRegion(map, r, c);
          if (nearestRegion !== -1) {
            map[r][c] = nearestRegion;
          }
        }
      }
    }
  }

  function findNearestRegion(map, targetR, targetC) {
    // BFS로 가장 가까운 할당된 영역 찾기
    const queue = [{ r: targetR, c: targetC, dist: 0 }];
    const visited = new Set();
    
    while (queue.length > 0) {
      const { r, c, dist } = queue.shift();
      const key = `${r}-${c}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      if (!isValid(r, c)) continue;
      if (map[r][c] !== -1) return map[r][c];
      
      // 인접 칸들을 큐에 추가
      const neighbors = [
        { r: r-1, c: c }, { r: r+1, c: c },
        { r: r, c: c-1 }, { r: r, c: c+1 }
      ];
      
      for (const neighbor of neighbors) {
        if (!visited.has(`${neighbor.r}-${neighbor.c}`)) {
          queue.push({ ...neighbor, dist: dist + 1 });
        }
      }
    }
    
    return 0; // 기본값으로 첫 번째 영역 반환
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
      const sizes = [2, 2, 3, 3, 4, 5, 6];
      return sizes[regionId];
    } else { // hard
      const sizes = [2, 3, 4, 5, 6, 7, 7];
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

  function renderBoard(animation = true) {
    boardElement.innerHTML = '';
    boardElement.className = `w-full grid grid-cols-${BOARD_SIZE} bg-white cursor-pointer select-none rounded-lg`;
    
    // 동적으로 그리드 컬럼 수 설정
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, minmax(0, 1fr))`;
    
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
        // 보드 크기에 따라 텍스트 크기 조정
        const textSize = BOARD_SIZE <= 8 ? 'text-3xl md:text-4xl' : 
                        BOARD_SIZE <= 10 ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl';
        content.className = `transition-all duration-300 absolute inset-0 flex items-center justify-center text-black ${textSize}`;

        cell.appendChild(content);
        boardElement.appendChild(cell);
        updateCellDOM(r, c, animation);
      }
    }
  }

  function updateCellDOM(r, c, animation = true) {
    const cell = boardElement.querySelector(`[data-r='${r}'][data-c='${c}']`);
    if (cell) {
      const content = cell.firstChild;
      content.classList.remove('material-symbols-outlined');
      if (boardState[r][c] === 1) {
        content.textContent = xIconName;
        if (animation) {
          content.animate([
            {
              fontSize: '0',
            },
            {
              fontSize: '32px',
            }
          ], {
            duration: 100,
            easing: 'ease-out',
          });
        }
      } else if (boardState[r][c] === 2) {
        if (animation) {
          content.animate([
            {
              fontSize: '32px',
            },
            {
              fontSize: '0',
            },
            {
              fontSize: '32px',
            }
          ], {
            duration: 200,
            easing: 'linear',
          });
          setTimeout(() => {
            content.textContent = queenIconName;
          }, 150)
        } else {
          content.textContent = queenIconName;
        }
      } else if (boardState[r][c] === 0) {
        if (animation) {
          content.animate([
            {
              fontSize: '32px',
            },
            {
              fontSize: '0',
            },
          ], {
            duration: 100,
            easing: 'linear',
          });
          setTimeout(() => {
            content.textContent = '';
          }, 150)
        } else {
          content.textContent = '';
        }
      }
      content.classList.add('material-symbols-outlined');
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
      renderBoard(false);
      validateAndHighlight();
      updateUndoButton();
    }
  }

  function updateUndoButton() {
    undoBtn.disabled = history.length <= 1 && !isGameFinished;
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
    boardElement.style.opacity = '0.5';

    hintBtn.disabled = true;
    resetBtn.disabled = true;
    undoBtn.disabled = true;
    
    return true;
  }

  function saveRecord() {
    const records = JSON.parse(localStorage.getItem('queensRecords')) || [];
    const newRecord = { 
      date: new Date().toISOString(), 
      time: seconds, 
      hints: hintCount,
      boardState: boardState, 
      regionMap: regionMap,
      difficulty: currentDifficulty,
      solutionCount: solutionCount,
      boardSize: BOARD_SIZE
    };
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
      const recordBoardSize = record.boardSize || 8;
      let miniBoardHTML = `<div class="grid w-24 h-24 border border-gray-400" style="grid-template-columns: repeat(${recordBoardSize}, minmax(0, 1fr));">`;
      for (let r = 0; r < recordBoardSize; r++) {
        for (let c = 0; c < recordBoardSize; c++) {
          const regionId = record.regionMap[r][c];
          const colorClass = mediumColors[regionId % mediumColors.length];
          const hasQueen = record.boardState[r][c] === 2;
          const dotSize = recordBoardSize <= 8 ? 'w-1.5 h-1.5' : recordBoardSize <= 10 ? 'w-1 h-1' : 'w-0.5 h-0.5';
          miniBoardHTML += `<div class="${colorClass} relative flex items-center justify-center">${hasQueen ? `<div class="${dotSize} bg-black rounded-full"></div>` : ''}</div>`;
        }
      }
      miniBoardHTML += '</div>';
      const difficultyText = record.difficulty === 'easy' ? '쉬움' : 
                           record.difficulty === 'medium' ? '보통' : 
                           record.difficulty === 'hard' ? '어려움' : '보통'; // 기본값
      const solutionCountText = record.solutionCount ? ` (해: ${record.solutionCount}개)` : '';
      const boardSizeText = record.boardSize ? ` • ${record.boardSize}x${record.boardSize}` : '';
      recordEl.innerHTML = `${miniBoardHTML}
        <div class="flex-grow">
          <p class="font-bold text-lg">${min}:${sec}</p>
          <p class="text-sm text-gray-500">${dateString}</p>
          <p class="text-xs text-gray-500 mt-1">힌트: ${record.hints || 0}회 • ${difficultyText}${solutionCountText}${boardSizeText}</p>
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

  function canPlaceQueenHere(r, c) {
    return solutionBoard[r][c] === 2;
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

  // 로딩 관련 함수들
  function showLoading() {
    loadingOverlay.classList.remove('hidden');
    setLoadingProgress(0, '영역 패턴을 생성하고 있어요');
  }

  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  function setLoadingProgress(percentage, status) {
    loadingProgress.style.width = `${percentage}%`;
    loadingPercentage.textContent = `${Math.round(percentage)}%`;
    loadingStatus.textContent = status;
  }

  // 설정 관련 함수들
  function updateBoardSizeButtons() {
    boardSizeBtns.forEach(btn => {
      if (parseInt(btn.dataset.size) === pendingBoardSize) {
        btn.className = 'board-size-btn bg-blue-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition';
      } else {
        btn.className = 'board-size-btn bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 transition';
      }
    });
  }

  async function applyBoardSizeChange() {
    settingsModal.classList.add('hidden');
    
    if (pendingBoardSize !== BOARD_SIZE) {
      BOARD_SIZE = pendingBoardSize;
      
      // localStorage에 설정 저장
      // localStorage.setItem('queensBoardSize', BOARD_SIZE.toString());
      
      // 새 게임 시작
      await initGame();
    }
  }

  // 설정 로드
  function loadSettings() {
    // const savedBoardSize = localStorage.getItem('queensBoardSize');
    // if (savedBoardSize) {
    //   BOARD_SIZE = parseInt(savedBoardSize);
    //   pendingBoardSize = BOARD_SIZE;
    // }
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
  undoBtn.addEventListener('click', undo);
  hintBtn.addEventListener('click', showHint);
  rulesBtn.addEventListener('click', () => rulesModal.classList.remove('hidden'));
  closeRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));
  
  // 설정 모달 이벤트 리스너
  settingsBtn.addEventListener('click', () => {
    pendingBoardSize = BOARD_SIZE;
    updateBoardSizeButtons();
    settingsModal.classList.remove('hidden');
  });
  closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  applySettingsBtn.addEventListener('click', applyBoardSizeChange);

  // 보드 크기 버튼 이벤트 리스너
  boardSizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pendingBoardSize = parseInt(btn.dataset.size);
      updateBoardSizeButtons();
    });
  });

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

  // 설정 로드 후 게임 초기화
  loadSettings();
  initGame().catch(console.error);
});