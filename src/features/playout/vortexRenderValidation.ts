import type { SavedTemplate } from '../../store/useTemplateStore';
type SceneTemplate = Pick<SavedTemplate, 'id' | 'name' | 'canvasWidth' | 'canvasHeight' | 'layers'>;

const PIXEL_DIFF_THRESHOLD = 0.01;
const TEXT_DRIFT_THRESHOLD_PX = 1;

export type RenderValidationResult = {
  passed: boolean;
  diffPercentage: number;
  mismatchedPixels: number;
  totalPixels: number;
};

export type TextBoundingBoxReport = {
  layerId: string;
  expected: { x: number; y: number; width: number; height: number };
  actual: { x: number; y: number; width: number; height: number };
  delta: number;
};

export type FontValidationResult = {
  requiredFamilies: string[];
  missingFamilies: string[];
  fallbackDetected: boolean;
  passed: boolean;
};

export type VortexRenderValidationReport = {
  passed: boolean;
  pixelDiff: RenderValidationResult;
  textBoundingBoxes: TextBoundingBoxReport[];
  fontValidation: FontValidationResult;
  deterministic: {
    passed: boolean;
    firstHash: string;
    secondHash: string;
  };
  notes: string[];
};

const hashString = async (value: string): Promise<string> => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const renderSvgToImageData = async (svg: string, width: number, height: number): Promise<ImageData> => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.decoding = 'sync';
    image.src = url;
    await image.decode();

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Could not create offscreen 2D context.');
    }
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const comparePixels = (expected: ImageData, actual: ImageData): RenderValidationResult => {
  const totalPixels = expected.width * expected.height;
  const totalChannels = totalPixels * 4;
  let mismatchedPixels = 0;

  for (let i = 0; i < totalChannels; i += 4) {
    if (
      expected.data[i] !== actual.data[i]
      || expected.data[i + 1] !== actual.data[i + 1]
      || expected.data[i + 2] !== actual.data[i + 2]
      || expected.data[i + 3] !== actual.data[i + 3]
    ) {
      mismatchedPixels += 1;
    }
  }

  const diffPercentage = (mismatchedPixels / totalPixels) * 100;
  return {
    passed: diffPercentage <= PIXEL_DIFF_THRESHOLD,
    diffPercentage,
    mismatchedPixels,
    totalPixels,
  };
};

const getTextBoxesByLayerId = (svg: SVGSVGElement): Map<string, DOMRect> => {
  const boxes = new Map<string, DOMRect>();
  const groups = Array.from(svg.querySelectorAll('g[data-layer-id]'));

  groups.forEach((group) => {
    const text = group.querySelector('text');
    if (!text) return;
    const layerId = group.getAttribute('data-layer-id');
    if (!layerId) return;
    boxes.set(layerId, text.getBBox());
  });

  return boxes;
};

const compareTextBoundingBoxes = (expected: SVGSVGElement, actual: SVGSVGElement): TextBoundingBoxReport[] => {
  const expectedBoxes = getTextBoxesByLayerId(expected);
  const actualBoxes = getTextBoxesByLayerId(actual);

  const reports: TextBoundingBoxReport[] = [];

  expectedBoxes.forEach((expectedBox, layerId) => {
    const actualBox = actualBoxes.get(layerId);
    if (!actualBox) return;
    const dx = Math.abs(expectedBox.x - actualBox.x);
    const dy = Math.abs(expectedBox.y - actualBox.y);
    const dw = Math.abs(expectedBox.width - actualBox.width);
    const dh = Math.abs(expectedBox.height - actualBox.height);
    const delta = Math.max(dx, dy, dw, dh);

    reports.push({
      layerId,
      expected: { x: expectedBox.x, y: expectedBox.y, width: expectedBox.width, height: expectedBox.height },
      actual: { x: actualBox.x, y: actualBox.y, width: actualBox.width, height: actualBox.height },
      delta,
    });
  });

  return reports;
};

const validateFonts = (runtimeSvg: SVGSVGElement, template: SceneTemplate, allowFallback: boolean): FontValidationResult => {
  const requiredFamilies = Array.from(new Set(
    template.layers
      .filter((layer) => layer.kind === 'text')
      .map((layer) => layer.fontFamily.trim())
      .filter(Boolean),
  ));

  const missingFamilies = requiredFamilies.filter((family) => !document.fonts.check(`16px "${family}"`));
  const runtimeTextNodes = Array.from(runtimeSvg.querySelectorAll('text'));
  const fallbackDetected = runtimeTextNodes.some((node) => {
    const computed = getComputedStyle(node).fontFamily.toLowerCase();
    const declared = (node.getAttribute('font-family') || '').toLowerCase();
    return declared && !computed.includes(declared);
  });

  const passed = missingFamilies.length === 0 && (allowFallback || !fallbackDetected);

  return {
    requiredFamilies,
    missingFamilies,
    fallbackDetected,
    passed,
  };
};

type ValidationInput = {
  originalSvg: string;
  runtimeSvgFirst: string;
  runtimeSvgSecond: string;
  originalSvgElement: SVGSVGElement;
  runtimeSvgElement: SVGSVGElement;
  template: SceneTemplate;
  width: number;
  height: number;
  allowFallback: boolean;
};

export const runVortexRenderValidation = async ({
  originalSvg,
  runtimeSvgFirst,
  runtimeSvgSecond,
  originalSvgElement,
  runtimeSvgElement,
  template,
  width,
  height,
  allowFallback,
}: ValidationInput): Promise<VortexRenderValidationReport> => {
  const [expectedPixels, actualPixels] = await Promise.all([
    renderSvgToImageData(originalSvg, width, height),
    renderSvgToImageData(runtimeSvgFirst, width, height),
  ]);

  const pixelDiff = comparePixels(expectedPixels, actualPixels);
  const textBoundingBoxes = compareTextBoundingBoxes(originalSvgElement, runtimeSvgElement);
  const boxesPassed = textBoundingBoxes.every((report) => report.delta <= TEXT_DRIFT_THRESHOLD_PX);
  const fontValidation = validateFonts(runtimeSvgElement, template, allowFallback);

  const deterministicHashOne = await hashString(runtimeSvgFirst);
  const deterministicHashTwo = await hashString(runtimeSvgSecond);
  const deterministic = {
    passed: deterministicHashOne === deterministicHashTwo,
    firstHash: deterministicHashOne,
    secondHash: deterministicHashTwo,
  };

  const notes: string[] = [];
  if (!pixelDiff.passed) notes.push(`Pixel drift ${pixelDiff.diffPercentage.toFixed(4)}% exceeds ${PIXEL_DIFF_THRESHOLD}%.`);
  if (!boxesPassed) notes.push(`Text bounding boxes drift exceeds ${TEXT_DRIFT_THRESHOLD_PX}px.`);
  if (!fontValidation.passed) notes.push('Font integrity checks failed.');
  if (!deterministic.passed) notes.push('Runtime SVG serialization is not deterministic.');

  return {
    passed: pixelDiff.passed && boxesPassed && fontValidation.passed && deterministic.passed,
    pixelDiff,
    textBoundingBoxes,
    fontValidation,
    deterministic,
    notes,
  };
};
