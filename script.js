// Elementos DOM
const imageSelectionScreen = document.getElementById('imageSelectionScreen');
const gameScreen = document.getElementById('gameScreen');
const imageUpload = document.getElementById('imageUpload');
const imageGallery = document.getElementById('imageGallery');
const galleryEmpty = document.getElementById('galleryEmpty');
const puzzleCanvas = document.getElementById('puzzleCanvas');
const piecesContainer = document.getElementById('piecesContainer');
const difficultySelect = document.getElementById('difficulty');
const restartBtn = document.getElementById('restartBtn');
const backBtn = document.getElementById('backBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progress');
const victoryModal = document.getElementById('victoryModal');
const playAgainBtn = document.getElementById('playAgainBtn');
const changeImageBtn = document.getElementById('changeImageBtn');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Estado do jogo
let currentImage = null;
let gridSize = 4;
let pieces = [];
let placedPieces = 0;
let imageToDelete = null;

// Constantes
const STORAGE_KEY = 'puzzleGameImages';
const SNAP_THRESHOLD = 30;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    imageUpload.addEventListener('change', handleImageUpload);
    restartBtn.addEventListener('click', resetGame);
    backBtn.addEventListener('click', showImageSelection);
    difficultySelect.addEventListener('change', handleDifficultyChange);
    playAgainBtn.addEventListener('click', resetGame);
    changeImageBtn.addEventListener('click', showImageSelection);
    confirmDeleteBtn.addEventListener('click', confirmDelete);
    cancelDeleteBtn.addEventListener('click', cancelDelete);
}

// Gerenciamento de Imagens
function handleImageUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            saveImage(event.target.result);
            loadGallery();
        };
        reader.readAsDataURL(file);
    });

    e.target.value = '';
}

function saveImage(imageData) {
    const images = getStoredImages();
    images.push({
        id: Date.now() + Math.random(),
        data: imageData,
        timestamp: Date.now()
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
}

function getStoredImages() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function loadGallery() {
    const images = getStoredImages();
    imageGallery.innerHTML = '';

    if (images.length === 0) {
        galleryEmpty.style.display = 'block';
    } else {
        galleryEmpty.style.display = 'none';
        images.forEach(img => {
            const item = createGalleryItem(img);
            imageGallery.appendChild(item);
        });
    }
}

function createGalleryItem(img) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.innerHTML = `
        <img src="${img.data}" alt="Puzzle Image">
        <button class="delete-btn" data-id="${img.id}">×</button>
    `;

    div.querySelector('img').addEventListener('click', () => selectImage(img.data));
    div.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        requestDelete(img.id);
    });

    return div;
}

function selectImage(imageData) {
    currentImage = imageData;
    showGameScreen();
    initGame();
}

function requestDelete(imageId) {
    imageToDelete = imageId;
    deleteModal.classList.add('active');
}

function confirmDelete() {
    if (imageToDelete) {
        const images = getStoredImages();
        const filtered = images.filter(img => img.id !== imageToDelete);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        loadGallery();
        imageToDelete = null;
    }
    deleteModal.classList.remove('active');
}

function cancelDelete() {
    imageToDelete = null;
    deleteModal.classList.remove('active');
}

// Navegação entre telas
function showImageSelection() {
    imageSelectionScreen.classList.add('active');
    gameScreen.classList.remove('active');
    victoryModal.classList.remove('active');
}

function showGameScreen() {
    imageSelectionScreen.classList.remove('active');
    gameScreen.classList.add('active');
}

// Lógica do Jogo
function handleDifficultyChange() {
    if (currentImage) {
        initGame();
    }
}

function initGame() {
    gridSize = parseInt(difficultySelect.value);
    placedPieces = 0;
    pieces = [];
    piecesContainer.innerHTML = '';
    updateProgress();

    const img = new Image();
    img.onload = () => {
        setupCanvas(img);
        createPuzzlePieces(img);
    };
    img.src = currentImage;
}

function setupCanvas(img) {
    const maxWidth = Math.min(800, window.innerWidth - 100);
    const maxHeight = window.innerHeight * 0.7;

    let width = img.width;
    let height = img.height;

    const aspectRatio = width / height;

    if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
    }

    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }

    puzzleCanvas.width = width;
    puzzleCanvas.height = height;

    const ctx = puzzleCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // Desenhar grid de referência
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;

    const pieceWidth = width / gridSize;
    const pieceHeight = height / gridSize;

    for (let i = 1; i < gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * pieceWidth, 0);
        ctx.lineTo(i * pieceWidth, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * pieceHeight);
        ctx.lineTo(width, i * pieceHeight);
        ctx.stroke();
    }
}

function createPuzzlePieces(img) {
    const pieceWidth = puzzleCanvas.width / gridSize;
    const pieceHeight = puzzleCanvas.height / gridSize;

    const canvasRect = puzzleCanvas.getBoundingClientRect();
    const containerRect = piecesContainer.getBoundingClientRect();

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const piece = createPiece(img, col, row, pieceWidth, pieceHeight, canvasRect, containerRect);
            pieces.push(piece);
            piecesContainer.appendChild(piece.element);
        }
    }

    shufflePieces();
}

