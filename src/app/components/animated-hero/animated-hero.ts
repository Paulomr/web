import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

// Componente original (React/shadcn) "PromptingIsAllYouNeed" portado a Angular.
// La lógica de canvas 2D (Pong + texto en píxeles) es idéntica; solo cambian
// los hooks de React (useEffect/useRef) por el ciclo de vida de Angular.

const COLOR = '#4a3b47';
// Título "MINIJUEGOS" en rosa fucsia de la marca.
const TITLE_COLOR = '#f5379c';
const HIT_COLOR = '#f7bcdd';
const BACKGROUND_COLOR = '#fdf9f7';
const BALL_COLOR = '#e78ab8';
const PADDLE_COLOR = '#8fcfe0';
/** Logo (solo la cabeza) que reemplaza a la pelota que rebota. */
const BALL_LOGO_SRC = 'fotos/bearnie-logo.webp';
const LETTER_SPACING = 1;
const WORD_SPACING = 3;

const PIXEL_MAP: Record<string, number[][]> = {
  P: [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
  ],
  R: [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
    [1, 0, 1, 0],
    [1, 0, 0, 1],
  ],
  O: [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
  ],
  M: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  T: [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  I: [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1],
  ],
  N: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 0, 0, 1],
  ],
  G: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  S: [
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 1],
    [1, 1, 1, 1],
  ],
  A: [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
  ],
  L: [
    [1, 0, 0, 0],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
    [1, 1, 1, 1],
  ],
  Y: [
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  U: [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
  ],
  D: [
    [1, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 0],
  ],
  E: [
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 1, 1, 1],
  ],
  // --- Letras añadidas para "MINIJUEGOS" y "DISFRUTA ... COMPITE" ---
  J: [
    [0, 0, 1, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
  ],
  F: [
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 1, 1, 0],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
  ],
  C: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
};

interface Pixel {
  x: number;
  y: number;
  size: number;
  hit: boolean;
  /** true = pertenece al título grande "MINIJUEGOS" (se pinta en fucsia). */
  big: boolean;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  targetY: number;
  isVertical: boolean;
}

