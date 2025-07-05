import React, { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface AnalysisResult {
  fen: string;
  eval: number | string | null;
  best_move: string | null;
  best_line: string[];
  depth: number;
  success: boolean;
  error?: string;
}

function ChessPositionAnalysis() {
  const [position, setPosition] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [depth, setDepth] = useState(15);
  const [timeLimit, setTimeLimit] = useState(1000);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  const onDrop = useCallback((sourceSquare: string, targetSquare: string, piece: string) => {
    // Allow any piece placement for position setup
    // Convert the current position to a board representation
    const chess = new Chess(position);
    const board = chess.board();
    
    // Parse the piece string to get color and type
    const pieceColor = piece.charAt(0) === 'w' ? 'w' : 'b';
    const pieceType = piece.charAt(1) as 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
    
    // Convert squares to board coordinates
    const sourceFile = sourceSquare.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
    const sourceRank = 8 - parseInt(sourceSquare.charAt(1)); // '1' = 7, '2' = 6, etc.
    const targetFile = targetSquare.charCodeAt(0) - 97;
    const targetRank = 8 - parseInt(targetSquare.charAt(1));
    
    // Remove piece from source square
    board[sourceRank][sourceFile] = null;
    
    // Place piece on target square
    board[targetRank][targetFile] = { color: pieceColor, type: pieceType, square: targetSquare as any };
    
    // Convert board back to FEN
    let fen = '';
    for (let rank = 0; rank < 8; rank++) {
      let emptyCount = 0;
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          const symbol = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
          fen += symbol;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      if (rank < 7) fen += '/';
    }
    
    // Add the rest of the FEN string (turn, castling, en passant, etc.)
    const fenParts = position.split(' ');
    fen += ` ${fenParts[1]} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
    
    setPosition(fen);
    setAnalysis(null); // Clear previous analysis when position changes
    return true;
  }, [position]);

  const analyzePosition = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Validate the FEN before sending to analysis
      const chess = new Chess();
      try {
        chess.load(position);
      } catch (fenError) {
        throw new Error('Invalid chess position. Please check your piece setup.');
      }

      const response = await fetch('/api/analyze-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fen: position,
          depth,
          timeLimit
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result: AnalysisResult = await response.json();
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const formatEvaluation = (evalScore: number | string | null) => {
    if (evalScore === null) return 'N/A';
    if (typeof evalScore === 'string') {
      // Handle mate scores - flip the sign for Black's turn
      if (evalScore.startsWith('M')) {
        const isBlackTurn = getActivePlayer() === 'Black';
        const mateValue = evalScore.substring(1); // Remove 'M'
        const mateNumber = parseInt(mateValue);
        if (isBlackTurn && !isNaN(mateNumber)) {
          return `M${-mateNumber}`; // Flip mate score for Black's turn
        }
        return evalScore;
      }
      return evalScore;
    }
    
    const score = Number(evalScore);
    const isBlackTurn = getActivePlayer() === 'Black';
    const adjustedScore = isBlackTurn ? -score : score;
    
    if (adjustedScore > 0) {
      return `+${adjustedScore.toFixed(2)}`;
    }
    return adjustedScore.toFixed(2);
  };

  const getEvaluationColor = (evalScore: number | string | null) => {
    if (evalScore === null) return 'text-gray-600';
    if (typeof evalScore === 'string') {
      return evalScore.startsWith('M') ? 'text-green-600 font-bold' : 'text-gray-600';
    }
    
    const score = Number(evalScore);
    const isBlackTurn = getActivePlayer() === 'Black';
    const adjustedScore = isBlackTurn ? -score : score;
    
    if (adjustedScore > 0.5) return 'text-green-600';
    if (adjustedScore < -0.5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getActivePlayer = () => {
    const fenParts = position.split(' ');
    return fenParts[1] === 'w' ? 'White' : 'Black';
  };

  const toggleActivePlayer = () => {
    const fenParts = position.split(' ');
    fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
    setPosition(fenParts.join(' '));
  };

  const resetToStarting = () => {
    setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    setAnalysis(null);
  };

  const loadPosition = (fen: string) => {
    setPosition(fen);
    setAnalysis(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Chess Position Analysis
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chess Board Section */}
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Chess Board</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  Flip Board
                </button>
                <button
                  onClick={resetToStarting}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
            
            <div className="w-full max-w-md mx-auto">
              <Chessboard
                position={position}
                onPieceDrop={onDrop}
                arePiecesDraggable={true}
                boardOrientation={boardOrientation}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </div>
            
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">Active Player:</span>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    getActivePlayer() === 'White' 
                      ? 'bg-white text-black border border-gray-300' 
                      : 'bg-black text-white'
                  }`}>
                    {getActivePlayer()}
                  </span>
                </div>
                <button
                  onClick={toggleActivePlayer}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  Switch Turn
                </button>
              </div>
            </div>
          </div>

          {/* Piece Setup Helper */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Add Pieces</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">White Pieces</h4>
                <div className="flex flex-wrap gap-1">
                  {['♔', '♕', '♖', '♗', '♘', '♙'].map((piece, index) => (
                    <button
                      key={`w${index}`}
                      onClick={() => {
                        // Add piece to a1 (or first available square)
                        const chess = new Chess(position);
                        const board = chess.board();
                        // Find first empty square
                        for (let rank = 7; rank >= 0; rank--) {
                          for (let file = 0; file < 8; file++) {
                            if (!board[rank][file]) {
                              const pieceTypes = ['k', 'q', 'r', 'b', 'n', 'p'];
                              const pieceType = pieceTypes[index];
                              board[rank][file] = { 
                                color: 'w', 
                                type: pieceType as any, 
                                square: `${String.fromCharCode(97 + file)}${8 - rank}` as any 
                              };
                              
                              // Convert back to FEN
                              let fen = '';
                              for (let r = 0; r < 8; r++) {
                                let emptyCount = 0;
                                for (let f = 0; f < 8; f++) {
                                  const p = board[r][f];
                                  if (p) {
                                    if (emptyCount > 0) {
                                      fen += emptyCount;
                                      emptyCount = 0;
                                    }
                                    const symbol = p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
                                    fen += symbol;
                                  } else {
                                    emptyCount++;
                                  }
                                }
                                if (emptyCount > 0) {
                                  fen += emptyCount;
                                }
                                if (r < 7) fen += '/';
                              }
                              
                              const fenParts = position.split(' ');
                              fen += ` ${fenParts[1]} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
                              setPosition(fen);
                              setAnalysis(null);
                              return;
                            }
                          }
                        }
                      }}
                      className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center text-lg hover:bg-gray-50"
                    >
                      {piece}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Black Pieces</h4>
                <div className="flex flex-wrap gap-1">
                  {['♚', '♛', '♜', '♝', '♞', '♟'].map((piece, index) => (
                    <button
                      key={`b${index}`}
                      onClick={() => {
                        // Add piece to a1 (or first available square)
                        const chess = new Chess(position);
                        const board = chess.board();
                        // Find first empty square
                        for (let rank = 7; rank >= 0; rank--) {
                          for (let file = 0; file < 8; file++) {
                            if (!board[rank][file]) {
                              const pieceTypes = ['k', 'q', 'r', 'b', 'n', 'p'];
                              const pieceType = pieceTypes[index];
                              board[rank][file] = { 
                                color: 'b', 
                                type: pieceType as any, 
                                square: `${String.fromCharCode(97 + file)}${8 - rank}` as any 
                              };
                              
                              // Convert back to FEN
                              let fen = '';
                              for (let r = 0; r < 8; r++) {
                                let emptyCount = 0;
                                for (let f = 0; f < 8; f++) {
                                  const p = board[r][f];
                                  if (p) {
                                    if (emptyCount > 0) {
                                      fen += emptyCount;
                                      emptyCount = 0;
                                    }
                                    const symbol = p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
                                    fen += symbol;
                                  } else {
                                    emptyCount++;
                                  }
                                }
                                if (emptyCount > 0) {
                                  fen += emptyCount;
                                }
                                if (r < 7) fen += '/';
                              }
                              
                              const fenParts = position.split(' ');
                              fen += ` ${fenParts[1]} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
                              setPosition(fen);
                              setAnalysis(null);
                              return;
                            }
                          }
                        }
                      }}
                      className="w-8 h-8 bg-gray-800 text-white border border-gray-600 rounded flex items-center justify-center text-lg hover:bg-gray-700"
                    >
                      {piece}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Click a piece to add it to the first available square on the board
            </div>
          </div>

          {/* Analysis Controls */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Analysis Settings</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Depth (1-20)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Limit (ms)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <button
              onClick={analyzePosition}
              disabled={loading}
              className={`w-full px-6 py-3 rounded-md font-medium transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Analyzing...' : 'Analyze Position'}
            </button>
          </div>

          {/* Quick Positions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Quick Load</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                Starting Position
              </button>
              <button
                onClick={() => loadPosition('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                Italian Game
              </button>
              <button
                onClick={() => loadPosition('rnbqkb1r/pp1p1ppp/5n2/2p1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                Spanish Opening
              </button>
            </div>
          </div>
        </div>

        {/* Analysis Results Section */}
        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Analysis Results</h2>
              
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-md shadow-sm">
                  <h3 className="font-medium text-gray-700 mb-2">Evaluation</h3>
                  <div className={`text-3xl font-bold ${getEvaluationColor(analysis.eval)}`}>
                    {formatEvaluation(analysis.eval)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {typeof analysis.eval === 'string' && analysis.eval.startsWith('M') 
                      ? 'Forced mate' 
                      : 'Pawns advantage'}
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-md shadow-sm">
                  <h3 className="font-medium text-gray-700 mb-2">Best Move</h3>
                  <div className="text-xl font-mono text-blue-600 bg-blue-50 p-2 rounded">
                    {analysis.best_move || 'N/A'}
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-md shadow-sm">
                  <h3 className="font-medium text-gray-700 mb-2">Best Line</h3>
                  <div className="text-sm font-mono text-gray-600">
                    {analysis.best_line.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1">
                        {analysis.best_line.map((move, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 rounded text-xs text-center"
                          >
                            {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400">No line available</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500 border-t pt-4">
                <div>Analysis depth: {analysis.depth}</div>
                <div>Status: {analysis.success ? 'Success' : 'Failed'}</div>
                <div className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded">
                  FEN: {analysis.fen}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!analysis && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Instructions</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Drag and drop pieces to set up your position</li>
                <li>• Use "Switch Turn" to change whose move it is</li>
                <li>• Click "Analyze Position" to get engine evaluation</li>
                <li>• Try the quick load buttons for common openings</li>
                <li>• Flip the board to see from different perspectives</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChessPositionAnalysis;