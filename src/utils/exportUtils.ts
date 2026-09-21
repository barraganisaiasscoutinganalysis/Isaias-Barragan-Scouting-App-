import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

/**
 * Parses numeric value from color strings (supports percentage like '50%' or decimals)
 */
function parseColorValue(val: string, isPercentRelative = true): number {
  if (!val) return 0;
  const cleaned = val.trim();
  if (cleaned.endsWith('%')) {
    const num = parseFloat(cleaned);
    return isPercentRelative ? num / 100 : (num / 100) * 255;
  }
  return parseFloat(cleaned);
}

/**
 * Converts OKLAB color values to gamma-corrected sRGB string format.
 */
function oklabToRgb(L: number, a: number, b: number, alpha = 1): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toGamma = (x: number) => {
    if (isNaN(x) || x <= 0) return 0;
    if (x >= 1) return 255;
    const g = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(g * 255)));
  };

  const r = toGamma(r_lin);
  const g = toGamma(g_lin);
  const b_val = toGamma(b_lin);

  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b_val}, ${alpha.toFixed(3)})`;
  }
  return `rgb(${r}, ${g}, ${b_val})`;
}

/**
 * Converts OKLCH color values to gamma-corrected sRGB string format.
 */
function oklchToRgb(L: number, C: number, H: number, alpha = 1): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b, alpha);
}

/**
 * Converts OKLCH string e.g. "oklch(0.208 0.042 265.755)" to "rgb(r, g, b)"
 */
function convertOklchColor(str: string): string {
  const m = str.match(/oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.%]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
  if (!m) return str;
  const L = parseColorValue(m[1], true);
  const C = parseColorValue(m[2], false);
  const H = parseColorValue(m[3], false);
  const alpha = m[4] ? parseColorValue(m[4], true) : 1;
  return oklchToRgb(L, C, H, alpha);
}

/**
 * Converts OKLAB string e.g. "oklab(0.5 0.1 -0.1)" to "rgb(r, g, b)"
 */
function convertOklabColor(str: string): string {
  const m = str.match(/oklab\(\s*([\d.%-]+)\s+([\d.%-]+)\s+([\d.%-]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
  if (!m) return str;
  const L = parseColorValue(m[1], true);
  const a = parseColorValue(m[2], false);
  const b = parseColorValue(m[3], false);
  const alpha = m[4] ? parseColorValue(m[4], true) : 1;
  return oklabToRgb(L, a, b, alpha);
}

/**
 * Converts any oklch, oklab, color-mix, or modern CSS color function into standard rgb/rgba format.
 */
function replaceAllOklabOklch(str: string, dummyCtx: CanvasRenderingContext2D): string {
  if (!str) return str;
  if (!str.includes('oklch') && !str.includes('oklab') && !str.includes('color(') && !str.includes('color-mix(')) {
    return str;
  }

  let result = str;
  const funcRegex = /(?:oklch|oklab|color-mix|color)\s*\(/gi;
  let match: RegExpExecArray | null;
  let maxLoop = 100;

  while (maxLoop-- > 0 && (match = funcRegex.exec(result)) !== null) {
    const startIdx = match.index;
    let openCount = 0;
    let endIdx = -1;

    for (let i = startIdx; i < result.length; i++) {
      if (result[i] === '(') openCount++;
      else if (result[i] === ')') {
        openCount--;
        if (openCount === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (endIdx !== -1) {
      const fullFunc = result.substring(startIdx, endIdx + 1);
      let converted = fullFunc;
      try {
        dummyCtx.fillStyle = 'rgba(0,0,0,0)';
        dummyCtx.fillStyle = fullFunc;
        const res = dummyCtx.fillStyle;
        if (res && res !== 'rgba(0,0,0,0)' && res !== 'transparent' && !res.includes('oklab') && !res.includes('oklch')) {
          converted = res;
        } else {
          if (fullFunc.startsWith('oklch')) {
            converted = convertOklchColor(fullFunc);
          } else if (fullFunc.startsWith('oklab')) {
            converted = convertOklabColor(fullFunc);
          } else {
            converted = 'rgba(15, 23, 42, 0.9)';
          }
        }
      } catch {
        if (fullFunc.startsWith('oklch')) {
          converted = convertOklchColor(fullFunc);
        } else if (fullFunc.startsWith('oklab')) {
          converted = convertOklabColor(fullFunc);
        }
      }
      result = result.substring(0, startIdx) + converted + result.substring(endIdx + 1);
      funcRegex.lastIndex = 0;
    }
  }

  result = result
    .replace(/in\s+oklab/gi, 'in srgb')
    .replace(/in\s+oklch/gi, 'in srgb');

  return result;
}

/**
 * Sanitizes all oklab, oklch and color-mix values across stylesheets and inline styles
 * in a cloned DOM document before html2canvas parses it.
 */
export function sanitizeDocumentColors(clonedDoc: Document): void {
  const dummyCanvas = clonedDoc.createElement('canvas');
  const dummyCtx = dummyCanvas.getContext('2d');
  if (!dummyCtx) return;

  // 1. Sanitize style tags by updating textContent directly
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  styleTags.forEach((styleTag) => {
    const text = styleTag.textContent || styleTag.innerHTML || '';
    if (text.includes('oklch') || text.includes('oklab') || text.includes('color(') || text.includes('color-mix(')) {
      styleTag.textContent = replaceAllOklabOklch(text, dummyCtx);
    }
  });

  // 2. CORS safety for images
  const images = Array.from(clonedDoc.querySelectorAll('img'));
  images.forEach((img) => {
    if (img.src && img.src.startsWith('http') && !img.src.startsWith(window.location.origin)) {
      img.crossOrigin = 'anonymous';
    }
  });

  // 3. Inline style & SVG attributes on elements
  const styledElements = Array.from(clonedDoc.querySelectorAll('[style], [fill], [stroke], [stop-color]')) as HTMLElement[];
  styledElements.forEach((el) => {
    if (!el || !el.getAttribute) return;

    const rawStyle = el.getAttribute('style');
    if (rawStyle && (rawStyle.includes('oklch') || rawStyle.includes('oklab') || rawStyle.includes('color(') || rawStyle.includes('color-mix('))) {
      el.setAttribute('style', replaceAllOklabOklch(rawStyle, dummyCtx));
    }

    ['fill', 'stroke', 'stop-color'].forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color(') || val.includes('color-mix('))) {
        el.setAttribute(attr, replaceAllOklabOklch(val, dummyCtx));
      }
    });
  });
}

/**
 * Helper to unconstrain dimensions and scroll containers in cloned document
 */
function prepareClonedDocument(clonedDoc: Document, elementId?: string): void {
  sanitizeDocumentColors(clonedDoc);

  const clonedTarget = elementId ? clonedDoc.getElementById(elementId) : clonedDoc.body;
  if (clonedTarget) {
    clonedTarget.style.height = 'auto';
    clonedTarget.style.maxHeight = 'none';
    clonedTarget.style.minHeight = '0px';
    clonedTarget.style.overflow = 'visible';
    clonedTarget.style.position = 'static';

    // Unconstrain ALL parent containers up to body/html
    let parent = clonedTarget.parentElement;
    while (parent && parent !== clonedDoc.body) {
      parent.style.height = 'auto';
      parent.style.maxHeight = 'none';
      parent.style.minHeight = '0px';
      parent.style.overflow = 'visible';
      parent.style.position = 'static';
      parent.style.transform = 'none';
      parent.style.display = 'block';
      parent = parent.parentElement;
    }
  }

  const scrollables = clonedDoc.querySelectorAll('.overflow-y-auto, .overflow-x-auto, .overflow-auto, [class*="max-h-"]');
  scrollables.forEach((sc) => {
    const el = sc as HTMLElement;
    el.style.overflow = 'visible';
    el.style.height = 'auto';
    el.style.maxHeight = 'none';
    el.style.minHeight = '0px';
  });

  if (clonedDoc.body) {
    clonedDoc.body.style.backgroundColor = '#0A0D14';
    clonedDoc.body.style.overflow = 'visible';
    clonedDoc.body.style.height = 'auto';
    clonedDoc.body.style.maxHeight = 'none';
  }
}


/**
 * Monkey-patches window.getComputedStyle to translate oklch/oklab/color-mix values
 * to standard CSS formats before html2canvas queries them.
 */
function patchGetComputedStyle(): () => void {
  if (typeof window === 'undefined') return () => {};
  const originalGetComputedStyle = window.getComputedStyle;
  const dummyCanvas = document.createElement('canvas');
  const dummyCtx = dummyCanvas.getContext('2d');
  if (!dummyCtx) return () => {};

  window.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const style = originalGetComputedStyle.call(window, elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const val = target.getPropertyValue(propertyName);
            if (typeof val === 'string' && (
              val.includes('oklch') ||
              val.includes('oklab') ||
              val.includes('color(') ||
              val.includes('color-mix(')
            )) {
              return replaceAllOklabOklch(val, dummyCtx);
            }
            return val;
          };
        }

        const value = Reflect.get(target, prop);
        if (typeof value === 'string' && (
          value.includes('oklch') ||
          value.includes('oklab') ||
          value.includes('color(') ||
          value.includes('color-mix(')
        )) {
          return replaceAllOklabOklch(value, dummyCtx);
        }
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }
    }) as any;
  };

  return () => {
    window.getComputedStyle = originalGetComputedStyle;
  };
}

/**
 * Exports a DOM element as a high-resolution PNG image directly downloaded to the user's computer.
 */
export async function exportElementToPNG(element: HTMLElement, filename: string): Promise<void> {
  const restore = patchGetComputedStyle();
  try {
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // Ignore font ready wait errors
      }
    }

    const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, 800);
    const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1000);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#0A0D14',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      height: fullHeight,
      windowHeight: fullHeight + 1000,
      windowWidth: Math.max(fullWidth, 1200),
      imageTimeout: 15000,
      foreignObjectRendering: false,
      onclone: (clonedDoc: Document) => {
        prepareClonedDocument(clonedDoc, element.id);
      },
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.2 }
      });
    } catch {
      // Ignore confetti
    }
  } catch (error) {
    console.error('Error in exportElementToPNG:', error);
    throw new Error('No se pudo generar la imagen PNG. Verifica los permisos de tu navegador.');
  } finally {
    restore();
  }
}

/**
 * Exports a DOM element as a formatted, printable PDF document directly downloaded to the user's computer.
 */
export async function exportElementToPDF(
  element: HTMLElement, 
  filename: string, 
  options?: { mode?: 'paginated' | 'continuous' }
): Promise<void> {
  const restore = patchGetComputedStyle();
  try {
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // Ignore font ready wait errors
      }
    }

    const mode = options?.mode || 'paginated';

    // 1. Continuous single-page mode (landing strip / phone readable)
    if (mode === 'continuous') {
      const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, 800);
      const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1000);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0A0D14',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        height: fullHeight,
        windowHeight: fullHeight + 1000,
        windowWidth: Math.max(fullWidth, 1200),
        imageTimeout: 15000,
        foreignObjectRendering: false,
        onclone: (clonedDoc: Document) => {
          prepareClonedDocument(clonedDoc, element.id);
        },
      });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const margin = 0; // Zero margins for seamless continuous view
      const pageWidthMm = 210; // A4 standard width
      const scaleRatio = pageWidthMm / imgWidth;
      const pageHeightMm = imgHeight * scaleRatio;

      // Create custom-format PDF (page width 210mm, custom length matching content perfectly)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidthMm, pageHeightMm]
      });

      // Paint background dark
      pdf.setFillColor('#0A0D14');
      pdf.rect(0, 0, pageWidthMm, pageHeightMm, 'F');

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);

      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.2 }
        });
      } catch {}
      return;
    }

    // 2. Paginated Discrete Page Elements Mode
    const pageElements = Array.from(element.querySelectorAll('.scouting-page')) as HTMLElement[];
    if (pageElements.length > 0) {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 2; // Minimal elegant margins
      const printableWidth = pageWidth - (margin * 2);

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        if (i > 0) {
          pdf.addPage();
        }

        // Paint background dark
        pdf.setFillColor('#0A0D14');
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        const fullHeight = Math.max(pageEl.scrollHeight, pageEl.offsetHeight, 600);
        const fullWidth = Math.max(pageEl.scrollWidth, pageEl.offsetWidth, 800);

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#0A0D14',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          height: fullHeight,
          windowHeight: fullHeight + 200,
          windowWidth: Math.max(fullWidth, 1000),
          imageTimeout: 15000,
          foreignObjectRendering: false,
          onclone: (clonedDoc: Document) => {
            prepareClonedDocument(clonedDoc, pageEl.id);
          },
        });

        const scaleRatio = printableWidth / canvas.width;
        const printableHeight = canvas.height * scaleRatio;

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(
          imgData, 
          'PNG', 
          margin, 
          margin, 
          printableWidth, 
          Math.min(printableHeight, pageHeight - margin * 2), 
          undefined, 
          'FAST'
        );
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);

      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.2 }
        });
      } catch {}
      return;
    }

    // 3. Fallback math-slicing mode for single continuous element (default)
    const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, 800);
    const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1000);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#0A0D14',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      height: fullHeight,
      windowHeight: fullHeight + 1000,
      windowWidth: Math.max(fullWidth, 1200),
      imageTimeout: 15000,
      foreignObjectRendering: false,
      onclone: (clonedDoc: Document) => {
        prepareClonedDocument(clonedDoc, element.id);
      },
    });

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    const orientation = imgWidth > imgHeight * 1.15 ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 2; // Minimal elegant margins
    const printableWidth = pageWidth - (margin * 2);
    const scaleRatio = printableWidth / imgWidth;
    const printableHeight = imgHeight * scaleRatio;

    // Paint initial page background dark
    pdf.setFillColor('#0A0D14');
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    if (printableHeight <= pageHeight - (margin * 2)) {
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, printableHeight, undefined, 'FAST');
    } else {
      const pageCanvasHeightPx = (pageHeight - margin * 2) / scaleRatio;
      let positionPx = 0;
      let pageIndex = 0;

      while (positionPx < imgHeight) {
        const sliceHeightPx = Math.min(pageCanvasHeightPx, imgHeight - positionPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#0A0D14';
          ctx.fillRect(0, 0, imgWidth, sliceHeightPx);
          ctx.drawImage(
            canvas,
            0,
            positionPx,
            imgWidth,
            sliceHeightPx,
            0,
            0,
            imgWidth,
            sliceHeightPx
          );

          const pageImgData = pageCanvas.toDataURL('image/png');
          if (pageIndex > 0) {
            pdf.addPage();
            // Paint background dark on added pages
            pdf.setFillColor('#0A0D14');
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          }
          pdf.addImage(
            pageImgData,
            'PNG',
            margin,
            margin,
            printableWidth,
            sliceHeightPx * scaleRatio,
            undefined,
            'FAST'
          );
        }

        positionPx += pageCanvasHeightPx;
        pageIndex++;
      }
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);

    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.2 }
      });
    } catch {}
  } catch (error) {
    console.error('Error in exportElementToPDF:', error);
    try {
      window.print();
    } catch {
      throw new Error('No se pudo generar el documento PDF del informe.');
    }
  } finally {
    restore();
  }
}

