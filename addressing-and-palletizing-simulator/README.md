# CargaCerta — Simulador Logístico

Aplicativo web profissional para simulação de endereçamento de picking e paletização padrão PBR, voltado para profissionais de logística, armazenagem e centros de distribuição.

## 🚀 Funcionalidades

### Endereçamento de Produto
- Calcula a capacidade máxima de caixas/fardos em endereços de picking
- Testa automaticamente as 6 orientações possíveis (permutações C×L×A)
- Métricas completas: ocupação, volume utilizado/livre, eficiência volumétrica
- Visualização SVG da vista superior com numeração e setas de orientação

### Paletização PBR
- Pallet fixo 100×120 cm (padrão brasileiro), altura do pallet 15 cm
- Algoritmo inteligente: bloco principal + complementar com orientações mistas
- Otimização testando ambas orientações e ambos eixos de divisão
- Pontuação de qualidade com selo Aprovado/Reprovado
- Vista superior SVG com cores por bloco e navegação de camadas
- Vista isométrica SVG com pallet de madeira detalhado e rotação 0°/90°

## 📦 Deploy na Vercel

### Via GitHub

```bash
# 1. Inicializar repositório
git init
git add .
git commit -m "CargaCerta v1.0"

# 2. Conectar ao GitHub
git remote add origin https://github.com/SEU-USUARIO/cargacerta.git
git branch -M main
git push -u origin main

# 3. Importar no Vercel
# Acesse vercel.com → "Add New Project" → Importe o repositório
# Framework Preset: Other
# Build Command: (vazio)
# Output Directory: (vazio)
# Clique em Deploy
```

### Via Vercel CLI

```bash
npm i -g vercel
vercel
```

## 📁 Estrutura de Arquivos

```
cargacerta/
├── index.html                # Página principal
├── css/
│   └── style.css             # Estilos (dark theme industrial)
├── js/
│   └── app.js                # Lógica completa do aplicativo
├── icons/
│   ├── icon-192.svg          # Ícone 192px (SVG)
│   └── icon-512.svg          # Ícone 512px (SVG)
├── manifest.webmanifest      # Manifesto PWA
├── sw.js                     # Service Worker (cache offline)
└── README.md                 # Este arquivo
```

## 🎨 Personalização

### Alterar Cores

Edite as variáveis CSS em `css/style.css`:

```css
:root {
    --bg:       #10141B;    /* Fundo principal */
    --bg-card:  #1A2230;    /* Fundo dos cards */
    --border:   #2D3A4E;    /* Bordas */
    --orange:   #FF6A2B;    /* Cor de destaque (laranja industrial) */
    --blue:     #3E8EFF;    /* Cor complementar (bloco complementar) */
    --green:    #28C76F;    /* Sucesso / aprovado */
    --red:      #EA5455;    /* Erro / reprovado */
}
```

### Alterar Dimensões do Pallet

Edite as constantes em `js/app.js`:

```javascript
const PBR_L = 120, PBR_W = 100, PBR_H = 15;   // Comprimento, Largura, Altura do pallet (cm)
```

## 📱 PWA — Instalação

O CargaCerta é instalável como aplicativo:
- Botão "Instalar" aparece no cabeçalho quando suportado
- Funciona offline após primeiro carregamento (Service Worker)
- Indicador online/offline em tempo real

## ⌨️ Atalhos

| Tecla   | Ação                    |
|---------|-------------------------|
| `Enter` | Calcular                |
| `Esc`   | Limpar formulário       |

## 🔧 Tecnologias

- HTML5 + CSS3 + JavaScript ES6 (puro, sem frameworks)
- Google Fonts: Space Grotesk, Inter, JetBrains Mono
- SVG para visualizações 2D e isométricas
- Service Worker API para cache offline
- Web App Manifest para instalação PWA

## 📝 Notas sobre Ícones

Os ícones estão em formato SVG para compatibilidade com Chrome/Edge. Para suporte completo a todos os navegadores (Safari, Firefox), converta os SVGs para PNG:

```bash
# Usando Inkscape ou conversor online
inkscape icon-192.svg --export-png=icon-192.png -w 192 -h 192
inkscape icon-512.svg --export-png=icon-512.png -w 512 -h 512
```

Após converter, atualize o `manifest.webmanifest` para referenciar os arquivos `.png`.

## 📄 Licença

MIT
