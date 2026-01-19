// ============================================
// CONFIGURAÇÕES GLOBAIS
// ============================================

const CONFIG = {
    snapThreshold: 30,
    storageKey: 'puzzleGameImages',
    // Imagens iniciais (opcional)
    // Adicione suas imagens locais ou URLs aqui:
    initialImages: [
        {
             id: 'dino-1',
             name: 'T-Rex',
             url: './images/trex.jpeg',
             isLocal: true
        },
        {
             id: 'dino-2',
             name: 'Anquilossauro',
             url: './images/anquilo.jpeg',
             isLocal: true
        },
        // EXEMPLO DE IMAGEM LOCAL:
        // {
        //     id: 'local-1',
        //     name: 'Dinossauro T-Rex',
        //     url: './images/dinossauro.jpg',
        //     isLocal: true
        // },
        // EXEMPLO DE IMAGEM ONLINE:
        // {
        //     id: 'online-1',
        //     name: 'Paisagem',
        //     url: 'https://exemplo.com/imagem.jpg',
        //     isLocal: false
        // }
    ]
};

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

// Elementos DOM
let imageSelectionScreen, gameScreen;
let imageGallery, galleryEmpty;
let canvas, ctx, piecesContainer;

// Estado do jogo
let userImages = []; // Array de imagens do usuário
let currentImage = null; // Imagem selecionada para o jogo
let image = new Image();
let pieces = [];
let groups = [];
let gridSize = 4;
let pieceWidth, pieceHeight;
let draggedPiece = null;
let offsetX = 0, offsetY = 0;
let completedPieces = 0;
let imageToDelete = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeElements();
    await loadImagesFromStorage();
    setupEventListeners();
    showImageSelectionScreen();
});

function initializeElements() {
    imageSelectionScreen = document.getElementById('imageSelectionScreen');
    gameScreen = document.getElementById('gameScreen');
    imageGallery = document.getElementById('imageGallery');
    galleryEmpty = document.getElementById('galleryEmpty');
    canvas = document.getElementById('puzzleCanvas');
    ctx = canvas.getContext('2d');
    piecesContainer = document.getElementById('piecesContainer');
}

function setupEventListeners() {
    // Upload de imagens
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    
    // Controles do jogo
    document.getElementById('backBtn').addEventListener('click', showImageSelectionScreen);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('difficulty').addEventListener('change', (e) => {
        gridSize = parseInt(e.target.value);
        restartGame();
    });
    
    // Modais
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        closeModal('victoryModal');
        restartGame();
    });
    document.getElementById('changeImageBtn').addEventListener('click', () => {
        closeModal('victoryModal');
        showImageSelectionScreen();
    });
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => closeModal('deleteModal'));
    
    // Redimensionamento
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (pieces.length > 0 && gameScreen.classList.contains('active')) {
                restartGame();
            }
        }, 500);
    });
}

// ============================================
// GERENCIAMENTO DE IMAGENS
// ============================================

async function loadImagesFromStorage() {
    const stored = localStorage.getItem(CONFIG.storageKey);
    if (stored) {
        try {
            userImages = JSON.parse(stored);
        } catch (e) {
            console.error('Erro ao carregar imagens:', e);
            userImages = [];
        }
    }
    
    // Mostrar mensagem de carregamento se houver imagens iniciais
    if (CONFIG.initialImages.length > 0) {
        galleryEmpty.textContent = 'Carregando imagens...';
        galleryEmpty.classList.remove('hidden');
    }
    
    // Carregar imagens iniciais configuradas no código (se houver)
    await loadInitialImages();
    renderGallery();
}

