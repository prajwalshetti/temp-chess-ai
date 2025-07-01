import chess
import chess.pgn
import io
import json
import sys
import argparse
from stockfish import Stockfish

# IMPORTANT: UPDATE THIS PATH TO YOUR STOCKFISH EXECUTABLE
# For Windows, it might be: "C:\\Users\\YourUser\\Downloads\\stockfish\\stockfish.exe"
# For macOS or Linux, it might be: "/usr/local/bin/stockfish" or "./stockfish"
STOCKFISH_PATH = "stockfish"  # Using system stockfish

def analyze_pgn(pgn_string: str, stockfish_depth: int = 15):
    """
    Analyzes a chess game from a PGN string, providing Stockfish evaluation for each move.

    Args:
        pgn_string: The PGN of the game as a string.
        stockfish_depth: The depth for Stockfish analysis (higher is stronger but slower).
    
    Returns:
        A list of dictionaries, where each dictionary contains move info and evaluation.
    """
    try:
        # The stockfish library requires a valid path to the executable
        stockfish = Stockfish(path=STOCKFISH_PATH, depth=stockfish_depth, parameters={
            "Threads": 2,  # Use 2 threads for analysis
            "Minimum Thinking Time": 2000  # 2 seconds in milliseconds for better performance
        })
    except FileNotFoundError:
        print(f"ERROR: Stockfish executable not found at '{STOCKFISH_PATH}'", file=sys.stderr)
        print("Please download Stockfish and update the STOCKFISH_PATH variable in the script.", file=sys.stderr)
        return None

    # Use StringIO to treat the PGN string like a file
    pgn_io = io.StringIO(pgn_string)
    game = chess.pgn.read_game(pgn_io)

    if game is None:
        print("ERROR: Invalid PGN string.", file=sys.stderr)
        return None

    board = game.board()
    analysis_results = []
    
    print("📂 Analyzing game with improved Stockfish integration...", file=sys.stderr)
    print("-" * 50, file=sys.stderr)
    
    move_number = 1
    is_white_move = True
    move_evaluations = []

    # Iterate through all moves in the game's mainline
    for move in game.mainline_moves():
        # Get the move in Standard Algebraic Notation (e.g., "e4", "Nf3")
        san_move = board.san(move)
        
        # Apply the move to the board
        board.push(move)
        
        # Set Stockfish to the position AFTER the move
        stockfish.set_fen_position(board.fen())
        
        # Get the evaluation from Stockfish
        # The evaluation is from the perspective of the current player
        evaluation = stockfish.get_evaluation()
        
        # Convert evaluation to float for our system
        eval_float = 0.0
        if evaluation and evaluation['type'] == 'cp':
            eval_float = evaluation['value'] / 100.0
        elif evaluation and evaluation['type'] == 'mate':
            eval_float = 10.0 if evaluation['value'] > 0 else -10.0
        
        # Format the output for our system
        move_str = f"{san_move:6} |"
        print(f"Move {move_number}: {move_str} Eval: {eval_float:+.2f}", file=sys.stderr)
        
        # Store move evaluation in our expected format
        move_evaluations.append({
            "moveNumber": move_number,
            "move": move_str,
            "evaluation": int(eval_float * 100),  # Convert to centipawns
            "evaluationFloat": eval_float
        })

        # Store detailed analysis result
        move_eval = {
            "move_number": move_number, 
            "move": san_move, 
            "evaluation": evaluation,
            "eval_float": eval_float
        }
        analysis_results.append(move_eval)

        # Update turn and move number
        if not is_white_move:
            move_number += 1
        is_white_move = not is_white_move

    print("-" * 50, file=sys.stderr)
    print("✅ Analysis complete with improved Stockfish engine.", file=sys.stderr)
    
    # Return in the format expected by our API
    return {
        "moveEvaluations": move_evaluations,
        "analysisResults": analysis_results,
        "totalMoves": len(move_evaluations)
    }

def format_evaluation(evaluation: dict) -> str:
    """Formats the Stockfish evaluation dictionary into a readable string."""
    if evaluation['type'] == 'cp':
        # Centipawn score. A positive value favors White, negative favors Black.
        # We convert it to pawns for easier reading (e.g., +0.5 instead of +50 cp).
        pawn_value = evaluation['value'] / 100.0
        return f"{pawn_value:+.2f}"
    elif evaluation['type'] == 'mate':
        # Mate in X moves. Positive for the current player, negative for the opponent.
        return f"Mate in {abs(evaluation['value'])}"
    return "N/A"

def find_blunders(analysis_results):
    """Find the biggest blunders in the game."""
    blunders = []
    last_eval = 0.0
    
    for i, res in enumerate(analysis_results):
        if res['evaluation']['type'] == 'cp':
            current_eval = res['evaluation']['value'] / 100.0
            
            # For White moves (even indices), flip the evaluation perspective
            if i % 2 == 0:
                eval_from_whites_pov = -current_eval
                drop = last_eval - eval_from_whites_pov
            else:
                eval_from_whites_pov = current_eval
                drop = eval_from_whites_pov - last_eval
            
            # Consider a blunder if evaluation drops by more than 1.0 pawns
            if drop > 100:  # 1.0 pawn in centipawns
                blunders.append({
                    "move": f"{res['move_number']}. {res['move']}",
                    "drop": drop / 100.0,
                    "player": "White" if i % 2 == 0 else "Black"
                })
            
            last_eval = eval_from_whites_pov if i % 2 == 0 else current_eval
    
    return blunders

def main():
    parser = argparse.ArgumentParser(description='Analyze chess games with improved Stockfish integration')
    parser.add_argument('--depth', type=int, default=30, help='Stockfish analysis depth')
    parser.add_argument('--format', choices=['json', 'text'], default='json', help='Output format')
    args = parser.parse_args()

    # Read PGN from stdin
    pgn_content = sys.stdin.read().strip()
    
    if not pgn_content:
        print("ERROR: No PGN content provided", file=sys.stderr)
        sys.exit(1)

    # Analyze the game
    results = analyze_pgn(pgn_content, stockfish_depth=args.depth)
    
    if results is None:
        print("ERROR: Analysis failed", file=sys.stderr)
        sys.exit(1)

    if args.format == 'json':
        # Output JSON format for API consumption
        output = {
            "moveEvaluations": results["moveEvaluations"],
            "totalMoves": results["totalMoves"],
            "success": True
        }
        print(json.dumps(output))
    else:
        # Output text format for debugging
        print("\n--- Analysis Summary ---", file=sys.stderr)
        blunders = find_blunders(results["analysisResults"])
        
        if blunders:
            print("Major blunders found:", file=sys.stderr)
            for blunder in blunders[:3]:  # Show top 3 blunders
                print(f"  {blunder['player']}: {blunder['move']} (dropped {blunder['drop']:.2f} pawns)", file=sys.stderr)
        else:
            print("No major blunders detected.", file=sys.stderr)

if __name__ == "__main__":
    main()