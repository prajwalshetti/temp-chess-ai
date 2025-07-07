import React from "react";
import { Badge } from "./ui/badge";

interface EvalChangeBadgeProps {
  currentEvaluation: number | null;
  evalChange: number;
  isWhiteMove: boolean;
}

export const EvalChangeBadge: React.FC<EvalChangeBadgeProps> = ({ currentEvaluation, evalChange, isWhiteMove }) => {
  const playerChange = isWhiteMove ? evalChange : -evalChange;
  const prevEval = currentEvaluation ? currentEvaluation - evalChange : 0;
  
  const getMoveData = () => {
    if (playerChange < -2.0) {
      return { icon: "💥", text: `Blunder (${evalChange.toFixed(2)})`, bgColor: "bg-red-500/20", textColor: "text-red-300" };
    }
    
    if ((isWhiteMove && prevEval > 4 && evalChange < -1.5) || (!isWhiteMove && prevEval < -4 && evalChange > 1.5)) {
      return { icon: "🏆❌", text: `Missed win (${evalChange.toFixed(2)})`, bgColor: "bg-orange-500/20", textColor: "text-orange-300" };
    }
    
    if (Math.abs(evalChange) <= 0.2) {
      return { icon: "✨", text: `Good move (${evalChange >= 0 ? '+' : ''}${evalChange.toFixed(2)})`, bgColor: "bg-green-400/20", textColor: "text-green-300" };
    }
    
    if (Math.abs(evalChange) <= 0.5) {
      return { icon: "👍", text: `Decent move (${evalChange >= 0 ? '+' : ''}${evalChange.toFixed(2)})`, bgColor: "bg-yellow-400/20", textColor: "text-yellow-300" };
    }
    
    return { icon: "❌", text: `Bad move (${evalChange >= 0 ? '+' : ''}${evalChange.toFixed(2)})`, bgColor: "bg-red-400/20", textColor: "text-red-300" };
  };
  
  const { icon, text, bgColor, textColor } = getMoveData();
  
  return (
    <Badge variant="secondary" className={`text-xs font-mono ${bgColor} text-white border-0 px-3 py-1 shadow-lg backdrop-blur-sm`}>
      <div className="flex items-center gap-1">
        <span className="text-sm">{icon}</span>
        <span className={textColor}>{text}</span>
      </div>
    </Badge>
  );
};