async function loadInitialImages() {
    // Apenas carregar se houver imagens configuradas
    if (CONFIG.initialImages.length === 0) return;
    
    let loadedCount = 0;
    let failedImages = [];
    
    for (const initialImg of CONFIG.initialImages) {
        // Verificar se já existe (evitar duplicatas)
        const exists = userImages.some(img => img.id === initialImg.id);
        if (!exists) {
            try {
                console.log(`Carregando: ${initialImg.name}...`);
                
                // Para imagens locais, usar FileReader se possível, senão usar URL direta
                let imageData;
                
                if (initialImg.isLocal) {
                    // Para imagens locais, usar a URL diretamente sem converter para base64
                    // Isso evita o problema "Tainted canvas"
                    imageData = await loadLocalImageAsDataURL(initialImg.url);
                } else {
                    // Para URLs externas, tentar converter para base64
                    imageData = await urlToBase64(initialImg.url, false);
                }
                
                userImages.push({
                    id: initialImg.id,
                    data: imageData,
                    name: initialImg.name,
                    timestamp: new Date().toISOString(),
                    isInitial: true
                });
                loadedCount++;
                console.log(`✓ ${initialImg.name} carregada com sucesso`);
            } catch (error) {
                console.error(`✗ Erro ao carregar ${initialImg.name}:`, error);
                failedImages.push(initialImg.name);
            }
        }
    }
    
    // Salvar todas as imagens (incluindo iniciais)
    if (loadedCount > 0) {
        saveImagesToStorage();
        console.log(`${loadedCount} imagem(ns) carregada(s) com sucesso`);
    }
    
    if (failedImages.length > 0) {
        console.warn(`Não foi possível carregar: ${failedImages.join(', ')}`);
        console.warn('Verifique se os caminhos das imagens estão corretos e se os arquivos existem.');
    }
}

async function loadLocalImageAsDataURL(url) {
    return new Promise((resolve, reject) => {
        // Tentar carregar via fetch primeiro
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Arquivo não encontrado');
                return response.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                reject(error);
            });
    });
}

async function urlToBase64(url, isLocal = false) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        // Para imagens locais, não precisa crossOrigin
        if (!isLocal) {
            img.crossOrigin = 'anonymous';
        }
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            try {
                const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                resolve(dataURL);
            } catch (e) {
                reject(e);
            }
        };
        
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
        img.src = url;
    });
}

function saveImagesToStorage() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(userImages));
}

function handleImageUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = {
                    id: Date.now() + Math.random(),
                    data: event.target.result,
                    name: file.name,
                    timestamp: new Date().toISOString()
                };
                userImages.push(imageData);
                saveImagesToStorage();
                renderGallery();
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Limpar input
    e.target.value = '';
}

function renderGallery() {
    imageGallery.innerHTML = '';
    
    if (userImages.length === 0) {
        galleryEmpty.classList.remove('hidden');
        return;
    }
    
    galleryEmpty.classList.add('hidden');
    
    userImages.forEach(img => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        const imgElement = document.createElement('img');
        imgElement.src = img.data;
        imgElement.alt = img.name;
        
        const overlay = document.createElement('div');
        overlay.className = 'gallery-item-overlay';
        
        const actions = document.createElement('div');
        actions.className = 'gallery-item-actions';
        
        const playBtn = document.createElement('button');
        playBtn.className = 'icon-btn';
        playBtn.textContent = '▶ Jogar';
        playBtn.onclick = (e) => {
            e.stopPropagation();
            selectImage(img);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete-btn';
        deleteBtn.textContent = '🗑 Excluir';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            showDeleteModal(img);
        };
        
        actions.appendChild(playBtn);
        actions.appendChild(deleteBtn);
        
        overlay.appendChild(actions);
        
        item.appendChild(imgElement);
        item.appendChild(overlay);
        
        // Click na imagem também seleciona
        item.onclick = () => selectImage(img);
        
        imageGallery.appendChild(item);
    });
}

function selectImage(img) {
    currentImage = img;
    image.onload = () => {
        showGameScreen();
        initGame();
    };
    image.src = img.data;
}

function showDeleteModal(img) {
    imageToDelete = img;
    document.getElementById('deleteModal').classList.add('show');
}

