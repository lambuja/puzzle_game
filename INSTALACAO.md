# 📱 Guia de Instalação - PWA Offline

## O que é PWA?

Progressive Web App - funciona como aplicativo nativo, mas é acessado via navegador. **Funciona 100% offline após a primeira visita!**

---

## 🚀 Passo a Passo para Tablets Android

### 1️⃣ Hospedar no GitHub Pages (5 minutos)

1. **Criar conta GitHub:**
   - Acesse: https://github.com
   - Clique em "Sign up" (Criar conta)

2. **Criar repositório:**
   - Clique no "+" no canto superior → "New repository"
   - Nome: `puzzle-game`
   - Marque: ☑️ Public
   - Clique: "Create repository"

3. **Upload dos arquivos:**
   - Clique: "uploading an existing file"
   - Arraste TODOS os arquivos:
     - index.html
     - style.css
     - script.js
     - manifest.json
     - sw.js
     - icon-192.png
     - icon-512.png
   - Clique: "Commit changes"

4. **Ativar GitHub Pages:**
   - Vá em: Settings (⚙️)
   - Menu lateral: Pages
   - Source: Deploy from branch
   - Branch: main → (root) → Save
   - Aguarde 1-2 minutos
   - Aparecerá a URL: `https://seunome.github.io/puzzle-game`

### 2️⃣ Instalar no Tablet Android

1. **Primeira visita (com internet):**
   - Abra o Chrome no tablet
   - Acesse a URL do GitHub Pages
   - O jogo carrega e baixa tudo automaticamente
   - ✓ Agora está salvo no dispositivo!

2. **Instalar como App:**
   
   **Opção A - Banner automático:**
   - Chrome mostrará: "Adicionar Puzzle Game à tela inicial"
   - Toque em "Adicionar" ou "Instalar"
   
   **Opção B - Menu manual:**
   - Toque no menu ⋮ (3 pontinhos)
   - Selecione "Adicionar à tela inicial" ou "Instalar app"
   - Confirme

3. **Pronto!**
   - Ícone aparece na tela inicial
   - Abre em tela cheia (sem barra do navegador)
   - **Funciona offline completamente!**

---

## 📶 Modo Offline

### Como funciona:

1. **Primeira visita** (com internet):
   - Todos os arquivos são baixados e salvos
   - LocalStorage guarda suas imagens enviadas

2. **Próximas visitas** (sem internet):
   - Tudo funciona normalmente
   - Upload de novas imagens funciona
   - Imagens ficam salvas no dispositivo

### Limitações offline:

❌ **Não funciona sem internet:**
- Imagens de URLs externas em `initialImages`

✅ **Funciona offline:**
- Todo o jogo
- Imagens enviadas via upload
- Todas as funcionalidades principais

---

## 🔄 Atualizar o Jogo

Se você modificar o código:

1. Faça upload dos arquivos novos no GitHub
2. Altere a versão no `sw.js`:
   ```javascript
   const CACHE_NAME = 'puzzle-game-v2'; // v1 → v2
   ```
3. Nos tablets:
   - Abra o app com internet
   - Atualizará automaticamente
   - Continue usando offline

---

## 🎯 Resumo Rápido

```
1. GitHub → Upload arquivos → GitHub Pages
2. Tablet → Chrome → Acessar URL → Instalar
3. Usar offline sempre que quiser!
```

---

## ❓ Solução de Problemas

**"Não aparece opção de instalar"**
- Use Chrome (não Firefox/Opera)
- Certifique-se que está em HTTPS (GitHub Pages é automático)
- Recarregue a página

**"Offline não funciona"**
- Abra uma vez com internet primeiro
- Verifique Console (F12) se há erros no Service Worker

**"Perdi as imagens"**
- As imagens ficam salvas por navegador
- Se limpar dados do Chrome, perde
- Ou use `initialImages` com URLs online

---

## 📱 Compatibilidade

✅ Chrome Android (recomendado)
✅ Edge Android
✅ Samsung Internet
⚠️ Firefox Android (PWA limitada)
❌ iOS Safari (PWA funciona diferente)

---

**Dúvidas?** Teste primeiro no PC antes de distribuir nos tablets!
