/**
 * Client-side HTML5 Canvas generator for 9:16 Instagram Story Share Cards.
 * Generates crisp 1080x1920 PNG images with velvet theater or slate-noir aesthetics.
 */

export interface StoryCardOptions {
  title: string;
  themeSlug?: string | null;
  curatorHandle?: string | null;
  totalMovies?: number;
  connectionSolved?: boolean;
  topMovies: Array<{
    title: string;
    releaseYear?: number | null;
    posterPath?: string | null;
  }>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function generateStoryCardBlob(options: StoryCardOptions): Promise<Blob> {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  const isMarquee = !!options.themeSlug;

  // 1. Draw Background
  if (isMarquee) {
    // Rich theater velvet gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#1c0409");
    bgGrad.addColorStop(0.3, "#340b15");
    bgGrad.addColorStop(0.7, "#22060d");
    bgGrad.addColorStop(1, "#0f0205");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Warm golden spotlight from top center
    const spotlight = ctx.createRadialGradient(width / 2, 200, 50, width / 2, 500, 700);
    spotlight.addColorStop(0, "rgba(245, 197, 24, 0.18)");
    spotlight.addColorStop(0.5, "rgba(245, 197, 24, 0.05)");
    spotlight.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = spotlight;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Slate-noir minimalist studio gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#0b0f15");
    bgGrad.addColorStop(0.4, "#161e29");
    bgGrad.addColorStop(0.8, "#0d1117");
    bgGrad.addColorStop(1, "#07090d");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Amber overhead glow
    const glow = ctx.createRadialGradient(width / 2, 250, 40, width / 2, 450, 600);
    glow.addColorStop(0, "rgba(224, 170, 62, 0.12)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Draw Header
  ctx.textAlign = "center";
  if (isMarquee) {
    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#f5c518";
    ctx.letterSpacing = "6px";
    ctx.fillText("✦ WEEKLY MARQUEE ✦", width / 2, 220);

    ctx.font = "900 68px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.letterSpacing = "2px";
    const titleText = options.title.toUpperCase();
    ctx.fillText(titleText, width / 2, 320, width - 160);
  } else {
    ctx.font = "900 68px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#f5c518";
    ctx.letterSpacing = "2px";
    ctx.fillText(options.title.toUpperCase(), width / 2, 240, width - 160);

    ctx.font = "500 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.letterSpacing = "1px";
    const authorText = options.curatorHandle
      ? `Ranked by @${options.curatorHandle}`
      : "Ranked on MovieRanker";
    ctx.fillText(authorText, width / 2, 315);
  }

  // 3. Draw Top 3 Movie Posters (Podium formation)
  const top3 = options.topMovies.slice(0, 3);
  const posterW = 270;
  const posterH = 405; // 2:3 ratio

  // Coordinates: 2nd Place (Left), 1st Place (Center, Elevated), 3rd Place (Right)
  const positions = [
    { rank: 2, x: width / 2 - 300 - posterW / 2 + 10, y: 560, color: "#d0d4dc", label: "2nd" },
    { rank: 1, x: width / 2 - posterW / 2, y: 490, color: "#f5c518", label: "1st" },
    { rank: 3, x: width / 2 + 300 - posterW / 2 - 10, y: 580, color: "#cd7f32", label: "3rd" },
  ];

  // Draw 2nd, 3rd, then 1st in center
  const renderOrder = [
    { movie: top3[1], pos: positions[0] },
    { movie: top3[2], pos: positions[2] },
    { movie: top3[0], pos: positions[1] },
  ];

  for (const item of renderOrder) {
    if (!item.movie) continue;
    const { x, y, color, label, rank } = item.pos;

    // Draw Poster Frame & Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 15;

    // Try loading TMDB poster image or fallback to sleek card
    let imgLoaded = false;
    if (item.movie.posterPath) {
      try {
        const fullUrl = `https://image.tmdb.org/t/p/w500${item.movie.posterPath}`;
        const img = await loadImage(fullUrl);
        ctx.drawImage(img, x, y, posterW, posterH);
        imgLoaded = true;
      } catch {
        // fallback
      }
    }

    if (!imgLoaded) {
      ctx.fillStyle = "#1e2430";
      ctx.fillRect(x, y, posterW, posterH);

      // Stylized title placeholder
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.movie.title, x + posterW / 2, y + posterH / 2 - 15, posterW - 30);
      if (item.movie.releaseYear) {
        ctx.font = "20px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(String(item.movie.releaseYear), x + posterW / 2, y + posterH / 2 + 25);
      }
    }
    ctx.restore();

    // Border ring
    ctx.strokeStyle = rank === 1 ? "rgba(245, 197, 24, 0.6)" : "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = rank === 1 ? 4 : 2;
    ctx.strokeRect(x, y, posterW, posterH);

    // Medal Ribbon Badge on top of poster
    const badgeX = x + posterW / 2;
    const badgeY = y - 25;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 36, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.fillStyle = "#0c0d10";
    ctx.font = "900 24px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, badgeX, badgeY);

    // Movie Title below poster
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(item.movie.title, x + posterW / 2, y + posterH + 20, posterW + 20);
  }

  // 4. Draw Badges & Accomplishments
  const badgeY = 1280;
  if (isMarquee) {
    // Wax seal badge for Marquee
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, badgeY, 90, 0, Math.PI * 2);
    const sealGrad = ctx.createLinearGradient(width / 2 - 90, badgeY - 90, width / 2 + 90, badgeY + 90);
    sealGrad.addColorStop(0, "#ffdf58");
    sealGrad.addColorStop(0.5, "#d49a0b");
    sealGrad.addColorStop(1, "#8f6202");
    ctx.fillStyle = sealGrad;
    ctx.shadowColor = "rgba(245, 197, 24, 0.4)";
    ctx.shadowBlur = 30;
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#160507";
    ctx.font = "900 22px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦ SECRET ✦", width / 2, badgeY - 26);
    ctx.fillText("CONNECTION", width / 2, badgeY + 2);
    ctx.fillText("UNLOCKED", width / 2, badgeY + 30);
    ctx.restore();
  } else {
    // Clean status pill for custom lists
    const pillText = `${options.totalMovies ?? top3.length} FILMS RANKED · FULL CONSENSUS`;
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    const pillW = 680;
    const pillH = 72;
    const pillX = width / 2 - pillW / 2;
    ctx.beginPath();
    ctx.roundRect(pillX, badgeY - pillH / 2, pillW, pillH, 36);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pillText, width / 2, badgeY);
    ctx.restore();
  }

  // 5. Footer Watermark
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "500 32px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const footerText = isMarquee
    ? "Rank this week's marquee · movieranker.win"
    : "Create your ranking on movieranker.win";
  ctx.fillText(footerText, width / 2, 1780);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create blob from canvas"));
    }, "image/png");
  });
}
