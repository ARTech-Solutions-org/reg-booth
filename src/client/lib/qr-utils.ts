import QRCode from 'qrcode';
import type { Attendee } from '../../shared/types.js';

export async function generateQrDataUrl(text: string, size = 300): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

export async function downloadAttendeeTicket(attendee: Attendee, eventName = 'ARTECH • LIVE THE EXPERIENCE'): Promise<void> {
  const qrDataUrl = await generateQrDataUrl(attendee.qrId, 600);
  if (!qrDataUrl) return;

  const qrImage = new Image();
  qrImage.src = qrDataUrl;
  await new Promise<void>((resolve) => {
    qrImage.onload = () => resolve();
  });

  const canvas = document.createElement('canvas');
  // High-res retina card canvas (800 x 1100 px)
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background: Deep obsidian calm background
  ctx.fillStyle = '#08090C';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer card frame (subtle silver/zinc stroke)
  ctx.strokeStyle = '#27272A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 24, canvas.width - 48, canvas.height - 48, 28);
  ctx.stroke();

  // Minimal top header accent
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(100, 45, canvas.width - 200, 2);

  // Event Header Eyebrow
  ctx.fillStyle = '#A1A1AA';
  ctx.font = '700 15px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('• OFFICIAL DIGITAL CREDENTIAL •', canvas.width / 2, 88);

  // Event Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(eventName.toUpperCase(), canvas.width / 2, 132);

  // Divider line
  ctx.strokeStyle = '#27272A';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, 165);
  ctx.lineTo(canvas.width - 80, 165);
  ctx.stroke();

  // Attendee Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(attendee.name, canvas.width / 2, 235);

  // Company / Affiliation
  if (attendee.company) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(attendee.company, canvas.width / 2, 280);
  }

  // Ticket Tier Pill Box (Monochromatic: black, white, silver)
  const badgeY = attendee.company ? 320 : 275;
  const tierText = attendee.ticketType.toUpperCase();
  ctx.font = '800 18px "JetBrains Mono", monospace';
  const textWidth = ctx.measureText(`${tierText} ACCESS`).width;
  const pillWidth = Math.max(textWidth + 50, 180);
  const pillHeight = 40;
  const pillX = (canvas.width - pillWidth) / 2;

  const tier = attendee.ticketType.toLowerCase();
  let pillBg = '#18181B';
  let pillBorder = '#3F3F46';
  let pillTextColor = '#E4E4E7';

  if (tier === 'vip') {
    pillBg = '#FFFFFF';
    pillBorder = '#FFFFFF';
    pillTextColor = '#000000';
  } else if (tier === 'speaker') {
    pillBg = '#27272A';
    pillBorder = '#52525B';
    pillTextColor = '#FAFAFA';
  } else if (tier === 'press' || tier === 'staff') {
    pillBg = '#3F3F46';
    pillBorder = '#71717A';
    pillTextColor = '#FFFFFF';
  }

  ctx.fillStyle = pillBg;
  ctx.strokeStyle = pillBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(pillX, badgeY, pillWidth, pillHeight, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = pillTextColor;
  ctx.fillText(`${tierText} ACCESS`, canvas.width / 2, badgeY + 26);

  // Pure White Card Container for QR Code with rounded corners
  // (Ensures high optical contrast for mobile screens & physical barcode scanners)
  const qrBoxSize = 460;
  const qrBoxY = badgeY + 65;
  const qrBoxX = (canvas.width - qrBoxSize) / 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E4E4E7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
  ctx.fill();
  ctx.stroke();

  // Draw QR Code
  ctx.drawImage(qrImage, qrBoxX + 30, qrBoxY + 30, qrBoxSize - 60, qrBoxSize - 60);

  // QR ID underneath
  const idY = qrBoxY + qrBoxSize + 45;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 28px "JetBrains Mono", monospace';
  ctx.fillText(attendee.qrId, canvas.width / 2, idY);

  // Footer instructions
  ctx.fillStyle = '#71717A';
  ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Show this pass at ARTECH station for check-in & badge printing', canvas.width / 2, idY + 45);

  // Trigger download
  const link = document.createElement('a');
  const safeName = attendee.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  link.download = `${safeName}-artech-pass.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
