import os
import argparse
import chess.pgn
import chess.engine
import json
import sys
from io import StringIO

STOCKFISH_PATH = r"C:\Users\shett\OneDrive\Desktop\stockfish\stockfish-windows-x86-64-avx2.exe"

def analyze_game(pgn_content, engine, limit):
    try:
        pgn_io = StringIO(pgn_content)
        game = chess.pgn.read_game(pgn_io)
        if not game:
            return None

        board = game.board()
        node = game

        moves = []
        evals = []
        moves_analysis = []

        current_best_moves = []  # SAN of best move BEFORE each move
        next_best_moves_san = []  # SAN of best move AFTER each move
        next_best_moves_uci = []  # UCI format

        # Initial position best move
        info = engine.analyse(board, limit)
        if "pv" in info and info["pv"]:
            current_best_moves.append(board.san(info["pv"][0]))
        else:
            current_best_moves.append("--")

        while node.variations:
            next_node = node.variation(0)
            move = next_node.move
            san = board.san(move) if move else str(move)
            moves.append(san)

            # Push move to get updated position
            board.push(move)

            # Analyze resulting position
            info = engine.analyse(board, limit)
            score_raw = info["score"].white()
            if score_raw.is_mate():
                eval_float = 999 if score_raw.mate() > 0 else -999
            elif score_raw.score() is not None:
                eval_float = score_raw.score() / 100
            else:
                eval_float = 0  # or some default value

            evals.append(eval_float)

            # Current best move SAN for this position
            if "pv" in info and info["pv"]:
                try:
                    best_move = info["pv"][0]
                    san_best = board.san(best_move)
                    uci_best = best_move.uci()
                except:
                    san_best = "--"
                    uci_best = "--"
            else:
                san_best = "--"
                uci_best = "--"

            next_best_moves_san.append(san_best)
            next_best_moves_uci.append(uci_best)

            # Prepare current best for next iteration
            if "pv" in info and info["pv"]:
                try:
                    current_best_moves.append(board.san(info["pv"][0]))
                except:
                    current_best_moves.append("--")
            else:
                current_best_moves.append("--")

            node = next_node

        # Final move count sanity check
        for i in range(len(moves)):
            move_data = {
                "moveNumber": (i // 2) + 1,
                "turn": "White" if i % 2 == 0 else "Black",
                "san": moves[i],
                "evaluation": f"{evals[i]:.2f}" if abs(evals[i]) < 900 else f"#{int(evals[i]/999)}" if evals[i] > 0 else f"#{int(evals[i]/(-999))}",
                "evalFloat": evals[i],
                "currentBestMoveSan": current_best_moves[i],
                "nextBestMoveSan": next_best_moves_san[i],
                "nextBestMoveUci": next_best_moves_uci[i]
            }

            # Debug info
            print(f"Move {i+1}: {moves[i]} | Eval: {evals[i]:.2f} | Current best: {current_best_moves[i]} | Next best: {next_best_moves_san[i]} ({next_best_moves_uci[i]})", file=sys.stderr)

            moves_analysis.append(move_data)

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

    limit = chess.engine.Limit(depth=12) if args.mode == "fast" else chess.engine.Limit(time=0.5)
    print("⚡ Fast mode" if args.mode == "fast" else "🔍 Accurate mode", file=sys.stderr)

    pgn_content = sys.stdin.read().strip()
    if not pgn_content:
        print("ERROR: No PGN content provided", file=sys.stderr)
        sys.exit(1)

    try:
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            print("📂 Analyzing game...", file=sys.stderr)
            moves_analysis = analyze_game(pgn_content, engine, limit)

            if moves_analysis is None:
                print("ERROR: Failed to analyze game", file=sys.stderr)
                sys.exit(1)

            move_evaluations = {str(i): analysis.get("evalFloat", 0.0) for i, analysis in enumerate(moves_analysis)}

            result = {
                "moveEvaluations": move_evaluations,
                "analysisResults": moves_analysis,
                "totalMoves": len(moves_analysis),
                "success": True
            }

            print(json.dumps(result))

    except Exception as e:
        print(f"ERROR: Analysis failed - {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
