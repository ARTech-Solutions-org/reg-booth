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

export async function downloadAttendeeTicket(attendee: Attendee, eventName = 'Global Innovators Summit 2026'): Promise<void> {
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

  // Background: Calm, warm eggshell cream
  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer card frame
  ctx.strokeStyle = '#E7E2D8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 24, canvas.width - 48, canvas.height - 48, 28);
  ctx.stroke();

  // Minimal top header divider
  ctx.fillStyle = '#D6D3CD';
  ctx.fillRect(100, 45, canvas.width - 200, 3);

  // Event Header Eyebrow
  ctx.fillStyle = '#64748B';
  ctx.font = '700 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('• OFFICIAL DIGITAL PASS •', canvas.width / 2, 90);

  // Event Name
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(eventName.toUpperCase(), canvas.width / 2, 135);

  // Divider line
  ctx.strokeStyle = '#E7E2D8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 168);
  ctx.lineTo(canvas.width - 80, 168);
  ctx.stroke();

  // Attendee Name
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(attendee.name, canvas.width / 2, 235);

  // Company / Affiliation
  if (attendee.company) {
    ctx.fillStyle = '#64748B';
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(attendee.company, canvas.width / 2, 280);
  }

  // Ticket Tier Pill Box (Calm muted pastel)
  const badgeY = attendee.company ? 320 : 275;
  const tierText = attendee.ticketType.toUpperCase();
  ctx.font = '800 18px "JetBrains Mono", monospace';
  const textWidth = ctx.measureText(tierText).width;
  const pillWidth = Math.max(textWidth + 50, 160);
  const pillHeight = 40;
  const pillX = (canvas.width - pillWidth) / 2;

  const tier = attendee.ticketType.toLowerCase();
  let pillBg = '#EFF5F0'; // soft sage
  let pillBorder = '#D4E5D7';
  let pillTextColor = '#2D5538';

  if (tier === 'vip') {
    pillBg = '#FDF3E7'; // soft peach/sand
    pillBorder = '#F2DECA';
    pillTextColor = '#6D4C2F';
  } else if (tier === 'speaker') {
    pillBg = '#EEF3F8'; // soft dusty cornflower
    pillBorder = '#D4E0EE';
    pillTextColor = '#2B4C6F';
  } else if (tier === 'press' || tier === 'staff') {
    pillBg = '#FBF0F1'; // soft dusty rose
    pillBorder = '#F0D5D8';
    pillTextColor = '#6E333B';
  }

  ctx.fillStyle = pillBg;
  ctx.strokeStyle = pillBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pillX, badgeY, pillWidth, pillHeight, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = pillTextColor;
  ctx.fillText(`${tierText} ACCESS`, canvas.width / 2, badgeY + 26);

  // Pure White Card Container for QR Code with soft stone border
  const qrBoxSize = 460;
  const qrBoxY = badgeY + 65;
  const qrBoxX = (canvas.width - qrBoxSize) / 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2DFD8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
  ctx.fill();
  ctx.stroke();

  // Draw QR Code
  ctx.drawImage(qrImage, qrBoxX + 30, qrBoxY + 30, qrBoxSize - 60, qrBoxSize - 60);

  // QR ID underneath
  const idY = qrBoxY + qrBoxSize + 45;
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 28px "JetBrains Mono", monospace';
  ctx.fillText(attendee.qrId, canvas.width / 2, idY);

  // Footer instructions
  ctx.fillStyle = '#64748B';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Show this pass at the entrance for check-in & badge printing', canvas.width / 2, idY + 45);

  // Trigger download
  const link = document.createElement('a');
  const safeName = attendee.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  link.download = `${safeName}-event-pass.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
