#!/usr/bin/env python3
import sys
import json
import tempfile
import os
import chess.pgn
import chess.engine
from io import StringIO

def analyze_game_from_pgn(pgn_content):
    """Analyze a chess game from PGN content using Stockfish"""
    try:
        # Create a temporary file for the PGN content
        with tempfile.NamedTemporaryFile(mode='w', suffix='.pgn', delete=False) as temp_file:
            temp_file.write(pgn_content)
            temp_path = temp_file.name
        
        # Use system stockfish (available in Replit environment)
        with chess.engine.SimpleEngine.popen_uci("stockfish") as engine:
            result = analyze_game_file(temp_path, engine)
        
        # Clean up temporary file
        os.unlink(temp_path)
        
        return result
        
    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}"}

def analyze_game_file(path, engine):
    """Analyze a chess game from a PGN file"""
    try:
        with open(path, "r") as f:
            game = chess.pgn.read_game(f)
            
            if not game:
                return {"error": "No valid game found in PGN"}
            
            board = game.board()
            node = game
            
            # Extract game information
            game_info = {
                "event": game.headers.get("Event", "PGN Game"),
                "white": game.headers.get("White", ""),
                "black": game.headers.get("Black", ""),
                "date": game.headers.get("Date", ""),
                "result": game.headers.get("Result", "*")
            }
            
            moves_analysis = []
            big_drops = []
            move_count = 0
            
            while node.variations:
                next_node = node.variation(0)
                played_move = next_node.move
                move_count += 1
                
                # Evaluate before the move
                info_before = engine.analyse(board, chess.engine.Limit(depth=15))
                score_before_raw = info_before["score"].relative
                best_move = info_before.get("pv", [None])[0]
                
                if score_before_raw.is_mate():
                    score_before = 100.0 if score_before_raw.mate() > 0 else -100.0
                else:
                    score_before = score_before_raw.score() / 100
                
                # SAN conversion before pushing
                try:
                    san_played = board.san(played_move)
                except:
                    san_played = str(played_move)
                
                try:
                    san_best = board.san(best_move) if best_move and board.is_legal(best_move) else "N/A"
                except:
                    san_best = "N/A"
                
                board.push(played_move)
                
                # Evaluate after the move
                info_after = engine.analyse(board, chess.engine.Limit(depth=15))
                score_after_raw = info_after["score"].relative
                
                if score_after_raw.is_mate():
                    score_after = 100.0 if score_after_raw.mate() > 0 else -100.0
                else:
                    score_after = score_after_raw.score() / 100
                
                move_number = board.fullmove_number
                
                # Store move analysis
                move_analysis = {
                    "move_number": move_number,
                    "san": san_played,
                    "best_move": san_best,
                    "eval_before": round(score_before, 2),
                    "eval_after": round(score_after, 2),
                    "eval_change": round(score_after - score_before, 2)
                }
                moves_analysis.append(move_analysis)
                
                # Check for significant evaluation drops
                delta = abs(score_before - score_after)
                if delta >= 2.0 and played_move != best_move:
                    big_drops.append({
                        "move_number": move_number,
                        "played": san_played,
                        "best": san_best,
                        "eval_before": round(score_before, 2),
                        "eval_after": round(score_after, 2),
                        "delta": round(score_before - score_after, 2)
                    })
                
                node = next_node
            
            return {
                "success": True,
                "game_info": game_info,
                "moves_analysis": moves_analysis,
                "big_drops": big_drops,
                "total_moves": move_count
            }
            
    except Exception as e:
        return {"error": f"Failed to analyze game: {str(e)}"}

def format_analysis_output(analysis):
    """Format analysis output similar to the original Python script"""
    if "error" in analysis:
        return analysis["error"]
    
    output = []
    game_info = analysis["game_info"]
    
    # Game header
    output.append(f"📂 Game: {game_info['event']}")
    if game_info['white'] and game_info['black']:
        output.append(f"White: {game_info['white']} vs Black: {game_info['black']}")
    output.append("")
    
    # Move-by-move analysis
    for move in analysis["moves_analysis"]:
        move_line = f"Move {move['move_number']}: {move['san']:<6} | Eval: {move['eval_before']:+.2f} → {move['eval_after']:+.2f}"
        output.append(move_line)
    
    output.append("")
    
    # Significant drops
    if analysis["big_drops"]:
        output.append("⚠️  Significant Evaluation Drops:")
        for drop in analysis["big_drops"]:
            drop_line = f"  Move {drop['move_number']}: Played {drop['played']}, Best was {drop['best']}, Eval dropped from {drop['eval_before']:+.2f} to {drop['eval_after']:+.2f} (Δ = {drop['delta']:+.2f})"
            output.append(drop_line)
    else:
        output.append("✅ No major evaluation drops detected.")
    
    return "\n".join(output)

def main():
    """Main function to handle command line input"""
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python chess_analyzer.py '<pgn_content>'"}))
        sys.exit(1)
    
    pgn_content = sys.argv[1]
    analysis = analyze_game_from_pgn(pgn_content)
    
    if "error" in analysis:
        print(json.dumps(analysis))
    else:
        # Return formatted output for display
        formatted_output = format_analysis_output(analysis)
        print(json.dumps({"success": True, "output": formatted_output, "analysis": analysis}))

if __name__ == "__main__":
    main()