import subprocess
import sys
import json
import argparse
import re
import chess

STOCKFISH_PATH = r"C:\Users\shett\OneDrive\Desktop\stockfish\stockfish-windows-x86-64-avx2.exe"

def analyze_position(fen, depth=15, time_limit=1000):
    """
    Analyze a chess position using Stockfish
    Returns UCI best move, SAN best move, and SAN best line.
    """
    try:
        # Start Stockfish process
        process = subprocess.Popen(
            [STOCKFISH_PATH],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # UCI commands
        commands = [
            "uci",
            "ucinewgame",
            f"position fen {fen}",
            f"go depth {depth} movetime {time_limit}"
        ]
        
        # Send commands to Stockfish
        for cmd in commands:
            process.stdin.write(cmd + "\n")
            process.stdin.flush()
        
        # Read output
        output_lines = []
        best_move = None
        eval_score = None
        best_line = []
        
        while True:
            line = process.stdout.readline()
            if not line:
                break
            
            line = line.strip()
            output_lines.append(line)
            
            # Parse evaluation and principal variation
            if line.startswith("info"):
                # Extract evaluation
                if "score cp" in line:
                    match = re.search(r"score cp (-?\d+)", line)
                    if match:
                        eval_score = int(match.group(1)) / 100.0  # Convert centipawns to pawns
                elif "score mate" in line:
                    match = re.search(r"score mate (-?\d+)", line)
                    if match:
                        mate_in = int(match.group(1))
                        eval_score = f"M{mate_in}"
                
                # Extract principal variation (best line)
                if "pv" in line:
                    # Extract all chess moves from the PV line (format: e2e4 e7e5 g1f3 etc.)
                    moves = re.findall(r"[a-h][1-8][a-h][1-8][qrbn]?", line)
                    if moves:
                        best_line = moves
            
            # Get best move
            elif line.startswith("bestmove"):
                parts = line.split()
                if len(parts) >= 2:
                    best_move = parts[1]
                break
        
        # Clean up
        process.stdin.close()
        process.wait()
        
        # Use python-chess to convert UCI to SAN
        board = chess.Board(fen)
        uci_best_move = best_move
        san_best_move = None
        san_best_line = []
        if best_move:
            try:
                move_obj = chess.Move.from_uci(best_move)
                san_best_move = board.san(move_obj)
            except Exception:
                san_best_move = None
        # For best line
        temp_board = board.copy()
        for uci in best_line:
            try:
                move_obj = chess.Move.from_uci(uci)
                san = temp_board.san(move_obj)
                san_best_line.append(san)
                temp_board.push(move_obj)
            except Exception:
                break
        # Debug: Print raw output for troubleshooting
        print(f"DEBUG: Raw output lines: {output_lines}", file=sys.stderr)
        print(f"DEBUG: Extracted eval: {eval_score}", file=sys.stderr)
        print(f"DEBUG: Extracted best_move: {best_move}", file=sys.stderr)
        print(f"DEBUG: Extracted best_line: {best_line}", file=sys.stderr)
        print(f"DEBUG: SAN best move: {san_best_move}", file=sys.stderr)
        print(f"DEBUG: SAN best line: {san_best_line}", file=sys.stderr)
        # Return results
        result = {
            "fen": fen,
            "eval": eval_score,
            "best_move": uci_best_move,  # for compatibility
            "uci_best_move": uci_best_move,
            "san_best_move": san_best_move,
            "san_best_line": san_best_line[:10] if san_best_line else [],
            "best_line": best_line[:10] if best_line else [],  # keep for compatibility
            "depth": depth,
            "success": True
        }
        return result
    except Exception as e:
        return {
            "fen": fen,
            "eval": None,
            "best_move": None,
            "uci_best_move": None,
            "san_best_move": None,
            "san_best_line": [],
            "best_line": [],
            "error": str(e),
            "success": False
        }

def main():
    parser = argparse.ArgumentParser(description='Analyze chess position with Stockfish')
    parser.add_argument('fen', help='FEN string of the position to analyze')
    parser.add_argument('--depth', type=int, default=15, help='Analysis depth (default: 15)')
    parser.add_argument('--time', type=int, default=1000, help='Time limit in ms (default: 1000)')
    
    args = parser.parse_args()
    
    # Analyze position
    result = analyze_position(args.fen, args.depth, args.time)
    
    # Output JSON result
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()