function confirmDelete() {
    if (imageToDelete) {
        userImages = userImages.filter(img => img.id !== imageToDelete.id);
        saveImagesToStorage();
        renderGallery();
        imageToDelete = null;
    }
    closeModal('deleteModal');
}

// ============================================
// NAVEGAÇÃO ENTRE TELAS
// ============================================

function showImageSelectionScreen() {
    imageSelectionScreen.classList.add('active');
    gameScreen.classList.remove('active');
    
    // Limpar jogo
    pieces = [];
    groups = [];
    piecesContainer.innerHTML = '';
}

function showGameScreen() {
    imageSelectionScreen.classList.remove('active');
    gameScreen.classList.add('active');
}

// ============================================
// INICIALIZAR JOGO
// ============================================

function initGame() {
    // Limpar peças anteriores
    pieces = [];
    groups = [];
    piecesContainer.innerHTML = '';
    completedPieces = 0;
    updateProgress();
    
    // Configurar canvas
    const containerRect = piecesContainer.getBoundingClientRect();
    const aspectRatio = image.width / image.height;
    
    let canvasWidth = Math.min(containerRect.width * 0.6, image.width);
    let canvasHeight = canvasWidth / aspectRatio;
    
    if (canvasHeight > containerRect.height * 0.6) {
        canvasHeight = containerRect.height * 0.6;
        canvasWidth = canvasHeight * aspectRatio;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    pieceWidth = canvasWidth / gridSize;
    pieceHeight = canvasHeight / gridSize;
    
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
    
    createPuzzlePieces();
    shufflePieces();
}

// ============================================
// CRIAR PEÇAS DO PUZZLE
// ============================================

function createPuzzlePieces() {
    // Gerar configuração de tabs/slots para todas as conexões
    // Horizontal connections (between columns)
    const horizontalConnections = [];
    for (let row = 0; row < gridSize; row++) {
        horizontalConnections[row] = [];
        for (let col = 0; col < gridSize - 1; col++) {
            // true = tab na esquerda, slot na direita
            // false = slot na esquerda, tab na direita
            horizontalConnections[row][col] = Math.random() > 0.5;
        }
    }
    
    // Vertical connections (between rows)
    const verticalConnections = [];
    for (let row = 0; row < gridSize - 1; row++) {
        verticalConnections[row] = [];
        for (let col = 0; col < gridSize; col++) {
            // true = tab em cima, slot embaixo
            // false = slot em cima, tab embaixo
            verticalConnections[row][col] = Math.random() > 0.5;
        }
    }
    
    // Criar peças com configuração compatível
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const piece = {
                id: row * gridSize + col,
                row: row,
                col: col,
                correctX: col * pieceWidth,
                correctY: row * pieceHeight,
                currentX: 0,
                currentY: 0,
                groupId: row * gridSize + col,
                element: null,
                locked: false,
                tabs: {
                    top: null,
                    right: null,
                    bottom: null,
                    left: null
                }
            };
            
            // Definir tabs baseado nas conexões
            // Top
            if (row > 0) {
                piece.tabs.top = !verticalConnections[row - 1][col];
            }
            
            // Right
            if (col < gridSize - 1) {
                piece.tabs.right = horizontalConnections[row][col];
            }
            
            // Bottom
            if (row < gridSize - 1) {
                piece.tabs.bottom = verticalConnections[row][col];
            }
            
            // Left
            if (col > 0) {
                piece.tabs.left = !horizontalConnections[row][col - 1];
            }
            
            pieces.push(piece);
            groups.push([piece.id]);
        }
    }
    
    // Criar elementos visuais
    pieces.forEach(piece => {
        piece.element = createPieceElement(piece);
        piecesContainer.appendChild(piece.element);
    });
}