@Component({
  selector: 'app-animated-hero',
  templateUrl: './animated-hero.html',
  styleUrl: './animated-hero.css',
})
export class AnimatedHero implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  /** Color de fondo del canvas. El padre lo actualiza según el scroll. */
  bgColor = BACKGROUND_COLOR;

  private pixels: Pixel[] = [];
  private ball: Ball = { x: 0, y: 0, dx: 0, dy: 0, radius: 0 };
  private paddles: Paddle[] = [];
  private scale = 1;
  private animationId = 0;
  private resizeObserver?: ResizeObserver;
  private readonly ballLogo = new Image();
  private ballLogoReady = false;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // El logo (cabeza de Bearnie) se dibuja en vez de la pelota cuando carga.
    this.ballLogo.onload = () => (this.ballLogoReady = true);
    this.ballLogo.src = BALL_LOGO_SRC;

    // Ahora el hero es un banner contenido: el canvas se ajusta al tamaño que
    // le da su contenedor (no a la ventana completa).
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      if (canvas.width === 0 || canvas.height === 0) return;
      this.scale = Math.min(canvas.width / 1000, canvas.height / 1000);
      initializeGame();
    };

    const initializeGame = () => {
      const scale = this.scale;
      const LARGE_PIXEL_SIZE = 8 * scale;
      const SMALL_PIXEL_SIZE = 4 * scale;
      const BALL_SPEED = 6 * scale;

      this.pixels = [];

      // La primera línea es el título (píxel grande); las siguientes, el
      // subtítulo (píxel pequeño). En pantallas angostas el subtítulo se parte
      // en dos: en una sola línea obligaba a encoger TODO el texto hasta
      // volverlo ilegible en un celular.
      const TITLE = 'MINIJUEGOS';
      const lines =
        canvas.width < 700
          ? [TITLE, 'DISFRUTA DE NUESTROS', 'MINIJUEGOS Y COMPITE']
          : [TITLE, 'DISFRUTA DE NUESTROS MINIJUEGOS Y COMPITE'];

      const calculateWordWidth = (word: string, pixelSize: number) => {
        return (
          word.split('').reduce((width, letter) => {
            const letterWidth = PIXEL_MAP[letter]?.[0]?.length ?? 0;
            return width + letterWidth * pixelSize + LETTER_SPACING * pixelSize;
          }, 0) -
          LETTER_SPACING * pixelSize
        );
      };

      /** Ancho de una línea completa, contando los espacios entre palabras. */
      const calculateLineWidth = (line: string, pixelSize: number) => {
        return line.split(' ').reduce((width, word, index) => {
          return width + calculateWordWidth(word, pixelSize) + (index > 0 ? WORD_SPACING * pixelSize : 0);
        }, 0);
      };

      // La línea más ancha (medida con su propio tamaño de píxel) manda la escala.
      const totalWidth = lines.reduce((max, line, index) => {
        return Math.max(max, calculateLineWidth(line, index === 0 ? LARGE_PIXEL_SIZE : SMALL_PIXEL_SIZE));
      }, 0);
      const scaleFactor = (canvas.width * 0.8) / totalWidth;

      const adjustedLargePixelSize = LARGE_PIXEL_SIZE * scaleFactor;
      const adjustedSmallPixelSize = SMALL_PIXEL_SIZE * scaleFactor;

      const largeTextHeight = 5 * adjustedLargePixelSize;
      const smallTextHeight = 5 * adjustedSmallPixelSize;
      const spaceBetweenLines = 5 * adjustedLargePixelSize;
      const spaceBetweenSmall = 2 * adjustedSmallPixelSize;
      const smallLines = lines.length - 1;
      const totalTextHeight =
        largeTextHeight +
        spaceBetweenLines +
        smallLines * smallTextHeight +
        (smallLines - 1) * spaceBetweenSmall;

      let startY = (canvas.height - totalTextHeight) / 2;

      lines.forEach((line, lineIndex) => {
        const big = lineIndex === 0;
        const pixelSize = big ? adjustedLargePixelSize : adjustedSmallPixelSize;
        let startX = (canvas.width - calculateLineWidth(line, pixelSize)) / 2;

        line.split(' ').forEach((subWord) => {
          subWord.split('').forEach((letter) => {
            const pixelMap = PIXEL_MAP[letter];
            if (!pixelMap) return;

            for (let i = 0; i < pixelMap.length; i++) {
              for (let j = 0; j < pixelMap[i].length; j++) {
                if (pixelMap[i][j]) {
                  const x = startX + j * pixelSize;
                  const y = startY + i * pixelSize;
                  this.pixels.push({ x, y, size: pixelSize, hit: false, big });
                }
              }
            }
            startX += (pixelMap[0].length + LETTER_SPACING) * pixelSize;
          });
          startX += WORD_SPACING * pixelSize;
        });

        startY += big ? largeTextHeight + spaceBetweenLines : smallTextHeight + spaceBetweenSmall;
      });

      // Posición inicial de la pelota: cerca de la esquina superior derecha.
      const ballStartX = canvas.width * 0.9;
      const ballStartY = canvas.height * 0.1;

      this.ball = {
        x: ballStartX,
        y: ballStartY,
        dx: -BALL_SPEED,
        dy: BALL_SPEED,
        radius: adjustedLargePixelSize / 2,
      };

      const paddleWidth = adjustedLargePixelSize;
      const paddleLength = 10 * adjustedLargePixelSize;

      this.paddles = [
        {
          x: 0,
          y: canvas.height / 2 - paddleLength / 2,
          width: paddleWidth,
          height: paddleLength,
          targetY: canvas.height / 2 - paddleLength / 2,
          isVertical: true,
        },
        {
          x: canvas.width - paddleWidth,
          y: canvas.height / 2 - paddleLength / 2,
          width: paddleWidth,
          height: paddleLength,
          targetY: canvas.height / 2 - paddleLength / 2,
          isVertical: true,
        },
        {
          x: canvas.width / 2 - paddleLength / 2,
          y: 0,
          width: paddleLength,
          height: paddleWidth,
          targetY: canvas.width / 2 - paddleLength / 2,
          isVertical: false,
        },
        {
          x: canvas.width / 2 - paddleLength / 2,
          y: canvas.height - paddleWidth,
          width: paddleLength,
          height: paddleWidth,
          targetY: canvas.width / 2 - paddleLength / 2,
          isVertical: false,
        },
      ];
    };

    const updateGame = () => {
      const ball = this.ball;
      const paddles = this.paddles;

      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.dy = -ball.dy;
      }
      if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
        ball.dx = -ball.dx;
      }

      paddles.forEach((paddle) => {
        if (paddle.isVertical) {
          if (
            ball.x - ball.radius < paddle.x + paddle.width &&
            ball.x + ball.radius > paddle.x &&
            ball.y > paddle.y &&
            ball.y < paddle.y + paddle.height
          ) {
            ball.dx = -ball.dx;
          }
        } else {
          if (
            ball.y - ball.radius < paddle.y + paddle.height &&
            ball.y + ball.radius > paddle.y &&
            ball.x > paddle.x &&
            ball.x < paddle.x + paddle.width
          ) {
            ball.dy = -ball.dy;
          }
        }
      });

      paddles.forEach((paddle) => {
        if (paddle.isVertical) {
          paddle.targetY = ball.y - paddle.height / 2;
          paddle.targetY = Math.max(0, Math.min(canvas.height - paddle.height, paddle.targetY));
          paddle.y += (paddle.targetY - paddle.y) * 0.1;
        } else {
          paddle.targetY = ball.x - paddle.width / 2;
          paddle.targetY = Math.max(0, Math.min(canvas.width - paddle.width, paddle.targetY));
          paddle.x += (paddle.targetY - paddle.x) * 0.1;
        }
      });

      this.pixels.forEach((pixel) => {
        if (
          !pixel.hit &&
          ball.x + ball.radius > pixel.x &&
          ball.x - ball.radius < pixel.x + pixel.size &&
          ball.y + ball.radius > pixel.y &&
          ball.y - ball.radius < pixel.y + pixel.size
        ) {
          pixel.hit = true;
          const centerX = pixel.x + pixel.size / 2;
          const centerY = pixel.y + pixel.size / 2;
          if (Math.abs(ball.x - centerX) > Math.abs(ball.y - centerY)) {
            ball.dx = -ball.dx;
          } else {
            ball.dy = -ball.dy;
          }
        }
      });
    };

    const drawGame = () => {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      this.pixels.forEach((pixel) => {
        ctx.fillStyle = pixel.hit ? HIT_COLOR : pixel.big ? TITLE_COLOR : COLOR;
        ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
      });

      // La pelota es el logo (cabeza de Bearnie), recortado en círculo. Se
      // dibuja algo más grande que el radio de colisión para que se lea bien.
      const ball = this.ball;
      if (this.ballLogoReady) {
        const d = ball.radius * 4;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, d / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(this.ballLogo, ball.x - d / 2, ball.y - d / 2, d, d);
        ctx.restore();
      } else {
        ctx.fillStyle = BALL_COLOR;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = PADDLE_COLOR;
      this.paddles.forEach((paddle) => {
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
      });
    };

    const gameLoop = () => {
      updateGame();
      drawGame();
      this.animationId = requestAnimationFrame(gameLoop);
    };

    // ResizeObserver redibuja cuando cambia el tamaño del contenedor (y dispara
    // el primer dimensionado en cuanto el canvas tiene layout).
    this.resizeObserver = new ResizeObserver(() => resizeCanvas());
    this.resizeObserver.observe(canvas);
    resizeCanvas();
    gameLoop();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
  }
}
