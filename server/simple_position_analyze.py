import subprocess
import sys
import json
import argparse
import re

STOCKFISH_PATH = r"C:\Users\shett\OneDrive\Desktop\stockfish\stockfish-windows-x86-64-avx2.exe"

def analyze_position(fen, depth=15, time_limit=1000):
    """
    Analyze a chess position using Stockfish
    
    Args:
        fen (str): FEN string of the position
        depth (int): Analysis depth (default: 15)
        time_limit (int): Time limit in milliseconds (default: 1000ms)
    
    Returns:
        dict: Analysis results containing eval, best move, and best line
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
        
        # Debug: Print raw output for troubleshooting
        print(f"DEBUG: Raw output lines: {output_lines}", file=sys.stderr)
        print(f"DEBUG: Extracted eval: {eval_score}", file=sys.stderr)
        print(f"DEBUG: Extracted best_move: {best_move}", file=sys.stderr)
        print(f"DEBUG: Extracted best_line: {best_line}", file=sys.stderr)
        
        # Return results
        result = {
            "fen": fen,
            "eval": eval_score,
            "best_move": best_move,
            "best_line": best_line[:10] if best_line else [],  # Limit to first 10 moves
            "depth": depth,
            "success": True
        }
        
        return result
        
    except Exception as e:
        return {
            "fen": fen,
            "eval": None,
            "best_move": None,
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