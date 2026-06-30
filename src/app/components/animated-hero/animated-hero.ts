import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

// Componente original (React/shadcn) "PromptingIsAllYouNeed" portado a Angular.
// La lógica de canvas 2D (Pong + texto en píxeles) es idéntica; solo cambian
// los hooks de React (useEffect/useRef) por el ciclo de vida de Angular.

const COLOR = '#FFFFFF';
const HIT_COLOR = '#3a2a4d';
const BACKGROUND_COLOR = '#0a0a0f';
const BALL_COLOR = '#ff62b4';
const PADDLE_COLOR = '#22d3ee';
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

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      const words = ['MINIJUEGOS', 'DISFRUTA DE NUESTROS MINIJUEGOS Y COMPITE'];

      const calculateWordWidth = (word: string, pixelSize: number) => {
        return (
          word.split('').reduce((width, letter) => {
            const letterWidth = PIXEL_MAP[letter]?.[0]?.length ?? 0;
            return width + letterWidth * pixelSize + LETTER_SPACING * pixelSize;
          }, 0) -
          LETTER_SPACING * pixelSize
        );
      };

      const totalWidthLarge = calculateWordWidth(words[0], LARGE_PIXEL_SIZE);
      const totalWidthSmall = words[1].split(' ').reduce((width, word, index) => {
        return width + calculateWordWidth(word, SMALL_PIXEL_SIZE) + (index > 0 ? WORD_SPACING * SMALL_PIXEL_SIZE : 0);
      }, 0);
      const totalWidth = Math.max(totalWidthLarge, totalWidthSmall);
      const scaleFactor = (canvas.width * 0.8) / totalWidth;

      const adjustedLargePixelSize = LARGE_PIXEL_SIZE * scaleFactor;
      const adjustedSmallPixelSize = SMALL_PIXEL_SIZE * scaleFactor;

      const largeTextHeight = 5 * adjustedLargePixelSize;
      const smallTextHeight = 5 * adjustedSmallPixelSize;
      const spaceBetweenLines = 5 * adjustedLargePixelSize;
      const totalTextHeight = largeTextHeight + spaceBetweenLines + smallTextHeight;

      let startY = (canvas.height - totalTextHeight) / 2;

      words.forEach((word, wordIndex) => {
        const pixelSize = wordIndex === 0 ? adjustedLargePixelSize : adjustedSmallPixelSize;
        const totalWidth =
          wordIndex === 0
            ? calculateWordWidth(word, adjustedLargePixelSize)
            : words[1].split(' ').reduce((width, w, index) => {
                return (
                  width +
                  calculateWordWidth(w, adjustedSmallPixelSize) +
                  (index > 0 ? WORD_SPACING * adjustedSmallPixelSize : 0)
                );
              }, 0);

        let startX = (canvas.width - totalWidth) / 2;

        if (wordIndex === 1) {
          word.split(' ').forEach((subWord) => {
            subWord.split('').forEach((letter) => {
              const pixelMap = PIXEL_MAP[letter];
              if (!pixelMap) return;

              for (let i = 0; i < pixelMap.length; i++) {
                for (let j = 0; j < pixelMap[i].length; j++) {
                  if (pixelMap[i][j]) {
                    const x = startX + j * pixelSize;
                    const y = startY + i * pixelSize;
                    this.pixels.push({ x, y, size: pixelSize, hit: false });
                  }
                }
              }
              startX += (pixelMap[0].length + LETTER_SPACING) * pixelSize;
            });
            startX += WORD_SPACING * adjustedSmallPixelSize;
          });
        } else {
          word.split('').forEach((letter) => {
            const pixelMap = PIXEL_MAP[letter];
            if (!pixelMap) return;

            for (let i = 0; i < pixelMap.length; i++) {
              for (let j = 0; j < pixelMap[i].length; j++) {
                if (pixelMap[i][j]) {
                  const x = startX + j * pixelSize;
                  const y = startY + i * pixelSize;
                  this.pixels.push({ x, y, size: pixelSize, hit: false });
                }
              }
            }
            startX += (pixelMap[0].length + LETTER_SPACING) * pixelSize;
          });
        }
        startY += wordIndex === 0 ? largeTextHeight + spaceBetweenLines : 0;
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
        ctx.fillStyle = pixel.hit ? HIT_COLOR : COLOR;
        ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
      });

      ctx.fillStyle = BALL_COLOR;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();

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
