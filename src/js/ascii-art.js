const ColorPalette = {
  Monochrome: 'none',
  Grey2Bit: 'grey2bit',
  Grey4Bit: 'grey4bit',
  Grey8Bit: 'grey8bit',
  Color3Bit: 'color3bit',
  Color4Bit: 'color4bit',
  ColorFull: 'color',
};

class AsciiArtGenerator {
  constructor() {
    this.settings = {
      charSet: ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
      url: 'src/webp/myimage.png',
      charSamples: 1, // Enforced 1 for O(1) character lookup speedup
      size: 70, // Optimized to 70 for 50%+ cell count savings and perfect rendering
      contrast: 0.1, // Slight boost for clarity
      brightness: 0,
      alpha: 0,
      ColorPalette: ColorPalette.ColorFull,
      debug: false,
      isDemoRunning: true,
      saveAsHtml: () => {
        this.asciiElement.style.setProperty('--width', this.width.toString());
        this.asciiElement.style.setProperty('--height', this.height.toString());
        const blob = new Blob([this.asciiElement.outerHTML]);
        this.exportElement.href = URL.createObjectURL(blob);
        this.exportElement.click();
      },
    };
    this.demoDirection = -1;
    this.demoSettings = [
      { url: 'src/webp/myimage.png', size: 50, charSamples: 1 },
      { url: 'src/webp/myimage.png', size: 60, charSamples: 1 },
      { url: 'src/webp/myimage.png', size: 70, charSamples: 1 }, // Enforced 1 and optimized sizes
    ];
    this.demoIndex = 2;
    this.isImageLoaded = false;
    this.charRegions = {};
    this.colorMap = [];
    this.valueMap = [];
    this.normalizedMap = [];
    this.width = 0;
    this.height = 0;
    this.cachedUrls = {};
    this.cells = [];
    this.charLookup = null;
    
    this.isElementVisible = false;
    this.animationFrameId = null;
    
    try {
      const elements = this.elements;
      this.asciiElement = elements.asciiElement;
      this.exportElement = elements.exportElement;
      this.debugImageElement = elements.debugImageElement;
      this.debugCharsElement = elements.debugCharsElement;

      this.colorPalettes = {};

      this.generatePalettes();
      this.analyzeCharRegions();
      this.loadFromUrl();
      this.setupIntersectionObserver();
    } catch (e) {
      console.warn('ASCII Art Generator initialization failed:', e);
    }
  }

  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const wasVisible = this.isElementVisible;
        this.isElementVisible = entry.isIntersecting;
        if (this.isElementVisible && !wasVisible) {
          // Restart animation loop if it was stopped
          this.lastDrawTime = 0; // Reset timer to draw immediately
          if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame((ts) => this.demo(ts));
          }
        }
      });
    }, { threshold: 0.05 });
    
    if (this.asciiElement) {
      observer.observe(this.asciiElement);
    }
  }

  initGui() {
    // Disabled for portfolio
  }

  get elements() {
    const asciiElement = document.getElementById('ascii');
    if (!asciiElement) throw '#ascii Element is missing';
    return { 
        asciiElement, 
        exportElement: document.getElementById('export') || document.createElement('a'), 
        debugImageElement: document.getElementById('debug-image') || document.createElement('div'), 
        debugCharsElement: document.getElementById('debug-chars') || document.createElement('div') 
    };
  }

  generatePalettes() {
    this.colorPalettes[ColorPalette.Grey2Bit] = [[0, 0, 0], [104, 104, 104], [184, 184, 184], [255, 255, 255]];
    this.colorPalettes[ColorPalette.Grey4Bit] = Array.from({length: 16}, (_, i) => [i * 17, i * 17, i * 17]);
    this.colorPalettes[ColorPalette.Grey8Bit] = Array.from({length: 256}, (_, i) => [i, i, i]);
    this.colorPalettes[ColorPalette.Color3Bit] = [[0, 0, 0], [0, 249, 45], [0, 252, 254], [255, 48, 21], [255, 62, 253], [254, 253, 52], [16, 37, 251], [255, 255, 255]];
    this.colorPalettes[ColorPalette.Color4Bit] = [...this.colorPalettes[ColorPalette.Color3Bit], ...Array.from({length: 7}, (_, i) => [(i+1)*32, (i+1)*32, (i+1)*32])];
  }

  analyzeChar(char) {
    const canvas = document.createElement('canvas');
    canvas.width = 12; canvas.height = 12;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = '12px monospace';
    ctx.fillText(char, 2, 10);
    const data = ctx.getImageData(0, 0, 12, 12).data;
    const values = [];
    const size = 12 / this.settings.charSamples;
    for (let cellY = 0; cellY < this.settings.charSamples; cellY++) {
      for (let cellX = 0; cellX < this.settings.charSamples; cellX++) {
        let value = 0;
        for (let posY = 0; posY < size; posY++) {
          for (let posX = 0; posX < size; posX++) {
            value += data[(cellX * size + posX + (cellY * size + posY) * 12) * 4 + 3];
          }
        }
        values.push(value / (size * size) / 255);
      }
    }
    this.charRegions[char] = values;
  }

  normalizeCharRegions() {
    let min = 1, max = 0;
    for (const char in this.charRegions) {
      for (const region of this.charRegions[char]) {
        min = Math.min(min, region);
        max = Math.max(max, region);
      }
    }
    if (max > 0 && min !== max) {
      for (const char in this.charRegions) {
        this.charRegions[char] = this.charRegions[char].map(r => (r - min) / (max - min));
      }
    }
  }

  analyzeCharRegions() {
    this.charRegions = {};
    for (const char of this.settings.charSet) {
      this.analyzeChar(char);
    }
    this.normalizeCharRegions();
    if (this.settings.charSamples === 1) {
        this.charLookup = Array.from({length: 256}, (_, i) => {
            let val = i / 255, minDiff = Infinity, minChar = '';
            for (const char in this.charRegions) {
                const diff = Math.abs(this.charRegions[char][0] - val);
                if (diff < minDiff) { minDiff = diff; minChar = char; }
            }
            return minChar;
        });
    } else { this.charLookup = null; }
  }

  loadFromUrl() {
    this.isImageLoaded = false;
    const url = this.settings.url;
    if (this.cachedUrls[url]) {
      this.onImageLoaded(this.cachedUrls[url]);
    } else {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => { this.cachedUrls[url] = img; this.onImageLoaded(img); };
      img.onerror = () => {
        if (url !== 'src/webp/myimage.png') {
            this.settings.url = 'src/webp/myimage.png';
            this.loadFromUrl();
        }
      };
    }
  }

  onImageLoaded(img) {
    const tempWidth = this.settings.size;
    const tempHeight = ~~((img.height / img.width) * tempWidth / 1.9);
    
    const canvas = document.createElement('canvas');
    canvas.width = tempWidth * this.settings.charSamples;
    canvas.height = tempHeight * this.settings.charSamples;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const rowLength = canvas.width * 4;
    
    // Initial maps
    let rawValueMap = [];
    let rawColorMap = [];
    
    for (let cellY = 0; cellY < tempHeight; cellY++) {
      for (let cellX = 0; cellX < tempWidth; cellX++) {
        const cellValues = [];
        const colorPos = (cellX * this.settings.charSamples) * 4 + (cellY * this.settings.charSamples) * rowLength;
        rawColorMap.push(data.slice(colorPos, colorPos + 4));
        
        for (let posY = 0; posY < this.settings.charSamples; posY++) {
          for (let posX = 0; posX < this.settings.charSamples; posX++) {
            const pos = (cellX * this.settings.charSamples + posX) * 4 + (cellY * this.settings.charSamples + posY) * rowLength;
            const alpha = data[pos + 3] / 255;
            const value = 1 - ((data[pos] + data[pos+1] + data[pos+2]) / 765 * alpha + 1 - alpha);
            cellValues.push(value);
          }
        }
        rawValueMap.push(cellValues);
      }
    }
    
    // CONTENT-AWARE CROPPING
    let minX = tempWidth, maxX = 0, minY = tempHeight, maxY = 0;
    for (let y = 0; y < tempHeight; y++) {
      for (let x = 0; x < tempWidth; x++) {
        const idx = x + y * tempWidth;
        const color = rawColorMap[idx];
        if (color[3] > 20) { // If pixel is visible
           minX = Math.min(minX, x); maxX = Math.max(maxX, x);
           minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (maxX >= minX) {
        // Add small padding
        minX = Math.max(0, minX - 2); maxX = Math.min(tempWidth - 1, maxX + 2);
        minY = Math.max(0, minY - 2); maxY = Math.min(tempHeight - 1, maxY + 2);
        
        this.width = maxX - minX + 1;
        this.height = maxY - minY + 1;
        this.valueMap = [];
        this.colorMap = [];
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                this.valueMap.push(rawValueMap[x + y * tempWidth]);
                this.colorMap.push(rawColorMap[x + y * tempWidth]);
            }
        }
    } else {
        this.width = tempWidth;
        this.height = tempHeight;
        this.valueMap = rawValueMap;
        this.colorMap = rawColorMap;
    }

    // SCALING & FITTING
    const targetSize = 290; // Slightly smaller for premium look
    const scaleW = targetSize / (this.width * 5.41);
    const scaleH = targetSize / (this.height * 10);
    const scale = Math.min(scaleW, scaleH);
    
    this.asciiElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
    this.asciiElement.style.position = 'absolute';
    this.asciiElement.style.top = '50%';
    this.asciiElement.style.left = '50%';
    
    document.documentElement.style.setProperty('--width', this.width.toString());
    document.documentElement.style.setProperty('--height', this.height.toString());
    
    this.normalizeValueMap();
    this.isImageLoaded = true;
    this.initGrid();
  }

  initGrid() {
    this.clearElement(this.asciiElement);
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    
    const charWidth = 5.41;
    const charHeight = 10;
    
    this.canvas.width = this.width * charWidth;
    this.canvas.height = this.height * charHeight;
    this.canvas.style.display = 'block';
    
    this.asciiElement.appendChild(this.canvas);
    this.generate();
  }

  normalizeValueMap() {
    let min = 1, max = 0;
    for (const regions of this.valueMap) {
      for (const region of regions) { min = Math.min(min, region); max = Math.max(max, region); }
    }
    const diff = (max > 0 && min !== max) ? (max - min) : 1;
    this.normalizedMap = this.valueMap.map(regions => {
        return regions.map(r => {
            let n = (r - min) / diff;
            return (this.settings.contrast + 1) * (n - 0.5) + 0.5 + this.settings.brightness;
        });
    });
  }

  getClosestChar(values) {
    if (this.charLookup && values.length === 1) {
        return this.charLookup[Math.max(0, Math.min(255, ~~(values[0] * 255)))];
    }
    let minDiff = Infinity, minChar = '';
    for (const char in this.charRegions) {
      let diff = 0;
      for (let i = 0; i < values.length; i++) diff += Math.abs(this.charRegions[char][i] - values[i]);
      if (diff < minDiff) { minDiff = diff; minChar = char; }
    }
    return minChar;
  }

  clearElement(element) { if (!element) return; while (element.firstChild) element.removeChild(element.firstChild); }

  getCharColor(color) {
    let r, g, b, a;
    if (this.settings.ColorPalette === ColorPalette.ColorFull) {
        [r, g, b, a] = color;
    } else {
        let minDiff = Infinity;
        for (const pCol of this.colorPalettes[this.settings.ColorPalette]) {
            const diff = Math.abs(color[0] - pCol[0]) + Math.abs(color[1] - pCol[1]) + Math.abs(color[2] - pCol[2]);
            if (diff < minDiff) { minDiff = diff; [r, g, b] = pCol; }
        }
        a = color[3];
    }
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a/255 + this.settings.alpha))})`;
  }

  generate(forceReinit = false) {
    if (!this.canvas || !this.isImageLoaded) return;
    
    const charWidth = 5.41;
    const charHeight = 10;
    
    this.ctx.fillStyle = '#000'; // Match the dark background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.font = '600 10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let i = 0; i < this.width * this.height; i++) {
        const char = this.getClosestChar(this.normalizedMap[i]);
        if (char === ' ') continue; // Optimize by not drawing spaces
        
        const newColor = this.getCharColor(this.colorMap[i]);
        
        const x = i % this.width;
        const y = Math.floor(i / this.width);
        
        this.ctx.fillStyle = newColor;
        this.ctx.fillText(char, x * charWidth + charWidth / 2, y * charHeight + charHeight / 2);
    }
  }

  demo(timestamp = 0) {    
    if (!this.isElementVisible) {
      this.animationFrameId = null;
      return;
    }
    
    if (this.settings.isDemoRunning && this.isImageLoaded) {
        if (!this.lastDrawTime) this.lastDrawTime = timestamp;
        
        // Throttle to ~15 FPS to save battery and CPU
        if (timestamp - this.lastDrawTime > 66) {
            this.settings.brightness += 0.05 * this.demoDirection;
            this.normalizeValueMap();
            this.generate();
            
            if (this.settings.brightness >= 0.5 || this.settings.brightness <= -1) {
                this.demoDirection *= -1;
            }
            if (this.settings.brightness <= -1) {
                this.demoIndex = (this.demoIndex + 1) % this.demoSettings.length;
                const next = this.demoSettings[this.demoIndex];
                this.settings.url = next.url; this.settings.size = next.size; this.settings.charSamples = next.charSamples;
                this.analyzeCharRegions();
                this.loadFromUrl();
            }
            this.lastDrawTime = timestamp;
        }
    }
    this.animationFrameId = requestAnimationFrame((ts) => this.demo(ts));
  }
}

document.addEventListener('DOMContentLoaded', () => new AsciiArtGenerator());
