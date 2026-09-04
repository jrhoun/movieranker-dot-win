/**
 * High-DPI Pure HTML5 2D Canvas Vintage Cinema Ticket ("Premiere Pass / Golden Ticket")
 * Renders retro perforated cinema ticket stubs for sharing rankings with 1-click PNG export.
 */

export interface TicketMovieItem {
  rank: number;
  title: string;
  releaseYear?: number | null;
  posterPath?: string | null;
}

export interface TicketRenderOptions {
  title: string;
  items: TicketMovieItem[];
  creatorHandle?: string | null;
  participants?: string[];
  date?: string | Date;
  themeTitle?: string | null;
  totalRanked?: number;
  serialNumber?: string;
  siteUrl?: string;
}

/**
 * Generate a deterministic vintage serial number like "№ MR-94821"
 */
export function generateTicketSerialNumber(title: string, date?: string | Date): string {
  let hash = 0;
  const str = `${title}-${date ? (typeof date === "string" ? date : date.toISOString()) : ""}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash % 90000) + 10000;
  return `№ MR-${code}`;
}

/**
 * Format date for vintage ticket display (e.g. "SEPTEMBER 2026" or "SEP 02, 2026")
 */
export function formatTicketDate(dateInput?: string | Date): string {
  const d = dateInput instanceof Date ? dateInput : dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return "SEPTEMBER 2026";
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Safe image loader with CORS and timeout
 */
export function loadTicketImage(url: string, timeoutMs = 2500): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      return reject(new Error("Image is not defined in this environment"));
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new Error("Image load timed out"));
    }, timeoutMs);

    img.onload = () => {
      if (timedOut) return;
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      if (timedOut) return;
      clearTimeout(timer);
      reject(new Error(`Failed to load image at ${url}`));
    };
    img.src = url;
  });
}

/**
 * Draw rounded rectangle path helper
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Procedurally draw 1D vintage cinema barcode
 */
export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  seedStr: string,
) {
  const bars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1];
  let curX = x;
  const totalWeight = bars.reduce((a, b) => a + b, 0);
  const unit = width / totalWeight;

  ctx.save();
  ctx.fillStyle = "#f5c518";
  for (let i = 0; i < bars.length; i++) {
    const barW = bars[i] * unit;
    if (i % 2 === 0) {
      ctx.fillRect(curX, y, Math.max(1, barW - 0.5), height);
    }
    curX += barW;
  }
  ctx.restore();
}

/**
 * Render the full vintage Premiere Pass on an HTML5 canvas element
 */
export async function generatePremierePassCanvas(
  options: TicketRenderOptions,
): Promise<HTMLCanvasElement> {
  const W = 1200;
  const H = 675;

  let canvas: HTMLCanvasElement;
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    canvas = document.createElement("canvas");
  } else {
    // Fallback if canvas is provided via external mock in tests
    canvas = {
      width: W,
      height: H,
      getContext: () => null,
      toBlob: () => null,
      toDataURL: () => "",
    } as unknown as HTMLCanvasElement;
  }
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 1. Background Velvet / Obsidian Texture
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0e0e12");
  bgGrad.addColorStop(0.5, "#18131a");
  bgGrad.addColorStop(1, "#0a0a0d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Soft gold radial illumination behind ticket center
  const glow = ctx.createRadialGradient(W * 0.4, H * 0.45, 20, W * 0.4, H * 0.45, 450);
  glow.addColorStop(0, "rgba(245, 197, 24, 0.12)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Ticket Dimensions & Layout Coordinates
  const margin = 28;
  const ticketW = W - margin * 2;
  const ticketH = H - margin * 2;
  const dividerX = 860; // Perforation line x coordinate

  // 2. Outer Ornate Golden Border
  ctx.save();
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 3;
  roundRect(ctx, margin, margin, ticketW, ticketH, 16);
  ctx.stroke();

  // Inner thin border
  ctx.strokeStyle = "rgba(245, 197, 24, 0.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, margin + 8, margin + 8, ticketW - 16, ticketH - 16, 12);
  ctx.stroke();

  // Corner Starburst ✦ Ornaments
  ctx.fillStyle = "#f5c518";
  ctx.font = 'bold 20px "Bebas Neue", serif, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦", margin + 18, margin + 18);
  ctx.fillText("✦", W - margin - 18, margin + 18);
  ctx.fillText("✦", margin + 18, H - margin - 18);
  ctx.fillText("✦", W - margin - 18, H - margin - 18);
  ctx.restore();

  // 3. Perforated Divider & Semicircle Scallop Cutouts
  ctx.save();
  // Cutout scallops on top & bottom edge at dividerX
  const scallopRadius = 22;
  ctx.fillStyle = "#0d0d10"; // Outer background tone
  ctx.beginPath();
  ctx.arc(dividerX, margin, scallopRadius, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(dividerX, H - margin, scallopRadius, Math.PI, 0);
  ctx.fill();

  // Scallop border rims
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(dividerX, margin, scallopRadius, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(dividerX, H - margin, scallopRadius, Math.PI, 0);
  ctx.stroke();

  // Dashed Perforation Line
  ctx.beginPath();
  ctx.strokeStyle = "rgba(245, 197, 24, 0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.moveTo(dividerX, margin + scallopRadius + 6);
  ctx.lineTo(dividerX, H - margin - scallopRadius - 6);
  ctx.stroke();
  ctx.restore();

  // ==========================================
  // LEFT BODY: Main Ranking & Champion Feature
  // ==========================================
  const leftX = margin + 36;
  const contentW = dividerX - leftX - 24;

  // Header Marquee Badge
  ctx.save();
  ctx.fillStyle = "rgba(245, 197, 24, 0.15)";
  roundRect(ctx, leftX, margin + 24, 340, 32, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 197, 24, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#f5c518";
  ctx.font = 'bold 15px "Bebas Neue", "Outfit", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("✦ MOVIERANKER OFFICIAL PREMIERE PASS ✦", leftX + 16, margin + 40);
  ctx.restore();

  // List Title
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 38px "Bebas Neue", "Playfair Display", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const displayTitle = (options.title || "CINEMA RANKING CONSENSUS").toUpperCase();
  // Truncate if too long
  let truncatedTitle = displayTitle;
  if (ctx.measureText(truncatedTitle).width > contentW) {
    while (truncatedTitle.length > 4 && ctx.measureText(truncatedTitle + "…").width > contentW) {
      truncatedTitle = truncatedTitle.slice(0, -1);
    }
    truncatedTitle += "…";
  }
  ctx.fillText(truncatedTitle, leftX, margin + 68);

  // Metadata Subtitle (Attribution & Date)
  const author = options.creatorHandle
    ? `@${options.creatorHandle}`
    : options.participants?.length
      ? options.participants.join(", ")
      : "OFFICIAL CONSENSUS";
  const dateStr = formatTicketDate(options.date);
  ctx.fillStyle = "#8b8b94";
  ctx.font = '14px "Outfit", sans-serif';
  ctx.fillText(`RANKED BY ${author.toUpperCase()}  •  ${dateStr}`, leftX, margin + 116);
  ctx.restore();

  // Ranked Movies Division: Top #1 Champion Feature + Runners Up
  const sorted = [...(options.items || [])].sort((a, b) => a.rank - b.rank);
  const champ = sorted[0] || { rank: 1, title: "Undisputed Champion", releaseYear: null };
  const runnersUp = sorted.slice(1, 5);

  // Champion Highlight Card Box
  const champBoxY = margin + 148;
  const champBoxH = 210;
  ctx.save();
  const champGrad = ctx.createLinearGradient(leftX, champBoxY, leftX + contentW, champBoxY + champBoxH);
  champGrad.addColorStop(0, "rgba(245, 197, 24, 0.18)");
  champGrad.addColorStop(1, "rgba(245, 197, 24, 0.04)");
  ctx.fillStyle = champGrad;
  roundRect(ctx, leftX, champBoxY, contentW, champBoxH, 12);
  ctx.fill();
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // #1 Laurel Badge Header inside Box
  ctx.fillStyle = "#f5c518";
  ctx.font = 'bold 16px "Bebas Neue", "Outfit", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("★  #1 UNDISPUTED CHAMPION", leftX + 20, champBoxY + 28);

  // Try drawing poster thumbnail if available
  let posterDrawn = false;
  const posterW = 100;
  const posterH = 145;
  const posterX = leftX + 20;
  const posterY = champBoxY + 48;

  if (champ.posterPath) {
    try {
      const posterUrl = `https://image.tmdb.org/t/p/w185${champ.posterPath}`;
      const img = await loadTicketImage(posterUrl, 2000);
      ctx.drawImage(img, posterX, posterY, posterW, posterH);
      ctx.strokeStyle = "rgba(245, 197, 24, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(posterX, posterY, posterW, posterH);
      posterDrawn = true;
    } catch {
      posterDrawn = false;
    }
  }

  if (!posterDrawn) {
    // Fallback gold typographic plaque
    ctx.fillStyle = "rgba(245, 197, 24, 0.12)";
    ctx.fillRect(posterX, posterY, posterW, posterH);
    ctx.strokeStyle = "rgba(245, 197, 24, 0.4)";
    ctx.strokeRect(posterX, posterY, posterW, posterH);
    ctx.fillStyle = "#f5c518";
    ctx.font = 'bold 36px "Bebas Neue", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("#1", posterX + posterW / 2, posterY + posterH / 2);
  }

  // Champion Title & Details
  const champTextX = posterX + posterW + 24;
  const maxChampTitleW = contentW - (posterW + 54);
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 32px "Bebas Neue", "Playfair Display", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  let champTitle = champ.title;
  if (ctx.measureText(champTitle).width > maxChampTitleW) {
    while (champTitle.length > 4 && ctx.measureText(champTitle + "…").width > maxChampTitleW) {
      champTitle = champTitle.slice(0, -1);
    }
    champTitle += "…";
  }
  ctx.fillText(champTitle, champTextX, champBoxY + 65);

  if (champ.releaseYear) {
    ctx.fillStyle = "#f5a524";
    ctx.font = 'bold 18px "Bebas Neue", sans-serif';
    ctx.fillText(`RELEASED ${champ.releaseYear}`, champTextX, champBoxY + 110);
  }

  ctx.fillStyle = "rgba(236, 236, 241, 0.8)";
  ctx.font = '14px "Outfit", sans-serif';
  ctx.fillText("Decisively ranked #1 in pairwise head-to-head duels", champTextX, champBoxY + 145);
  ctx.restore();

  // Runners Up Section (#2 through #5)
  const runnersY = champBoxY + champBoxH + 20;
  ctx.save();
  ctx.fillStyle = "#8b8b94";
  ctx.font = 'bold 13px "Bebas Neue", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("TOP RUNNERS-UP", leftX, runnersY);

  const colWidth = (contentW - 20) / 2;
  runnersUp.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const itemX = leftX + col * (colWidth + 20);
    const itemY = runnersY + 14 + row * 44;

    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    roundRect(ctx, itemX, itemY, colWidth, 36, 6);
    ctx.fill();

    // Rank numeral pill
    ctx.fillStyle = item.rank === 2 ? "#c9ced6" : item.rank === 3 ? "#cd7f32" : "#8b8b94";
    ctx.font = 'bold 16px "Bebas Neue", sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${item.rank}.`, itemX + 10, itemY + 18);

    // Title
    ctx.fillStyle = "#ececf1";
    ctx.font = '14px "Outfit", sans-serif';
    let rTitle = item.title;
    const maxRunnerW = colWidth - 75;
    if (ctx.measureText(rTitle).width > maxRunnerW) {
      while (rTitle.length > 3 && ctx.measureText(rTitle + "…").width > maxRunnerW) {
        rTitle = rTitle.slice(0, -1);
      }
      rTitle += "…";
    }
    ctx.fillText(rTitle, itemX + 32, itemY + 18);

    if (item.releaseYear) {
      ctx.fillStyle = "#6e6e78";
      ctx.font = '12px "Outfit", sans-serif';
      ctx.textAlign = "right";
      ctx.fillText(String(item.releaseYear), itemX + colWidth - 10, itemY + 18);
    }
  });
  ctx.restore();

  // ==========================================
  // RIGHT STUB: "ADMIT ONE" & Barcode
  // ==========================================
  const stubX = dividerX + 32;
  const stubW = W - margin - stubX - 16;

  ctx.save();
  // "OFFICIAL PASS" Header
  ctx.fillStyle = "#f5c518";
  ctx.font = 'bold 36px "Bebas Neue", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("OFFICIAL PASS", stubX + stubW / 2, margin + 40);

  ctx.fillStyle = "#8b8b94";
  ctx.font = '12px "Outfit", sans-serif';
  ctx.fillText("VERIFIED VERDICT", stubX + stubW / 2, margin + 85);

  // Serial Number
  const serial = options.serialNumber || generateTicketSerialNumber(options.title, options.date);
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 18px "Courier New", monospace, sans-serif';
  ctx.fillText(serial, stubX + stubW / 2, margin + 125);

  // Stats Box on Stub
  const totalCount = options.totalRanked ?? sorted.length;
  ctx.fillStyle = "rgba(245, 197, 24, 0.1)";
  roundRect(ctx, stubX, margin + 165, stubW, 60, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 197, 24, 0.3)";
  ctx.stroke();

  ctx.fillStyle = "#f5c518";
  ctx.font = 'bold 22px "Bebas Neue", sans-serif';
  ctx.fillText(`${totalCount} FILMS RANKED`, stubX + stubW / 2, margin + 185);

  ctx.fillStyle = "#8b8b94";
  ctx.font = '11px "Outfit", sans-serif';
  ctx.fillText("HEAD-TO-HEAD RANKING", stubX + stubW / 2, margin + 208);

  // Sleek Gold Verification Emblem Box
  const emblemY = margin + 250;
  const emblemH = 140;
  ctx.fillStyle = "rgba(245, 197, 24, 0.06)";
  roundRect(ctx, stubX, emblemY, stubW, emblemH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 197, 24, 0.25)";
  ctx.stroke();

  ctx.fillStyle = "#f5c518";
  ctx.font = '20px "Outfit", sans-serif';
  ctx.fillText("✦", stubX + stubW / 2, emblemY + 28);

  ctx.font = 'bold 16px "Bebas Neue", sans-serif';
  ctx.fillText("OFFICIAL VERDICT", stubX + stubW / 2, emblemY + 56);

  ctx.font = '11px "Outfit", sans-serif';
  ctx.fillStyle = "#8b8b94";
  ctx.fillText("HEAD-TO-HEAD CONSENSUS", stubX + stubW / 2, emblemY + 78);

  // Clean mini ticket code line
  drawBarcode(ctx, stubX + 24, emblemY + 98, stubW - 48, 24, serial);

  // Site Watermark Brand
  ctx.fillStyle = "#f5c518";
  ctx.font = 'bold 16px "Bebas Neue", "Outfit", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("✦ MOVIERANKER.WIN ✦", stubX + stubW / 2, H - margin - 40);
  ctx.restore();

  return canvas;
}

/**
 * Export the generated ticket as a PNG Blob
 */
export async function exportPremierePassBlob(options: TicketRenderOptions): Promise<Blob> {
  const canvas = await generatePremierePassCanvas(options);
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== "function") {
      return reject(new Error("canvas.toBlob is not supported"));
    }
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create blob from canvas"));
    }, "image/png");
  });
}

/**
 * Copy ticket image directly to the system clipboard (with graceful fallback).
 * Returns true if copied to clipboard, false if unsupported or failed.
 */
export async function copyPremierePassToClipboard(options: TicketRenderOptions): Promise<boolean> {
  try {
    const blob = await exportPremierePassBlob(options);
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === "function" &&
      typeof ClipboardItem !== "undefined"
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Download ticket image PNG file directly
 */
export async function downloadPremierePass(
  options: TicketRenderOptions,
  filename?: string,
): Promise<void> {
  const blob = await exportPremierePassBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanTitle = (options.title || "movie-ranking")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  a.href = url;
  a.download = filename || `premiere-pass-${cleanTitle}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