function createPieceElement(piece) {
    // SISTEMA DE COORDENADAS:
    // - piece.currentX/Y: posição lógica (centro da peça, onde seria sem saliências)
    // - piece.offset: tamanho da margem extra para as saliências
    // - Posição visual = currentX/Y - offset (para compensar as saliências)
    
    // Calcular tamanho do canvas com margem para as saliências
    const tabSize = Math.min(pieceWidth, pieceHeight) * 0.15; // 15% do tamanho da peça
    const canvasWidth = pieceWidth + tabSize * 2;
    const canvasHeight = pieceHeight + tabSize * 2;
    
    const pieceCanvas = document.createElement('canvas');
    pieceCanvas.width = canvasWidth;
    pieceCanvas.height = canvasHeight;
    const pieceCtx = pieceCanvas.getContext('2d');
    
    // Offset para centralizar a peça no canvas
    const offset = tabSize;
    
    // Armazenar offset na peça
    piece.offset = offset;
    piece.canvasWidth = canvasWidth;
    piece.canvasHeight = canvasHeight;
    
    // Função auxiliar para desenhar um lado com tab ou slot
    function drawSide(ctx, side, hasTab) {
        const tabWidth = 0.2; // 20% do lado
        const tabHeight = tabSize;
        const cornerRadius = Math.min(pieceWidth, pieceHeight) * 0.05; // 5% para cantos arredondados
        
        switch(side) {
            case 'top':
                if (hasTab === null) {
                    // Borda reta com canto arredondado
                    ctx.arcTo(offset + pieceWidth, offset, offset + pieceWidth, offset + cornerRadius, cornerRadius);
                } else if (hasTab) {
                    // Tab para cima
                    ctx.lineTo(offset + pieceWidth * (0.5 - tabWidth), offset);
                    ctx.bezierCurveTo(
                        offset + pieceWidth * (0.5 - tabWidth * 0.5), offset - tabHeight * 0.2,
                        offset + pieceWidth * (0.5 - tabWidth * 0.5), offset - tabHeight * 0.8,
                        offset + pieceWidth * 0.5, offset - tabHeight
                    );
                    ctx.bezierCurveTo(
                        offset + pieceWidth * (0.5 + tabWidth * 0.5), offset - tabHeight * 0.8,
                        offset + pieceWidth * (0.5 + tabWidth * 0.5), offset - tabHeight * 0.2,
                        offset + pieceWidth * (0.5 + tabWidth), offset
                    );
                    ctx.lineTo(offset + pieceWidth, offset);
                } else {
                    // Slot para baixo
                    ctx.lineTo(offset + pieceWidth * (0.5 - tabWidth), offset);
                    ctx.bezierCurveTo(
                        offset + pieceWidth * (0.5 - tabWidth * 0.5), offset + tabHeight * 0.2,
                        offset + pieceWidth * (0.5 - tabWidth * 0.5), offset + tabHeight * 0.8,
                        offset + pieceWidth * 0.5, offset + tabHeight
                    );
                    ctx.bezierCurveTo(
                        offset + pieceWidth * (0.5 + tabWidth * 0.5), offset + tabHeight * 0.8,
                        offset + pieceWidth * (0.5 + tabWidth * 0.5), offset + tabHeight * 0.2,
                        offset + pieceWidth * (0.5 + tabWidth), offset
                    );
                    ctx.lineTo(offset + pieceWidth, offset);
                }
                break;
                
            case 'right':
                if (hasTab === null) {
                    // Borda reta com canto arredondado
                    ctx.arcTo(offset + pieceWidth, offset + pieceHeight, offset + pieceWidth - cornerRadius, offset + pieceHeight, cornerRadius);
                } else if (hasTab) {
                    // Tab para direita
                    ctx.lineTo(offset + pieceWidth, offset + pieceHeight * (0.5 - tabWidth));
                    ctx.bezierCurveTo(
                        offset + pieceWidth + tabHeight * 0.2, offset + pieceHeight * (0.5 - tabWidth * 0.5),
                        offset + pieceWidth + tabHeight * 0.8, offset + pieceHeight * (0.5 - tabWidth * 0.5),
                        offset + pieceWidth + tabHeight, offset + pieceHeight * 0.5
                    );
                    ctx.bezierCurveTo(
                        offset + pieceWidth + tabHeight * 0.8, offset + pieceHeight * (0.5 + tabWidth * 0.5),
                        offset + pieceWidth + tabHeight * 0.2, offset + pieceHeight * (0.5 + tabWidth * 0.5),
                        offset + pieceWidth, offset + pieceHeight * (0.5 + tabWidth)
                    );
                    ctx.lineTo(offset + pieceWidth, offset + pieceHeight);
                } else {
                    // Slot para esquerda
                    ctx.lineTo(offset + pieceWidth, offset + pieceHeight * (0.5 - tabWidth));
                    ctx.bezierCurveTo(
                        offset + pieceWidth - tabHeight * 0.2, offset + pieceHeight * (0.5 - tabWidth * 0.5),
                        offset + pieceWidth - tabHeight * 0.8, offset + pieceHeight * (0.5 - tabWidth * 0.5),
                        offset + pieceWidth - tabHeight, offset + pieceHeight * 0.5
                    );
                    ctx.bezierCurveTo(
                        offset + pieceWidth - tabHeight * 0.8, offset + pieceHeight * (0.5 + tabWidth * 0.5),
                        offset + pieceWidth - tabHeight * 0.2, offset + pieceHeight * (0.5 + tabWidth * 0.5),
                        offset + pieceWidth, offset + pieceHeight * (0.5 + tabWidth)
                    );
                    ctx.lineTo(offset + pieceWidth, offset + pieceHeight);
                }
                break;
                
            case 'bottom':
                if (hasTab === null) {
                    // Borda reta com canto arredondado
                    ctx.arcTo(offset, offset + pieceHeight, offset, offset + pieceHeight - cornerRadius, cornerRadius);
                } else if (hasTab) {
                    // Tab para baixo
                    ctx.lineTo(offset + pieceWidth * (0.5 + tabWidth), offset + pieceHeight);
                    ctx.bezierCurveTo(
                        offset + pieceWidth * (0.5 + tabWidth * 0.5), offset + pieceHeight + tabHeight * 0.2,
                        offset + pieceWidth * (0.5 + tabWidth * 0.5), offset + pieceHeight + tabHeight * 0.8,
                        offset + pieceWidth * 0.5, offset + pieceHeight + tabHeight
                    );
                    ctx.bezierCurveTo(
                        offset + pieceWidth * (0.5 - tabWidth * 0.5), offset + pieceHeight + tabHeight * 0.8,
                        offset + pieceWidth * (0.5 - tabWidth * 0.5), offset + pieceHeight + tabHeight * 0.2,
                        offset + pieceWidth * (0.5 - tabWidth), offset + pieceHeight
                    );
                    ctx.lineTo(offset, offset + pieceHeight);
                } else {
                    // Slot para cima
                    ctx.lineTo(offset + pieceWidth * (0.5 + tabWidth), offset + pieceHeight);
                    ctx.bezierCurveTo(
                        offset + pieceWidth * (0.5 + tabWidth * 0.5), offset + pieceHeight - tabHeight * 0.2,
                        offset + pieceWidth * (0.5 + tabWidth * 0.5), offset + pieceHeight - tabHeight * 0.8,
                        offset + pieceWidth * 0.5, offset + pieceHeight - tabHeight
                    );
                    ctx.bezierCurveTo(
                        offset + pieceWidth * (0.5 - tabWidth * 0.5), offset + pieceHeight - tabHeight * 0.8,
                        offset + pieceWidth * (0.5 - tabWidth * 0.5), offset + pieceHeight - tabHeight * 0.2,
                        offset + pieceWidth * (0.5 - tabWidth), offset + pieceHeight
                    );
                    ctx.lineTo(offset, offset + pieceHeight);
                }
                break;
                
            case 'left':
                if (hasTab === null) {
                    // Borda reta com canto arredondado
                    ctx.arcTo(offset, offset, offset + cornerRadius, offset, cornerRadius);
                } else if (hasTab) {
                    // Tab para esquerda
                    ctx.lineTo(offset, offset + pieceHeight * (0.5 + tabWidth));
                    ctx.bezierCurveTo(
                        offset - tabHeight * 0.2, offset + pieceHeight * (0.5 + tabWidth * 0.5),
                        offset - tabHeight * 0.8, offset + pieceHeight * (0.5 + tabWidth * 0.5),
                        offset - tabHeight, offset + pieceHeight * 0.5
                    );
                    ctx.bezierCurveTo(
                        offset - tabHeight * 0.8, offset + pieceHeight * (0.5 - tabWidth * 0.5),
                        offset - tabHeight * 0.2, offset + pieceHeight * (0.5 - tabWidth * 0.5),
                        offset, offset + pieceHeight * (0.5 - tabWidth)
                    );
                    ctx.lineTo(offset, offset);
                } else {
                    // Slot para direita
                    ctx.lineTo(offset, offset + pieceHeight * (0.5 + tabWidth));
                    ctx.bezierCurveTo(
                        offset + tabHeight * 0.2, offset + pieceHeight * (0.5 + tabWidth * 0.5),
                        offset + tabHeight * 0.8, offset + pieceHeight * (0.5 + tabWidth * 0.5),
                        offset + tabHeight, offset + pieceHeight * 0.5
                    );
                    ctx.bezierCurveTo(
                        offset + tabHeight * 0.8, offset + pieceHeight * (0.5 - tabWidth * 0.5),
                        offset + tabHeight * 0.2, offset + pieceHeight * (0.5 - tabWidth * 0.5),
                        offset, offset + pieceHeight * (0.5 - tabWidth)
                    );
                    ctx.lineTo(offset, offset);
                }
                break;
        }
    }
    
    // Desenhar o caminho da peça
    pieceCtx.save();
    pieceCtx.beginPath();
    
    // Começar no canto superior esquerdo (considerando se há bordas externas)
    const cornerRadius = Math.min(pieceWidth, pieceHeight) * 0.05;
    if (piece.tabs.top === null && piece.tabs.left === null) {
        // Canto superior esquerdo é externo - começar com arredondamento
        pieceCtx.moveTo(offset + cornerRadius, offset);
    } else if (piece.tabs.left === null) {
        // Apenas lado esquerdo é externo
        pieceCtx.moveTo(offset, offset + cornerRadius);
    } else {
        // Nenhum lado externo neste canto
        pieceCtx.moveTo(offset, offset);
    }
    
    drawSide(pieceCtx, 'top', piece.tabs.top);
    drawSide(pieceCtx, 'right', piece.tabs.right);
    drawSide(pieceCtx, 'bottom', piece.tabs.bottom);
    drawSide(pieceCtx, 'left', piece.tabs.left);
    
    pieceCtx.closePath();
    pieceCtx.clip();
    
    // Desenhar a imagem recortada
    pieceCtx.drawImage(
        canvas,
        piece.col * pieceWidth, piece.row * pieceHeight, pieceWidth, pieceHeight,
        offset, offset, pieceWidth, pieceHeight
    );
    
    pieceCtx.restore();
    
    // Desenhar contorno
    pieceCtx.beginPath();
    const cornerRadius2 = Math.min(pieceWidth, pieceHeight) * 0.05;
    if (piece.tabs.top === null && piece.tabs.left === null) {
        pieceCtx.moveTo(offset + cornerRadius2, offset);
    } else if (piece.tabs.left === null) {
        pieceCtx.moveTo(offset, offset + cornerRadius2);
    } else {
        pieceCtx.moveTo(offset, offset);
    }
    
    drawSide(pieceCtx, 'top', piece.tabs.top);
    drawSide(pieceCtx, 'right', piece.tabs.right);
    drawSide(pieceCtx, 'bottom', piece.tabs.bottom);
    drawSide(pieceCtx, 'left', piece.tabs.left);
    
    pieceCtx.closePath();
    pieceCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    pieceCtx.lineWidth = 2.5;
    pieceCtx.stroke();
    
    // Adicionar uma linha interna mais clara para dar mais definição
    pieceCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    pieceCtx.lineWidth = 1;
    pieceCtx.stroke();
    
    // Criar elemento wrapper
    const div = document.createElement('div');
    div.className = 'puzzle-piece';
    div.style.width = canvasWidth + 'px';
    div.style.height = canvasHeight + 'px';
    div.appendChild(pieceCanvas);
    
    div.addEventListener('mousedown', (e) => startDrag(e, piece));
    div.addEventListener('touchstart', (e) => startDrag(e, piece), { passive: false });
    
    return div;
}

