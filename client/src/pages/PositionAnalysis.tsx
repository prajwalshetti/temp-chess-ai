import React, { useState, useCallback, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useLocation } from "wouter";

interface AnalysisResult {
  fen: string;
  eval: number | string | null;
  best_move: string | null;
  best_line: string[];
  san_best_move?: string | null;
  san_best_line?: string[];
  depth: number;
  success: boolean;
  error?: string;
}

type AnalysisMode = "board-editor" | "analysis-board";

// Accept mode as a prop
function ChessPositionAnalysis({ mode = "board-editor" }: { mode?: AnalysisMode }) {
  const [, setLocation] = useLocation();
  const [position, setPosition] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [depth, setDepth] = useState(15);
  const [timeLimit, setTimeLimit] = useState(1000);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [erasingMode, setErasingMode] = useState(false);

  // Analysis Board specific state
  const [chess] = useState(() => new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);

  // King validation logic
  const [kingError, setKingError] = React.useState<string | null>(null);
  React.useEffect(() => {
    const fenParts = position.split(" ");
    const boardPart = fenParts[0];
    let whiteKing = 0, blackKing = 0;
    for (const c of boardPart) {
      if (c === "K") whiteKing++;
      if (c === "k") blackKing++;
    }
    if (whiteKing !== 1 || blackKing !== 1) {
      setKingError("Position must have exactly one white king and one black king.");
    } else {
      setKingError(null);
    }
  }, [position]);

  // Initialize chess for analysis board mode
  useEffect(() => {
    if (mode === "analysis-board") {
      chess.reset();
      setMoveHistory([]);
      setCurrentMoveIndex(-1);
      setPosition(chess.fen());
    }
  }, [mode, chess]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string, piece: string) => {
    if (mode === "analysis-board") {
      // For analysis board mode, use chess.js move validation
      try {
        const move = chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q' // Always promote to queen for simplicity
        });
        
        if (move) {
          setPosition(chess.fen());
          setMoveHistory(chess.history());
          setCurrentMoveIndex(chess.history().length - 1);
          setAnalysis(null); // Clear previous analysis
          return true;
        }
      } catch (error) {
        // Invalid move
        return false;
      }
      return false;
    } else {
      // Original board editor logic
      const chess = new Chess(position);
      const board = chess.board();

      // Parse the piece string to get color and type
      const pieceColor = piece.charAt(0) === "w" ? "w" : "b";
      const pieceType = piece.charAt(1) as "p" | "r" | "n" | "b" | "q" | "k";

      // Convert squares to board coordinates
      const sourceFile = sourceSquare.charCodeAt(0) - 97; // "a" = 0
      const sourceRank = 8 - parseInt(sourceSquare.charAt(1)); // "1" = 7
      const targetFile = targetSquare.charCodeAt(0) - 97;
      const targetRank = 8 - parseInt(targetSquare.charAt(1));

      // === Block move if target square has a king ===
      const targetPiece = board[targetRank][targetFile];
      if (targetPiece?.type === "k") {
        return false; // Do not allow capturing the king
      }

      // Remove piece from source square
      board[sourceRank][sourceFile] = null;

      // Place piece on target square
      board[targetRank][targetFile] = {
        color: pieceColor,
        type: pieceType,
        square: targetSquare as any,
      };

      // Convert board back to FEN
      let fen = "";
      for (let rank = 0; rank < 8; rank++) {
        let emptyCount = 0;
        for (let file = 0; file < 8; file++) {
          const piece = board[rank][file];
          if (piece) {
            if (emptyCount > 0) {
              fen += emptyCount;
              emptyCount = 0;
            }
            const symbol = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
            fen += symbol;
          } else {
            emptyCount++;
          }
        }
        if (emptyCount > 0) {
          fen += emptyCount;
        }
        if (rank < 7) fen += "/";
      }

      // Append the rest of the FEN string
      const fenParts = position.split(" ");
      fenParts[1] = pieceColor === "w" ? "b" : "w";
      fen += ` ${fenParts[1]} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;

      setPosition(fen);
      setAnalysis(null); // Clear previous analysis when position changes
      return true;
    }
  }, [position, mode, chess]);

  const handleSquareClick = (square: string) => {
    if (mode === "analysis-board") {
      // No square clicking functionality in analysis board mode
      return;
    }
    
    if (!erasingMode) return;
    const chess = new Chess(position);
    const board = chess.board();
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    const piece = board[rank][file];
    if (piece && piece.type === "k") return; // Do not erase king
    if (piece) {
      board[rank][file] = null;
      // Convert board back to FEN
      let fen = "";
      for (let r = 0; r < 8; r++) {
        let emptyCount = 0;
        for (let f = 0; f < 8; f++) {
          const p = board[r][f];
          if (p) {
            if (emptyCount > 0) {
              fen += emptyCount;
              emptyCount = 0;
            }
            const symbol = p.color === "w" ? p.type.toUpperCase() : p.type.toLowerCase();
            fen += symbol;
          } else {
            emptyCount++;
          }
        }
        if (emptyCount > 0) fen += emptyCount;
        if (r < 7) fen += "/";
      }
      const fenParts = position.split(" ");
      fen += ` ${fenParts[1]} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
      setPosition(fen);
      setAnalysis(null);
    }
  };

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
        throw new Error("Invalid chess position. Please check your piece setup.");
      }
      const response = await fetch("/api/analyze-position", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen: position,
          depth,
          timeLimit
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const result: AnalysisResult = await response.json();
      if(result.fen.split(" ")[1] === "b") {
        result.san_best_line = ["..."].concat(result.san_best_line || []);
      }
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during analysis");
    } finally {
      setLoading(false);
    }
  };

  const formatEvaluation = (evalScore: number | string | null) => {
    if (evalScore === null) return "N/A";
    if (typeof evalScore === "string") {
      // Handle mate scores - flip the sign for Black"s turn
      if (evalScore.startsWith("M")) {
        const isBlackTurn = getActivePlayer() === "Black";
        const mateValue = evalScore.substring(1); // Remove "M"
        const mateNumber = parseInt(mateValue);
        return evalScore;
      }
      return evalScore;
    }
    
    const score = Number(evalScore);
    const isBlackTurn = getActivePlayer() === "Black";
    const adjustedScore = isBlackTurn ? -score : score;
    
    if (adjustedScore > 0) {
      return `+${adjustedScore.toFixed(2)}`;
    }
    return adjustedScore.toFixed(2);
  };

  const getEvaluationColor = (evalScore: number | string | null) => {   
    return "text-white";
  };

  const getActivePlayer = () => {
    const fenParts = position.split(" ");
    return fenParts[1] === "w" ? "White" : "Black";
  };

  const toggleActivePlayer = () => {
    const fenParts = position.split(" ");
    fenParts[1] = fenParts[1] === "w" ? "b" : "w";
    setPosition(fenParts.join(" "));
  };

  const resetToStarting = () => {
    if (mode === "analysis-board") {
      chess.reset();
      setMoveHistory([]);
      setCurrentMoveIndex(-1);
      setPosition(chess.fen());
    } else {
      setPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    }
    setAnalysis(null);
  };

  const clearBoard = () => {
    setPosition("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    setAnalysis(null);
  };

  const loadPosition = (fen: string) => {
    setPosition(fen);
    setAnalysis(null);
  };
  
  useEffect(() => {
    const fen = localStorage.getItem("analyze_fen");
    if (fen) {
      setPosition(fen);
      localStorage.removeItem("analyze_fen");
    }
  }, []);

  useEffect(() => {
    analyzePosition();
  }, [position]);

  const getBestMoveArrow = () => {
    if (analysis && analysis.best_move && analysis.best_move.length >= 4) {
      const from = analysis.best_move.slice(0, 2);
      const to = analysis.best_move.slice(2, 4);
      return [[from, to]];
    }
    return [];
  };

  const navigateToMove = (moveIndex: number) => {
    if (mode === "analysis-board") {
      chess.reset();
      const moves = moveHistory;
      // Only play up to moveIndex (inclusive)
      for (let i = 0; i <= moveIndex; i++) {
        if (moves[i]) chess.move(moves[i]);
      }
      setPosition(chess.fen());
      setCurrentMoveIndex(moveIndex);
      // Truncate move history after the selected move
      setMoveHistory(moves.slice(0, moveIndex + 1));
    }
  };

  // Back button handler
  const handleBack = () => {
    if (mode === "analysis-board" && currentMoveIndex > -1) {
      chess.reset();
      const moves = moveHistory;
      // Play up to the previous move
      for (let i = 0; i < currentMoveIndex; i++) {
        if (moves[i]) chess.move(moves[i]);
      }
      setPosition(chess.fen());
      setCurrentMoveIndex(currentMoveIndex - 1);
      // Remove the last move from history
      setMoveHistory(moves.slice(0, currentMoveIndex));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Chess Board Section */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <span className="mr-2">
                    {mode === "board-editor" ? "🎨" : "♟️"}
                  </span>
                  {mode === "board-editor" ? "Chess Board Editor" : "Analysis Board"}
                </h2>
              </div>
              <div className="w-full max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl shadow-inner">
                  <Chessboard
                    position={position}
                    onPieceDrop={onDrop}
                    onSquareClick={handleSquareClick}
                    arePiecesDraggable={true}
                    boardOrientation={boardOrientation}
                    customBoardStyle={{
                      borderRadius: "16px",
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    }}
                    boardWidth={400}
                    customArrows={getBestMoveArrow()}
                  />
                </div>
              </div>
              {/* Move History for Analysis Board Mode */}
              {mode === "analysis-board" && (
                <div className="mt-4 bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center mr-4">
                      <span className="mr-2">📜</span>
                      Move History
                    </h3>
                    <button
                      onClick={handleBack}
                      disabled={currentMoveIndex < 0}
                      className={`ml-auto px-3 py-1 rounded bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      ← Back
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {moveHistory.map((move, index) => (
                      <button
                        key={index}
                        onClick={() => navigateToMove(index)}
                        className={`px-3 py-1 rounded text-sm font-mono transition-all duration-200 ${
                          index === currentMoveIndex
                            ? "bg-blue-500 text-white shadow-lg"
                            : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                        }`}
                      >
                        {Math.floor(index / 2) + 1}.{index % 2 === 0 ? "" : ".."} {move}
                      </button>
                    ))}
                    {moveHistory.length === 0 && (
                      <span className="text-slate-400 text-sm">No moves yet</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Piece Setup Helper - Only for Board Editor */}
            {mode === "board-editor" && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-700">
                <h3 className="text-xl font-bold mb-4 text-white flex items-center">
                  <span className="mr-2">⚙️</span>
                  Add Pieces
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">White Pieces</h4>
                    <div className="flex flex-wrap gap-2">
                      {["♕", "♖", "♗", "♘", "♙"].map((piece, index) => (
                        <button
                          key={`w${index}`}
                          onClick={() => {
                            // Add piece to a1 (or first available square)
                            const chess = new Chess(position);
                            const board = chess.board();
                            // Find first empty square
                            for (let rank = 6; rank >= 1; rank--) {
                              for (let file = 0; file < 8; file++) {
                                if (!board[rank][file]) {
                                  const pieceTypes = ["q", "r", "b", "n", "p"];
                                  const pieceType = pieceTypes[index];
                                  board[rank][file] = { 
                                    color: "w", 
                                    type: pieceType as any, 
                                    square: `${String.fromCharCode(97 + file)}${8 - rank}` as any 
                                  };
                                  // Convert back to FEN
                                  let fen = "";
                                  for (let r = 0; r < 8; r++) {
                                    let emptyCount = 0;
                                    for (let f = 0; f < 8; f++) {
                                      const p = board[r][f];
                                      if (p) {
                                        if (emptyCount > 0) {
                                          fen += emptyCount;
                                          emptyCount = 0;
                                        }
                                        const symbol = p.color === "w" ? p.type.toUpperCase() : p.type.toLowerCase();
                                        fen += symbol;
                                      } else {
                                        emptyCount++;
                                      }
                                    }
                                    if (emptyCount > 0) {
                                      fen += emptyCount;
                                    }
                                    if (r < 7) fen += "/";
                                  }
                                  const fenParts = position.split(" ");
                                  fen += ` ${fenParts[1]} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
                                  setPosition(fen);
                                  setAnalysis(null);
                                  return;
                                }
                              }
                            }
                          }}
                          className="w-12 h-12 bg-gradient-to-br from-white to-gray-100 border-2 border-gray-300 rounded-xl flex items-center justify-center text-xl hover:from-gray-50 hover:to-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          {piece}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Black Pieces</h4>
                    <div className="flex flex-wrap gap-2">
                      {["♛", "♜", "♝", "♞", "♟"].map((piece, index) => (
                        <button
                          key={`b${index}`}
                          onClick={() => {
                            // Add piece to a1 (or first available square)
                            const chess = new Chess(position);
                            const board = chess.board();
                            // Find first empty square
                            for (let rank = 6; rank >= 1; rank--) {
                              for (let file = 0; file < 8; file++) {
                                if (!board[rank][file]) {
                                  const pieceTypes = ["q", "r", "b", "n", "p"];
                                  const pieceType = pieceTypes[index];
                                  board[rank][file] = { 
                                    color: "b", 
                                    type: pieceType as any, 
                                    square: `${String.fromCharCode(97 + file)}${8 - rank}` as any 
                                  };
                                  // Convert back to FEN
                                  let fen = "";
                                  for (let r = 0; r < 8; r++) {
                                    let emptyCount = 0;
                                    for (let f = 0; f < 8; f++) {
                                      const p = board[r][f];
                                      if (p) {
                                        if (emptyCount > 0) {
                                          fen += emptyCount;
                                          emptyCount = 0;
                                        }
                                        const symbol = p.color === "w" ? p.type.toUpperCase() : p.type.toLowerCase();
                                        fen += symbol;
                                      } else {
                                        emptyCount++;
                                      }
                                    }
                                    if (emptyCount > 0) {
                                      fen += emptyCount;
                                    }
                                    if (r < 7) fen += "/";
                                  }
                                  const fenParts = position.split(" ");
                                  fen += ` ${fenParts[1]} ${fenParts[2]} ${fenParts[3]} ${fenParts[4]} ${fenParts[5]}`;
                                  setPosition(fen);
                                  setAnalysis(null);
                                  return;
                                }
                              }
                            }
                          }}
                          className="w-12 h-12 bg-gradient-to-br from-gray-800 to-black text-white border-2 border-gray-600 rounded-xl flex items-center justify-center text-xl hover:from-gray-700 hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          {piece}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-slate-400 bg-slate-700 p-3 rounded-lg">
                  💡 Click a piece to add it to the first available square on the board
                </div>
              </div>
            )}
            {/* Quick Positions - Only for Board Editor */}
            {mode === "board-editor" && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-700">
                <h3 className="text-xl font-bold mb-4 text-white flex items-center">
                  <span className="mr-2">⚡</span>
                  Quick Load
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => loadPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm font-medium"
                  >
                    🏠 Starting Position
                  </button>
                  <button
                    onClick={() => loadPosition("r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1")}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm font-medium"
                  >
                    🇮🇹 Italian Game
                  </button>
                  <button
                    onClick={() => loadPosition("rnbqkb1r/pp1p1ppp/5n2/2p1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1")}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm font-medium"
                  >
                    🇪🇸 Spanish Opening
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Analysis Results Section */}
          <div className="space-y-4">
            {/* Board Control Buttons */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl shadow-2xl border border-slate-700">
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setBoardOrientation(boardOrientation === "white" ? "black" : "white")}
                  className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm font-medium"
                >
                  🔄 Flip Board
                </button>
                <button
                  onClick={resetToStarting}
                  className="px-3 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl text-sm font-medium"
                >
                  ↺ Reset
                </button>
                {mode === "board-editor" && (
                  <>
                    <button
                      onClick={clearBoard}
                      className="px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm font-medium"
                    >
                      🗑️ Clear Board
                    </button>
                    <button
                      onClick={() => setErasingMode((v) => !v)}
                      className={`px-3 py-2 rounded-lg text-white text-sm font-medium shadow-lg transition-all duration-300 ${erasingMode ? "bg-red-600 hover:bg-red-700" : "bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800"}`}
                    >
                      {erasingMode ? "🧹Erase ON" : "🧹Erase OFF"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Error Display */}
            {error && (
              <div className="bg-gradient-to-br from-red-900 to-red-800 border-2 border-red-600 rounded-xl p-4 shadow-2xl">
                <div className="flex items-center">
                  <div className="text-red-400 text-xl mr-3">⚠️</div>
                  <div>
                    <h3 className="text-lg font-bold text-red-200">Error</h3>
                    <div className="mt-1 text-red-300 text-sm">{error}</div>
                  </div>
                </div>
              </div>
            )}
            {/* Analysis Results */}
            {loading ? (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl shadow-2xl border border-slate-700">
                <h2 className="text-xl font-bold mb-4 text-white flex items-center">
                  <span className="mr-2">⚙️</span>
                  Analyzing Position...
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Evaluation Loading */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg border border-slate-600">
                    <h3 className="font-semibold text-slate-200 mb-2 flex items-center text-sm">
                      <span className="mr-1">⚖️</span>
                      Evaluation
                    </h3>
                    <div className="text-2xl font-bold text-slate-400 animate-pulse">
                      ...
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Calculating...
                    </div>
                  </div>
                  {/* Best Move Loading */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg border border-slate-600">
                    <h3 className="font-semibold text-slate-200 mb-2 flex items-center text-sm">
                      <span className="mr-1">🎯</span>
                      Best Move
                    </h3>
                    <div className="text-xl font-mono text-blue-400 bg-slate-900 p-3 rounded-md border border-slate-600 text-center animate-pulse">
                      ...
                    </div>
                  </div>
                  {/* Info Loading */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg border border-slate-600">
                    <h3 className="font-semibold text-slate-200 mb-2 flex items-center text-sm">
                      <span className="mr-1">📏</span>
                      Status
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-center items-center">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <div className="text-center text-xs text-slate-400">
                        Analyzing...
                      </div>
                    </div>
                  </div>
                </div>
                {/* Best Line Loading */}
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg border border-slate-600">
                  <h3 className="font-semibold text-slate-200 mb-3 flex items-center text-sm">
                    <span className="mr-1">🔮</span>
                    Best Line
                  </h3>
                  <div className="text-sm font-mono text-slate-300">
                    <div className="text-slate-500 bg-slate-900 p-3 rounded text-center text-sm animate-pulse">
                      Calculating best line...
                    </div>
                  </div>
                </div>
              </div>
            ) : analysis && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl shadow-2xl border border-slate-700">
                <h2 className="text-xl font-bold mb-4 text-white flex items-center">
                  <span className="mr-2">📊</span>
                  Analysis Results
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Evaluation */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg border border-slate-600">
                    <h3 className="font-semibold text-slate-200 mb-2 flex items-center text-sm">
                      <span className="mr-1">⚖️</span>
                      Evaluation ({getActivePlayer()})
                    </h3>
                    <div className={`text-2xl font-bold ${getEvaluationColor(analysis.eval)}`}>
                      {formatEvaluation(analysis.eval)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {typeof analysis.eval === "string" && analysis.eval.startsWith("M") 
                        ? "🏆 Forced mate" 
                        : "♟️ Pawns advantage"}
                    </div>
                  </div>
                  {/* Best Move */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg border border-slate-600">
                    <h3 className="font-semibold text-slate-200 mb-2 flex items-center text-sm">
                      <span className="mr-1">🎯</span>
                      Best Move
                    </h3>
                    <div className="text-xl font-mono text-blue-400 bg-slate-900 p-3 rounded-md border border-slate-600 text-center">
                      {analysis.san_best_move || analysis.best_move || "N/A"}
                    </div>
                  </div>
                  {/* Analysis Info */}
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg border border-slate-600">
                    <h3 className="font-semibold text-slate-200 mb-2 flex items-center text-sm">
                      <span className="mr-1">📏</span>
                      Info
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Status:</span>
                        <span className={`font-mono px-2 py-1 rounded text-xs ${analysis.success ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"}`}>
                          {analysis.success ? "Success" : "Failed"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Best Line - Full Width */}
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg border border-slate-600">
                  <h3 className="font-semibold text-slate-200 mb-3 flex items-center text-sm">
                    <span className="mr-1">🔮</span>
                    Best Line
                  </h3>
                  <div className="text-sm font-mono text-slate-300">
                    {analysis.san_best_line && analysis.san_best_line.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analysis.san_best_line.map((move: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-slate-900 rounded text-sm border border-slate-600 hover:bg-slate-800 transition-colors duration-200"
                          >
                            {move}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 bg-slate-900 p-3 rounded text-center text-sm">
                        No line available
                      </div>
                    )}
                  </div>
                </div>
                {/* FEN - Collapsible */}
                <details className="mt-4 group">
                  <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 transition-colors duration-200 flex items-center">
                    <span className="mr-2 group-open:rotate-90 transition-transform duration-200">▶</span>
                    FEN Position
                  </summary>
                  <div className="mt-2 text-xs font-mono bg-slate-900 p-3 rounded-lg border border-slate-600 break-all text-slate-300">
                    {analysis.fen}
                  </div>
                </details>
              </div>
            )}
            {/* Active Player Section - Only for Board Editor */}
            {mode === "board-editor" && (
              <div className="text-left">
                <div className="inline-flex items-center space-x-4 bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-slate-300">Active Player:</span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold shadow-md transition-all duration-300 ${
                      getActivePlayer() === "White" 
                        ? "bg-gradient-to-r from-white to-gray-100 text-black border-2 border-gray-300" 
                        : "bg-gradient-to-r from-gray-800 to-black text-white border-2 border-gray-600"
                    }`}>
                      {getActivePlayer()}
                    </span>
                  </div>
                  <button
                    onClick={toggleActivePlayer}
                    className="px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm font-medium"
                  >
                    ⚡ Switch Turn
                  </button>
                </div>
              </div>
            )}
            {/* Instructions */}
            {!analysis && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl shadow-2xl border border-slate-700">
                <h3 className="text-lg font-bold mb-3 text-white flex items-center">
                  <span className="mr-2">📋</span>
                  Instructions
                </h3>
                <div className="space-y-2 text-sm text-slate-300">
                  {mode === "board-editor" ? (
                    <>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-blue-400 font-bold">🎯</span>
                        <span>Drag and drop pieces to set up your position</span>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-purple-400 font-bold">⚡</span>
                        <span>Use "Switch Turn" to change whose move it is</span>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-green-400 font-bold">🚀</span>
                        <span>Click "Analyze Position" to get engine evaluation</span>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-orange-400 font-bold">⚡</span>
                        <span>Try the quick load buttons for common openings</span>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-cyan-400 font-bold">🔄</span>
                        <span>Flip the board to see from different perspectives</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-blue-400 font-bold">♟️</span>
                        <span>Make legal chess moves by dragging pieces</span>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-purple-400 font-bold">📜</span>
                        <span>View move history and click moves to navigate</span>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-green-400 font-bold">🚀</span>
                        <span>Analysis updates automatically after each move</span>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-orange-400 font-bold">↺</span>
                        <span>Use "Reset" to start a new game from the beginning</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChessPositionAnalysis;