import os
import argparse
import chess.pgn
import chess.engine
import json
import sys
from io import StringIO

# === CONFIGURATION ===
STOCKFISH_PATH = "stockfish"  # Using system stockfish

def analyze_game(pgn_content, engine, limit):
    """Analyze a chess game from PGN content"""
    try:
        pgn_io = StringIO(pgn_content)
        game = chess.pgn.read_game(pgn_io)
        
        if not game:
            return None
        
        board = game.board()
        node = game
        
        # Arrays for indexing logic
        moves = []           # moves[0], moves[1], moves[2], ...
        evals = []           # evals[0], evals[1], evals[2], ...
        best_moves = []      # best_moves[0], best_moves[1], best_moves[2], ...
        moves_analysis = []

        # Get best move for initial position
        initial_info = engine.analyse(board, limit)
        if "pv" in initial_info and initial_info["pv"]:
            initial_best = board.san(initial_info["pv"][0])
            best_moves.append(initial_best)
        else:
            best_moves.append("--")

        while node.variations:
            next_node = node.variation(0)
            move = next_node.move

            # Get SAN before pushing the move
            try:
                san = board.san(move)
            except:
                san = str(move)

            # Store the move
            moves.append(san)
            
            # Push move and analyze resulting position
            board.push(move)

            info = engine.analyse(board, limit)
            score_raw = info["score"].white()  # Always from White's POV

            if score_raw.is_mate():
                score = f"#{score_raw.mate()}"
                eval_float = 999 if score_raw.mate() > 0 else -999
            else:
                score = f"{score_raw.score() / 100:.2f}"
                eval_float = score_raw.score() / 100

            # Store the evaluation
            evals.append(eval_float)
            
            # Get best move for current position (after the move was played)
            if "pv" in info and info["pv"]:
                try:
                    current_best = board.san(info["pv"][0])
                    best_moves.append(current_best)
                except:
                    best_moves.append("--")
            else:
                best_moves.append("--")

            move_number = board.fullmove_number
            turn = "White" if board.turn == chess.BLACK else "Black"
            
            node = next_node

        # Now create analysis data with proper indexing logic
        for i in range(len(moves)):
            # The indexing logic: best_moves[i+1] is the best move for the NEXT position
            next_best_move = best_moves[i+1] if i + 1 < len(best_moves) else "--"
            
            move_data = {
                "moveNumber": (i // 2) + 1 if i % 2 == 0 else (i // 2) + 1,
                "turn": "White" if i % 2 == 0 else "Black",
                "san": moves[i],
                "evaluation": f"{evals[i]:.2f}" if abs(evals[i]) < 900 else f"#{int(evals[i]/999)}" if evals[i] > 0 else f"#{int(evals[i]/(-999))}",
                "evalFloat": evals[i],
                "bestMove": next_best_move
            }
            moves_analysis.append(move_data)
            
            # Print for debugging with array indexing logic
            print(f"Move {i+1}: {moves[i]} | Eval: {evals[i]:.2f} | Next best move: {next_best_move}", file=sys.stderr)
        
        return moves_analysis
    except Exception as e:
        print(f"Error in analyze_game: {str(e)}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["fast", "accurate"],
        default="accurate",
        help="Choose analysis mode (default: accurate)"
    )
    args = parser.parse_args()

    # === Set engine depth/time based on mode ===
    if args.mode == "fast":
        limit = chess.engine.Limit(depth=12)
        print("⚡ Fast mode (depth 12)", file=sys.stderr)
    else:
        limit = chess.engine.Limit(time=0.5)
        print("🔍 Accurate mode (time=0.5s)", file=sys.stderr)

    # Read PGN from stdin
    pgn_content = sys.stdin.read().strip()
    
    if not pgn_content:
        print("ERROR: No PGN content provided", file=sys.stderr)
        sys.exit(1)

    # === Run analysis ===
    try:
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            print("📂 Analyzing game...", file=sys.stderr)
            moves_analysis = analyze_game(pgn_content, engine, limit)
            
            if moves_analysis is None:
                print("ERROR: Failed to analyze game", file=sys.stderr)
                sys.exit(1)
            
            # Convert to the format expected by the API
            move_evaluations = {}
            analysis_list = list(moves_analysis)  # Ensure it's a list
            for i, analysis in enumerate(analysis_list):
                move_evaluations[str(i)] = analysis.get("evalFloat", 0.0)
            
            # Output JSON result
            result = {
                "moveEvaluations": move_evaluations,
                "analysisResults": analysis_list,  # Include full analysis with best moves
                "totalMoves": len(analysis_list),
                "success": True
            }
            
            print(json.dumps(result))
            
    except Exception as e:
        print(f"ERROR: Analysis failed - {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()