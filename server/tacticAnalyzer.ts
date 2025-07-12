import { Chess } from 'chess.js';
import { classifyChessTactics, ClassificationInput, TacticClassification } from './tacticClassifier';

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
        const isUsernameWhite = game.players.white.user.name === username;
        const startIndex = isUsernameWhite ? 2 : 1;
    
    for (let index = startIndex; index < game.analysis.length; index += 2) {
      const move = game.analysis[index];
      const prevMove = game.analysis[index - 1];
      if (
        move.judgment && move.judgment.name === 'Blunder' &&
        prevMove.judgment && prevMove.judgment.name === 'Blunder'
      ) {
        blunders.push({
          game,
          gameId: game.id,
          gameMoves: game.moves,
          gameAnalysis: game.analysis,
          index: index - 1,
          eval: move.eval ?? `mate:${move.mate}`,
          variation: move.variation || '',
          isUsernameWhite: isUsernameWhite
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
    });
  }

  // 4. Classify tactics using the classifier
  const classificationInput: ClassificationInput = {
    username,
    blunders: blunders.map(blunder => ({
      gameId: blunder.gameId,
      gameMoves: blunder.gameMoves,
      index: blunder.index,
      variation: blunder.variation,
      isUsernameWhite: blunder.isUsernameWhite
    })),
    tactics,
    blunderCount: blunders.length,
  };

  const classifications: TacticClassification[] = classifyChessTactics(classificationInput);

  return { 
    username, 
    blunders, 
    tactics, 
    blunderCount: blunders.length,
    classifications 
  };
}

export async function analyzeTacticsWithGames(username: string, games: any[], options?: { shortVariation?: boolean }) {
  // 2. Find blunders
  const blunders = [];
  for (const game of games) {
    if (!game.analysis) continue;
        const isUsernameWhite = game.players.white.user.name === username;
        const startIndex = isUsernameWhite ? 2 : 1;
    
    for (let index = startIndex; index < game.analysis.length; index += 2) {
      const move = game.analysis[index];
      const prevMove = game.analysis[index - 1];
      if (
        move.judgment && move.judgment.name === 'Blunder' &&
        prevMove.judgment && prevMove.judgment.name === 'Blunder'
      ) {
        blunders.push({
          game,
          gameId: game.id,
          gameMoves: game.moves,
          gameAnalysis: game.analysis,
          index: index - 1,
          eval: move.eval ?? `mate:${move.mate}`,
          variation: move.variation || '',
          isUsernameWhite: isUsernameWhite
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
    });
  }

  // 4. Classify tactics using the classifier
  const classificationInput: ClassificationInput = {
    username,
    blunders: blunders.map(blunder => ({
      gameId: blunder.gameId,
      gameMoves: blunder.gameMoves,
      index: blunder.index,
      variation: blunder.variation,
      isUsernameWhite: blunder.isUsernameWhite
    })),
    tactics,
    blunderCount: blunders.length,
  };

  const classifications: TacticClassification[] = classifyChessTactics(classificationInput);

  return { 
    username, 
    blunders, 
    tactics, 
    blunderCount: blunders.length,
    classifications 
  };
} 