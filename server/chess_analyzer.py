#!/usr/bin/env python3
import os
import argparse
import chess.pgn
import chess.engine
from io import StringIO
import json
import sys

# === CONFIGURATION ===
STOCKFISH_PATH = "stockfish"  # Use system stockfish on Replit

def analyze_game_from_pgn(pgn_content, analysis_mode="accurate"):
    """Analyze a chess game from PGN content using Stockfish"""
    try:
        # Parse PGN content
        pgn_io = StringIO(pgn_content)
        game = chess.pgn.read_game(pgn_io)
        
        if not game:
            return {"error": "Failed to parse PGN content"}
        
        # Set engine limit based on mode with optimizations for long games
        if analysis_mode == "fast":
            limit = chess.engine.Limit(depth=10, time=0.2)  # Faster for long games
        else:
            limit = chess.engine.Limit(depth=12, time=0.3)  # Balance of speed and accuracy
        
        # Initialize engine
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            board = game.board()
            node = game
            
            moves_analysis = []
            big_drops = []
            move_count = 0
            max_moves = 60  # Limit analysis to first 60 moves for performance
            
            # Extract game info
            headers = game.headers
            game_info = {
                "event": headers.get("Event", "PGN Game"),
                "site": headers.get("Site", "?"),
                "date": headers.get("Date", "?"),
                "white": headers.get("White", "?"),
                "black": headers.get("Black", "?"),
                "result": headers.get("Result", "*")
            }
            
            while node.variations and move_count < max_moves:
                next_node = node.variation(0)
                played_move = next_node.move
                move_count += 1
                
                # === Evaluate before the move ===
                info_before = engine.analyse(board, limit)
                score_before_raw = info_before["score"].relative
                best_move = info_before.get("pv", [None])[0]
                
                if score_before_raw.is_mate():
                    score_before = 100.0 if score_before_raw.mate() > 0 else -100.0
                else:
                    score_before = score_before_raw.score() / 100
                
                # Convert moves to SAN (before board state changes)
                try:
                    san_played = board.san(played_move)
                except:
                    san_played = str(played_move)
                
                try:
                    san_best = board.san(best_move) if best_move and board.is_legal(best_move) else "N/A"
                except:
                    san_best = "N/A"
                
                # Apply the move
                board.push(played_move)
                
                # === Evaluate after the move ===
                info_after = engine.analyse(board, limit)
                score_after_raw = info_after["score"].relative
                
                if score_after_raw.is_mate():
                    score_after = 100.0 if score_after_raw.mate() > 0 else -100.0
                else:
                    score_after = score_after_raw.score() / 100
                
                move_number = board.fullmove_number
                
                # Store move analysis
                moves_analysis.append({
                    "move_number": move_number,
                    "san": san_played,
                    "eval_before": score_before,
                    "eval_after": score_after,
                    "best_move": san_best
                })
                
                # Track significant drops (blunders)
                delta = abs(score_before - score_after)
                if delta >= 2.0 and played_move != best_move:
                    big_drops.append({
                        "move_number": move_number,
                        "played": san_played,
                        "best": san_best,
                        "eval_before": score_before,
                        "eval_after": score_after,
                        "delta": score_before - score_after
                    })
                
                node = next_node
            
            return {
                "game_info": game_info,
                "moves_analysis": moves_analysis,
                "big_drops": big_drops,
                "truncated": move_count >= max_moves
            }
            
    except Exception as e:
        return {"error": f"Failed to analyze game: {str(e)}"}