function createPiece(img, col, row, width, height, canvasRect, containerRect) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    const sourceX = (col * img.width) / gridSize;
    const sourceY = (row * img.height) / gridSize;
    const sourceWidth = img.width / gridSize;
    const sourceHeight = img.height / gridSize;

    ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, width, height
    );

    const element = document.createElement('div');
    element.className = 'puzzle-piece';
    element.style.width = width + 'px';
    element.style.height = height + 'px';
    element.style.backgroundImage = `url(${canvas.toDataURL()})`;
    element.style.backgroundSize = 'cover';

    const correctX = canvasRect.left - containerRect.left + (col * width);
    const correctY = canvasRect.top - containerRect.top + (row * height);

    const piece = {
        element,
        col,
        row,
        correctX,
        correctY,
        currentX: 0,
        currentY: 0,
        placed: false,
        isDragging: false,
        offsetX: 0,
        offsetY: 0
    };

    setupDragHandlers(piece);

    return piece;
}

function shufflePieces() {
    const containerRect = piecesContainer.getBoundingClientRect();
    const canvasRect = puzzleCanvas.getBoundingClientRect();

    const shuffleZone = {
        minX: 20,
        maxX: containerRect.width - 100,
        minY: canvasRect.bottom - containerRect.top + 30,
        maxY: containerRect.height - 100
    };

    pieces.forEach((piece, index) => {
        const x = shuffleZone.minX + Math.random() * (shuffleZone.maxX - shuffleZone.minX);
        const y = shuffleZone.minY + Math.random() * (shuffleZone.maxY - shuffleZone.minY);

        piece.currentX = x;
        piece.currentY = y;
        piece.element.style.left = x + 'px';
        piece.element.style.top = y + 'px';
        piece.element.style.zIndex = index;
    });
}

function setupDragHandlers(piece) {
    const element = piece.element;

    const onMouseDown = (e) => {
        if (piece.placed) return;

        e.preventDefault();
        piece.isDragging = true;

        const rect = element.getBoundingClientRect();
        const containerRect = piecesContainer.getBoundingClientRect();

        piece.offsetX = e.clientX - rect.left;
        piece.offsetY = e.clientY - rect.top;

        element.style.zIndex = 1000;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
        if (!piece.isDragging) return;

        const containerRect = piecesContainer.getBoundingClientRect();

        piece.currentX = e.clientX - containerRect.left - piece.offsetX;
        piece.currentY = e.clientY - containerRect.top - piece.offsetY;

        element.style.left = piece.currentX + 'px';
        element.style.top = piece.currentY + 'px';
    };

    const onMouseUp = () => {
        if (!piece.isDragging) return;

        piece.isDragging = false;
        checkPlacement(piece);

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    // Touch events
    const onTouchStart = (e) => {
        if (piece.placed) return;

        e.preventDefault();
        piece.isDragging = true;

        const touch = e.touches[0];
        const rect = element.getBoundingClientRect();

        piece.offsetX = touch.clientX - rect.left;
        piece.offsetY = touch.clientY - rect.top;

        element.style.zIndex = 1000;

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    };

    const onTouchMove = (e) => {
        if (!piece.isDragging) return;

        e.preventDefault();
        const touch = e.touches[0];
        const containerRect = piecesContainer.getBoundingClientRect();

        piece.currentX = touch.clientX - containerRect.left - piece.offsetX;
        piece.currentY = touch.clientY - containerRect.top - piece.offsetY;

        element.style.left = piece.currentX + 'px';
        element.style.top = piece.currentY + 'px';
    };

    const onTouchEnd = () => {
        if (!piece.isDragging) return;

        piece.isDragging = false;
        checkPlacement(piece);

        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    };

    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('touchstart', onTouchStart, { passive: false });
}

function checkPlacement(piece) {
    const dx = Math.abs(piece.currentX - piece.correctX);
    const dy = Math.abs(piece.currentY - piece.correctY);

    if (dx < SNAP_THRESHOLD && dy < SNAP_THRESHOLD) {
        // Snap to correct position
        piece.currentX = piece.correctX;
        piece.currentY = piece.correctY;
        piece.element.style.left = piece.correctX + 'px';
        piece.element.style.top = piece.correctY + 'px';
        piece.element.classList.add('placed', 'locked');
        piece.placed = true;

        placedPieces++;
        updateProgress();

        if (placedPieces === pieces.length) {
            setTimeout(showVictory, 500);
        }
    }
}

function updateProgress() {
    const percentage = Math.round((placedPieces / pieces.length) * 100);
    progressFill.style.width = percentage + '%';
    progressText.textContent = percentage + '%';
}

function showVictory() {
    victoryModal.classList.add('active');

    // Completar a imagem no canvas
    const ctx = puzzleCanvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, puzzleCanvas.width, puzzleCanvas.height);
    };
    img.src = currentImage;

    // Ocultar peças
    piecesContainer.style.display = 'none';

    setTimeout(() => {
        piecesContainer.style.display = 'block';
    }, 3000);
}

function resetGame() {
    victoryModal.classList.remove('active');
    if (currentImage) {
        initGame();
    }
}

// Adicionar alguns exemplos de imagens default se não houver nenhuma
function addDefaultImages() {
    const images = getStoredImages();
    if (images.length === 0) {
        // Criar uma imagem de exemplo usando canvas
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 600, 400);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 600, 400);

        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Exemplo de Puzzle', 300, 200);

        saveImage(canvas.toDataURL());
        loadGallery();
    }
}

// Chamar na inicialização
addDefaultImages();
