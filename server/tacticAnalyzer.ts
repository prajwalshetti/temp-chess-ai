import { Chess } from 'chess.js';

export async function analyzeTactics(username: string, options?: { shortVariation?: boolean }) {
  // 1. Fetch games from Lichess
  const url = `https://lichess.org/api/games/user/${username}?max=50&analysed=true&evals=true&moves=true&perfType=blitz,rapid,classical`;
  const response = await fetch(url, { headers: { 'Accept': 'application/x-ndjson' } });
  if (!response.ok) {
    return { error: `Failed to fetch games for ${username}` };
  }
  const text = await response.text();
  const games = text.split('\n').filter(Boolean).map(line => JSON.parse(line));

  // 2. Find blunders
  const blunders = [];
  for (const game of games) {
    if (!game.analysis) continue;
    for (let index = 1; index < game.analysis.length; index++) {
      const move = game.analysis[index];
      const prevMove = game.analysis[index - 1];
      if (
        move.judgment && move.judgment.name === 'Blunder' &&
        prevMove.judgment && prevMove.judgment.name === 'Blunder'
      ) {
        blunders.push({
          game,
          index: index - 1,
          eval: move.eval ?? `mate:${move.mate}`,
          variation: move.variation || ''
        });
      }
    }
  }

  // 3. Generate tactics
  const tactics = [];
  for (const blunder of blunders) {
    const game = new Chess();
    const moves = blunder.game.moves.split(' ');
    let blunderMove = '';
    let result = '1-0';
    let termination = '';
    for (let i = 0; i < moves.length; i++) {
      if (i === blunder.index) {
        blunderMove = moves[i];
        const evalVal = blunder.game.analysis?.[i]?.eval;
        const mateVal = blunder.game.analysis?.[i]?.mate;
        termination = evalVal !== undefined ? evalVal.toString() : `mate:${mateVal}`;
        if ((i + 1) % 2 !== 0) result = '0-1';
        break;
      }
      game.move(moves[i]);
    }
    const fen = game.fen();
    let variation = blunder.variation.split(' ');
    variation.unshift(blunderMove);
    if (options?.shortVariation && !termination.includes('mate')) {
      variation = variation.slice(0, 6);
    }
    const tacticGame = new Chess(fen);
    for (const move of variation) {
      try {
        tacticGame.move(move);
      } catch {
        break;
      }
    }
    tactics.push({
      fen,
      moves: variation,
      result,
      termination,
      pgn: tacticGame.pgn()
    });
  }

  return { username, tactics, blunderCount: blunders.length };
} 