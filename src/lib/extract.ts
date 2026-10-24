/** Browser-only text extraction: pdf.js for text PDFs, Tesseract.js OCR for scans/photos. */
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type Progress = (stage: string, pct: number) => void;

async function pdfText(data: ArrayBuffer): Promise<{ text: string; pages: number }> {
  const doc = await pdfjs.getDocument({ data }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | undefined;
    for (const item of content.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
      const y = item.transform?.[5];
      if (lastY !== undefined && y !== undefined && Math.abs(y - lastY) > 4) text += '\n';
      text += item.str + (item.hasEOL ? '\n' : ' ');
      lastY = y;
    }
    text += '\n';
  }
  return { text: text.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' '), pages: doc.numPages };
}

async function pdfPagesToImages(data: ArrayBuffer): Promise<HTMLCanvasElement[]> {
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: HTMLCanvasElement[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    out.push(canvas);
  }
  return out;
}

async function ocr(images: (HTMLCanvasElement | File)[], progress: Progress): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  let current = 0;
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') progress(`OCR page ${current + 1}/${images.length}`, ((current + m.progress) / images.length) * 100);
      else progress(m.status, 0);
    },
  });
  let text = '';
  for (current = 0; current < images.length; current++) {
    const { data } = await worker.recognize(images[current]);
    text += data.text + '\n';
  }
  await worker.terminate();
  return text;
}

export async function extractText(file: File, progress: Progress, forceOcr = false): Promise<{ text: string; method: 'pdf' | 'ocr' }> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const buf = await file.arrayBuffer();
    if (!forceOcr) {
      progress('Reading PDF text', 20);
      const { text, pages } = await pdfText(buf.slice(0));
      // scanned PDFs have (almost) no text layer
      if (text.replace(/\s/g, '').length > 40 * pages) {
        progress('Done', 100);
        return { text, method: 'pdf' };
      }
    }
    progress('Rendering pages for OCR', 5);
    const imgs = await pdfPagesToImages(buf.slice(0));
    return { text: await ocr(imgs, progress), method: 'ocr' };
  }
  return { text: await ocr([file], progress), method: 'ocr' };
}