// ============================================
// EMBARALHAR PEÇAS
// ============================================

function shufflePieces() {
    const containerRect = piecesContainer.getBoundingClientRect();
    const padding = 40; // Padding maior para acomodar as saliências
    
    pieces.forEach(piece => {
        // Limites considerando o tamanho visual completo da peça (com saliências)
        const maxX = containerRect.width - pieceWidth - padding;
        const maxY = containerRect.height - pieceHeight - padding;
        
        // Posição lógica (centro da peça)
        piece.currentX = Math.random() * maxX + padding + piece.offset;
        piece.currentY = Math.random() * maxY + padding + piece.offset;
        
        updatePiecePosition(piece);
        piece.element.style.zIndex = Math.floor(Math.random() * 100);
    });
}

// ============================================
// ARRASTAR PEÇA
// ============================================

function startDrag(e, piece) {
    if (piece.locked) return;
    
    e.preventDefault();
    draggedPiece = piece;
    
    const groupPieces = getGroupPieces(piece.groupId);
    const maxZ = Math.max(...pieces.map(p => parseInt(p.element.style.zIndex) || 0));
    groupPieces.forEach(p => {
        p.element.style.zIndex = maxZ + 1;
        p.element.classList.add('dragging');
    });
    
    const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
    
    // Calcular offset em relação à posição lógica da peça (centro, sem saliências)
    offsetX = clientX - piece.currentX;
    offsetY = clientY - piece.currentY;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
}

