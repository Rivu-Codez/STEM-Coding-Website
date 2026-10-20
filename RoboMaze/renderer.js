const GRID_SIZE = 8;
const TILE_SIZE = 45;

export function createRoboMazeRenderer({ canvas, levels, getLevelIndex, getRobot }) {
  const ctx = canvas.getContext('2d');

  return function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grid = levels[getLevelIndex()].grid;

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < GRID_SIZE; column += 1) {
        const type = grid[row][column];
        ctx.fillStyle = type === 1 ? '#1e293b' : '#0f172a';
        ctx.fillRect(column * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = type === 1 ? '#334155' : '#1e293b';
        ctx.strokeRect(column * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        if (type === 2) {
          ctx.font = '30px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', column * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
        }
      }
    }

    const robot = getRobot();
    const rx = robot.x * TILE_SIZE + TILE_SIZE / 2;
    const ry = robot.y * TILE_SIZE + TILE_SIZE / 2;
    const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const angle = angles[robot.dir];

    ctx.beginPath();
    ctx.arc(rx, ry, 21, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + Math.cos(angle) * 16, ry + Math.sin(angle) * 16);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rx + Math.cos(angle) * 6, ry + Math.sin(angle) * 6, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };
}