def analyze_game_file(path, engine, limit):
    """Analyze a chess game from a PGN file"""
    with open(path, "r") as f:
        game = chess.pgn.read_game(f)
        board = game.board()
        node = game

        big_drops = []

        while node.variations:
            next_node = node.variation(0)
            played_move = next_node.move

            # === Evaluate before the move ===
            info_before = engine.analyse(board, limit)
            score_before_raw = info_before["score"].relative
            best_move = info_before.get("pv", [None])[0]

            if score_before_raw.is_mate():
                score_before = 100.0 if score_before_raw.mate() > 0 else -100.0
            else:
                score_before = score_before_raw.score() / 100

            # Convert moves to SAN (before board state changes)
            try:
                san_played = board.san(played_move)
            except:
                san_played = str(played_move)

            try:
                san_best = board.san(best_move) if best_move and board.is_legal(best_move) else "N/A"
            except:
                san_best = "N/A"

            # Apply the move
            board.push(played_move)

            # === Evaluate after the move ===
            info_after = engine.analyse(board, limit)
            score_after_raw = info_after["score"].relative

            if score_after_raw.is_mate():
                score_after = 100.0 if score_after_raw.mate() > 0 else -100.0
            else:
                score_after = score_after_raw.score() / 100

            move_number = board.fullmove_number
            print(f"Move {move_number}: {san_played:6} | Eval: {score_before:.2f} → {score_after:.2f}")

            delta = abs(score_before - score_after)
            if delta >= 2.0 and played_move != best_move:
                big_drops.append((move_number, san_played, san_best, score_before, score_after))

            node = next_node

        # === Summary ===
        if big_drops:
            print("\n⚠️  Significant Evaluation Drops:")
            for move_num, played, best, before, after in big_drops:
                print(f"  Move {move_num}: Played {played}, Best was {best}, Eval dropped from {before:.2f} to {after:.2f} (Δ = {before - after:.2f})")
        else:
            print("\n✅ No major evaluation drops detected.")

def format_analysis_output(analysis):
    """Format analysis output exactly like the original Python script"""
    if "error" in analysis:
        return analysis["error"]
    
    output = []
    game_info = analysis["game_info"]
    
    # Game header - extract filename if available, otherwise use event
    game_title = game_info.get('event', 'PGN Game')
    if game_title in ['?', 'PGN Game', '']:
        game_title = 'game.pgn'  # Default filename
    output.append(f"📂 Game: {game_title}")
    
    # Move-by-move analysis - exact format from your local script
    for move in analysis["moves_analysis"]:
        # Format without + sign for positive numbers to match your output
        eval_before = move['eval_before']
        eval_after = move['eval_after']
        
        # Handle mate scores
        if abs(eval_before) >= 100:
            eval_before_str = "100.00" if eval_before > 0 else "-100.00"
        else:
            eval_before_str = f"{eval_before:.2f}"
            
        if abs(eval_after) >= 100:
            eval_after_str = "100.00" if eval_after > 0 else "-100.00"
        else:
            eval_after_str = f"{eval_after:.2f}"
        
        move_line = f"Move {move['move_number']}: {move['san']:<6} | Eval: {eval_before_str} → {eval_after_str}"
        output.append(move_line)
    
    output.append("")
    
    # Add truncation notice if applicable
    if analysis.get("truncated", False):
        output.append("ℹ️  Analysis limited to first 60 moves for performance")
        output.append("")
    
    # Significant drops
    if analysis["big_drops"]:
        output.append("⚠️  Significant Evaluation Drops:")
        for drop in analysis["big_drops"]:
            drop_line = f"  Move {drop['move_number']}: Played {drop['played']}, Best was {drop['best']}, Eval dropped from {drop['eval_before']:.2f} to {drop['eval_after']:.2f} (Δ = {drop['delta']:.2f})"
            output.append(drop_line)
    else:
        output.append("✅ No major evaluation drops detected.")
    
    return "\n".join(output)

def main():
    """Main function to handle command line input"""
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
        print("⚡ Fast mode (depth 12)", file=sys.stderr)
    else:
        print("🔍 Accurate mode (time=0.5s)", file=sys.stderr)

    # Read PGN from stdin
    pgn_content = sys.stdin.read().strip()
    if pgn_content:
        analysis = analyze_game_from_pgn(pgn_content, args.mode)
        print(format_analysis_output(analysis))
    else:
        print("No PGN content provided", file=sys.stderr)

if __name__ == "__main__":
    main()