function drag(e) {
    if (!draggedPiece) return;
    e.preventDefault();
    
    const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
    const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
    
    const newX = clientX - offsetX;
    const newY = clientY - offsetY;
    
    const deltaX = newX - draggedPiece.currentX;
    const deltaY = newY - draggedPiece.currentY;
    
    const groupPieces = getGroupPieces(draggedPiece.groupId);
    groupPieces.forEach(piece => {
        piece.currentX += deltaX;
        piece.currentY += deltaY;
        updatePiecePosition(piece);
    });
}

function stopDrag() {
    if (!draggedPiece) return;
    
    const groupPieces = getGroupPieces(draggedPiece.groupId);
    groupPieces.forEach(p => p.element.classList.remove('dragging'));
    
    checkSnapping(draggedPiece);
    draggedPiece = null;
    
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
}

// ============================================
// VERIFICAR ENCAIXE
// ============================================

function checkSnapping(piece) {
    const groupPieces = getGroupPieces(piece.groupId);
    
    groupPieces.forEach(p => {
        const neighbors = [
            { row: p.row - 1, col: p.col },
            { row: p.row + 1, col: p.col },
            { row: p.row, col: p.col - 1 },
            { row: p.row, col: p.col + 1 }
        ];
        
        neighbors.forEach(neighbor => {
            const neighborPiece = pieces.find(
                piece => piece.row === neighbor.row && piece.col === neighbor.col
            );
            
            if (neighborPiece && neighborPiece.groupId !== p.groupId) {
                // Calcular posições corretas relativas considerando o offset das saliências
                // A posição correta é baseada no centro da peça (excluindo saliências)
                const expectedX = p.currentX + (neighborPiece.col - p.col) * pieceWidth;
                const expectedY = p.currentY + (neighborPiece.row - p.row) * pieceHeight;
                
                const distance = Math.sqrt(
                    Math.pow(neighborPiece.currentX - expectedX, 2) +
                    Math.pow(neighborPiece.currentY - expectedY, 2)
                );
                
                if (distance < CONFIG.snapThreshold) {
                    snapPieces(p, neighborPiece);
                }
            }
        });
    });
    
    checkCompletion();
}

function snapPieces(piece1, piece2) {
    const deltaX = (piece2.col - piece1.col) * pieceWidth;
    const deltaY = (piece2.row - piece1.row) * pieceHeight;
    
    const group2Pieces = getGroupPieces(piece2.groupId);
    const offsetX = piece1.currentX + deltaX - piece2.currentX;
    const offsetY = piece1.currentY + deltaY - piece2.currentY;
    
    group2Pieces.forEach(p => {
        p.currentX += offsetX;
        p.currentY += offsetY;
        updatePiecePosition(p);
        p.element.classList.add('snapping');
        setTimeout(() => p.element.classList.remove('snapping'), 300);
    });
    
    mergeGroups(piece1.groupId, piece2.groupId);
    completedPieces++;
    updateProgress();
}

// ============================================
// UNIR GRUPOS
// ============================================

function mergeGroups(groupId1, groupId2) {
    const group1Index = groups.findIndex(g => g.includes(groupId1));
    const group2Index = groups.findIndex(g => g.includes(groupId2));
    
    if (group1Index !== -1 && group2Index !== -1 && group1Index !== group2Index) {
        const newGroup = [...groups[group1Index], ...groups[group2Index]];
        
        newGroup.forEach(pieceId => {
            const piece = pieces.find(p => p.id === pieceId);
            if (piece) piece.groupId = groupId1;
        });
        
        groups[group1Index] = newGroup;
        groups.splice(group2Index, 1);
    }
}

function getGroupPieces(groupId) {
    return pieces.filter(p => p.groupId === groupId);
}

function updatePiecePosition(piece) {
    // currentX e currentY representam a posição da parte central da peça (sem saliências)
    // Precisamos compensar o offset das saliências ao posicionar o elemento
    const visualX = piece.currentX - piece.offset;
    const visualY = piece.currentY - piece.offset;
    
    piece.element.style.left = visualX + 'px';
    piece.element.style.top = visualY + 'px';
}

// ============================================
// VERIFICAR CONCLUSÃO
// ============================================

function checkCompletion() {
    if (groups.length === 1) {
        const firstPiece = pieces[0];
        const tolerance = CONFIG.snapThreshold;
        
        // Verificar se todas as peças estão na posição correta relativa
        const isCorrectPosition = pieces.every(piece => {
            const expectedX = firstPiece.currentX + (piece.col - firstPiece.col) * pieceWidth;
            const expectedY = firstPiece.currentY + (piece.row - firstPiece.row) * pieceHeight;
            
            const distX = Math.abs(piece.currentX - expectedX);
            const distY = Math.abs(piece.currentY - expectedY);
            
            return distX < tolerance && distY < tolerance;
        });
        
        if (isCorrectPosition) {
            pieces.forEach(piece => {
                piece.locked = true;
                piece.element.classList.add('locked');
                piece.element.style.cursor = 'default';
            });
            
            setTimeout(() => showModal('victoryModal'), 500);
        }
    }
}

// ============================================
// ATUALIZAR PROGRESSO
// ============================================

function updateProgress() {
    const totalConnections = (gridSize * gridSize) - 1;
    const progress = Math.round((completedPieces / totalConnections) * 100);
    document.getElementById('progress').textContent = progress + '%';
    document.getElementById('progressFill').style.width = progress + '%';
}

// ============================================
// MODAIS
// ============================================

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ============================================
// REINICIAR JOGO
// ============================================

function restartGame() {
    closeModal('victoryModal');
    if (currentImage) {
        image.src = currentImage.data;
    }
}
