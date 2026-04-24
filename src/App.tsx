import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  RotateCcw,
  User,
  Cpu,
  Dices,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  UserPlus,
  ChevronLeft,
  Shuffle,
  Palette,
  X,
  Bus,
  Gamepad2,
  Send,
  Zap,
  Timer,
} from "lucide-react";
import confetti from "canvas-confetti";

// Game constants
const BOARD_SIZE = 10;
const TOTAL_SQUARES = BOARD_SIZE * BOARD_SIZE;

// Snakes and Ladders mapping
const SNAKES: Record<number, number> = {
  14: 4,
  31: 9,
  44: 26,
  54: 34,
  62: 19,
  68: 49,
  87: 24,
  93: 73,
  95: 75,
  98: 79,
};

const LADDERS: Record<number, number> = {
  2: 38,
  7: 17,
  12: 50,
  21: 42,
  28: 84,
  36: 44,
  41: 79,
  51: 67,
  57: 76,
  63: 81,
  71: 91,
  80: 100,
};

const SnakeIcon: React.FC<{ color: string; style: "realistic" | "arrow" }> = ({
  color,
  style,
}) =>
  style === "realistic" ? (
    <svg
      viewBox="0 0 24 24"
      className="w-full h-full p-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M7 21c0-2 1.5-4 3-4s3 2 3 4 1.5 4 3 4 3-2 3-4M7 11c0-2 1.5-4 3-4s3 2 3 4 1.5 4 3 4 3-2 3-4M17 3c0 2-1.5 4-3 4s-3-2-3-4"
        style={{ color }}
      />
      <circle cx="17" cy="3" r="1.5" fill={color} stroke="none" />
    </svg>
  ) : (
    <ArrowDownRight style={{ color }} className="w-full h-full p-2" />
  );

const LadderIcon: React.FC<{ color: string; style: "realistic" | "arrow" }> = ({
  color,
  style,
}) =>
  style === "realistic" ? (
    <svg
      viewBox="0 0 24 24"
      className="w-full h-full p-1 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v18M16 3v18M8 7h8M8 11h8M8 15h8M8 19h8" style={{ color }} />
    </svg>
  ) : (
    <ArrowUpRight style={{ color }} className="w-full h-full p-2" />
  );

const DiceFace: React.FC<{ value: number; isRolling: boolean }> = ({
  value,
  isRolling,
}) => {
  const dotPatterns: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const dots = dotPatterns[value] || [];

  return (
    <div
      className={`w-12 h-12 bg-white rounded-xl shadow-2xl relative grid grid-cols-3 grid-rows-3 p-2 gap-1 overflow-hidden border-b-4 border-slate-300 transition-all ${isRolling ? "blur-[2px] scale-95 opacity-80" : "blur-0 scale-100 opacity-100"}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isRolling ? "rolling" : value}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2.5 gap-1"
        >
          {!isRolling &&
            dots.map((dotIdx) => (
              <div
                key={dotIdx}
                style={{
                  gridColumnStart: (dotIdx % 3) + 1,
                  gridRowStart: Math.floor(dotIdx / 3) + 1,
                }}
                className="w-1.5 h-1.5 rounded-full bg-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] self-center justify-self-center"
              />
            ))}
          {isRolling && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

type BoardTheme = {
  evenColor: string;
  oddColor: string;
  snakeColor: string;
  ladderColor: string;
  visualStyle: "realistic" | "arrow";
};

const BOARD_PRESETS = {
  TACTICAL: {
    evenColor: "#33415566",
    oddColor: "#33415533",
    snakeColor: "#ef4444",
    ladderColor: "#22c55e",
  },
  NEON: {
    evenColor: "#1e1b4b66",
    oddColor: "#312e8133",
    snakeColor: "#f472b6",
    ladderColor: "#2dd4bf",
  },
  TOXIC: {
    evenColor: "#064e3b66",
    oddColor: "#065f4633",
    snakeColor: "#facc15",
    ladderColor: "#4ade80",
  },
  DESERT: {
    evenColor: "#451a0366",
    oddColor: "#78350f33",
    snakeColor: "#b91c1c",
    ladderColor: "#fbbf24",
  },
};

const ARABIC_LETTERS = [
  "أ",
  "ب",
  "ت",
  "ث",
  "ج",
  "ح",
  "خ",
  "د",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ك",
  "ل",
  "م",
  "ن",
  "هـ",
  "و",
  "ي",
];
const BUS_CATEGORIES = [
  { id: "name", label: "Name / اسم", placeholder: "مثلاً: محمد" },
  { id: "animal", label: "Animal / حيوان", placeholder: "مثلاً: أسد" },
  { id: "plant", label: "Plant / نبات", placeholder: "مثلاً: أرز" },
  { id: "inanimate", label: "Inanimate / جماد", placeholder: "مثلاً: إبريق" },
  { id: "country", label: "Country / بلاد", placeholder: "مثلاً: ألمانيا" },
];

type Player = {
  id: number;
  name: string;
  position: number;
  color: string;
  isBot: boolean;
  avatarSeed: string;
};

type GameState = "MENU" | "SETUP" | "PLAYING" | "FINISHED";

const COLORS = [
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

type GameMode = "HUB" | "SNAKE_LADDER" | "BUS_COMPLETE";

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<GameMode>("HUB");

  return (
    <div className="fixed inset-0 bg-slate-910 text-white font-sans flex flex-col items-center justify-center p-3 sm:p-4 lg:p-8 gap-4 sm:gap-8 overflow-hidden select-none translate-z-0 overscroll-none touch-none">
      <AnimatePresence mode="wait">
        {activeMode === "HUB" && (
          <motion.div
            key="hub"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8"
          >
            <div className="md:col-span-2 text-center mb-2 sm:mb-8">
              <h1 className="text-4xl sm:text-7xl font-black italic tracking-tighter uppercase leading-none mb-2 sm:mb-4">
                ARENA<span className="text-blue-500 not-italic">HUB</span>
              </h1>
              <p className="text-slate-500 font-black text-[8px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.5em]">
                Select Operational Theatre // اختر اللعبة
              </p>
            </div>

            <button
              onClick={() => setActiveMode("SNAKE_LADDER")}
              className="bg-slate-900 bg-opacity-50 hover:bg-blue-600 hover:bg-opacity-20 group p-8 sm:p-12 rounded-3xl sm:rounded-[3.5rem] border border-white border-opacity-5 transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all group-hover:scale-150 rotate-12">
                <Gamepad2 size={80} className="sm:w-[120px] sm:h-[120px]" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl">
                  <Zap className="text-white" size={24} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">
                  Snake &<br />
                  Ladder
                </h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  Tactical Board Deployment // سلم وثعبان
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveMode("BUS_COMPLETE")}
              className="bg-slate-900 bg-opacity-50 hover:bg-green-600 hover:bg-opacity-20 group p-8 sm:p-12 rounded-3xl sm:rounded-[3.5rem] border border-white border-opacity-5 transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all group-hover:scale-150 -rotate-12">
                <Bus size={80} className="sm:w-[120px] sm:h-[120px]" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl">
                  <Zap className="text-white" size={24} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">
                  Bus
                  <br />
                  Complete
                </h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  Linguistic Logistics // اتوبيس كومبليت
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {activeMode === "SNAKE_LADDER" && (
          <motion.div
            key="snakes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center"
          >
            <SnakeLadderGame onBack={() => setActiveMode("HUB")} />
          </motion.div>
        )}

        {activeMode === "BUS_COMPLETE" && (
          <motion.div
            key="bus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center"
          >
            <BusCompleteGame onBack={() => setActiveMode("HUB")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- SNAKE & LADDER COMPONENT ---
function SnakeLadderGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<GameState>("MENU");
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 1,
      name: "Commander",
      position: 1,
      color: COLORS[0],
      isBot: false,
      avatarSeed: "Commander",
    },
    {
      id: 2,
      name: "AI Reaper",
      position: 1,
      color: COLORS[1],
      isBot: true,
      avatarSeed: "Reaper",
    },
  ]);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameLogs, setGameLogs] = useState<string[]>([
    "Arena ready for deployment.",
  ]);
  const [showRules, setShowRules] = useState(false);
  const [possibleMoves, setPossibleMoves] = useState<number[] | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>({
    evenColor: "#33415566", // slate-700/40
    oddColor: "#33415533", // slate-700/20
    snakeColor: "#ef4444",
    ladderColor: "#22c55e",
    visualStyle: "realistic",
  });

  const currentPlayer = players[currentPlayerIndex] || players[0];

  const addLog = (message: string) => {
    setGameLogs((prev) => [message, ...prev.slice(0, 4)]);
  };

  const selectSolo = () => {
    setPlayers([
      {
        id: 1,
        name: "COMMANDER",
        position: 1,
        color: COLORS[0],
        isBot: false,
        avatarSeed: "Commander",
      },
      {
        id: 2,
        name: "AI REAPER",
        position: 1,
        color: COLORS[1],
        isBot: true,
        avatarSeed: "Reaper",
      },
    ]);
    setGameState("SETUP");
    addLog("Solo Tactical Configuration initialized.");
  };

  const selectMulti = () => {
    setGameState("SETUP");
  };

  const startGame = () => {
    if (players.length < 2) return;
    setGameState("PLAYING");
    addLog("Squad Match sequence initiated.");
  };

  const addPlayer = () => {
    if (players.length >= 4) return;
    const id = players.length + 1;
    const isBot = false;
    setPlayers([
      ...players,
      {
        id,
        name: `Player ${id}`,
        position: 1,
        color: COLORS[players.length % COLORS.length],
        isBot,
        avatarSeed: `Player${id}${Math.random()}`,
      },
    ]);
  };

  const removePlayer = (id: number) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((p) => p.id !== id));
  };

  const togglePlayerType = (id: number) => {
    setPlayers(
      players.map((p) => (p.id === id ? { ...p, isBot: !p.isBot } : p)),
    );
  };

  const updatePlayerName = (id: number, name: string) => {
    setPlayers(
      players.map((p) =>
        p.id === id ? { ...p, name, avatarSeed: name || `Seed${id}` } : p,
      ),
    );
  };

  const updatePlayerColor = (id: number, color: string) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, color } : p)));
  };

  const updatePlayerAvatar = (id: number, avatarSeed: string) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, avatarSeed } : p)));
  };

  const rollDice = useCallback(async () => {
    if (isRolling || isMoving || winner || gameState !== "PLAYING") return;

    setIsRolling(true);

    // Near-instant feedback delay
    await new Promise((resolve) => setTimeout(resolve, 80));

    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;

    setDiceValue(roll1);
    setPossibleMoves([roll1, roll2]);
    setIsRolling(false);

    // AI Strategic Decision Logic
    if (currentPlayer.isBot) {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const evaluate = (roll: number) => {
        const target = currentPlayer.position + roll;
        if (target > TOTAL_SQUARES) return -999;
        let final = target;
        if (LADDERS[target]) final = LADDERS[target];
        if (SNAKES[target]) final = SNAKES[target];
        // Weight: Prefer ladders, avoid snakes, maximize distance
        let score = final;
        if (LADDERS[target]) score += 10;
        return score;
      };

      const choice = evaluate(roll1) >= evaluate(roll2) ? roll1 : roll2;
      setDiceValue(choice);
      addLog(`${currentPlayer.name} selecting optimal trajectory.`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPossibleMoves(null);
      await movePlayer(choice);
    }
  }, [isRolling, isMoving, winner, gameState, players, currentPlayerIndex]);

  const selectManualMove = async (roll: number) => {
    if (isMoving || !possibleMoves) return;
    setDiceValue(roll);
    setPossibleMoves(null);
    await movePlayer(roll);
  };

  const movePlayer = async (steps: number) => {
    setIsMoving(true);
    const updatedPlayers = [...players];
    const player = updatedPlayers[currentPlayerIndex];
    let currentPos = player.position;
    let targetPos = currentPos + steps;

    if (targetPos > TOTAL_SQUARES) {
      addLog(`${player.name} overshot.`);
      setIsMoving(false);
      nextTurn();
      return;
    }

    // Step by step move
    for (let i = 1; i <= steps; i++) {
      currentPos++;
      updatedPlayers[currentPlayerIndex].position = currentPos;
      setPlayers([...updatedPlayers]);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Check ladders / snakes
    let finalPos = currentPos;
    let isSpecial = false;

    if (LADDERS[currentPos]) {
      finalPos = LADDERS[currentPos];
      addLog(`🚀 BOOST: ${player.name} hit a Ladder!`);
      isSpecial = true;
    } else if (SNAKES[currentPos]) {
      finalPos = SNAKES[currentPos];
      addLog(`🐍 AMBUSH: ${player.name} hit a Snake!`);
      isSpecial = true;
    }

    if (isSpecial) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      updatedPlayers[currentPlayerIndex].position = finalPos;
      setPlayers([...updatedPlayers]);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    if (finalPos === TOTAL_SQUARES) {
      setWinner(updatedPlayers[currentPlayerIndex]);
      setGameState("FINISHED");
      addLog(`🏆 ${updatedPlayers[currentPlayerIndex].name} SECURED VICTORY!`);
    } else {
      nextTurn();
    }
    setIsMoving(false);
  };

  const nextTurn = () => {
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  };

  const resetToMenu = () => {
    setPlayers([
      {
        id: 1,
        name: "Commander",
        position: 1,
        color: COLORS[0],
        isBot: false,
        avatarSeed: "Commander",
      },
      {
        id: 2,
        name: "AI Reaper",
        position: 1,
        color: COLORS[1],
        isBot: true,
        avatarSeed: "Reaper",
      },
    ]);
    setCurrentPlayerIndex(0);
    setDiceValue(0);
    setWinner(null);
    setGameState("MENU");
    setGameLogs(["System reset. Standing by."]);
  };

  useEffect(() => {
    if (gameState === "FINISHED" && winner) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 100,
      };

      const randomInRange = (min: number, max: number) =>
        Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [gameState, winner]);

  useEffect(() => {
    if (
      gameState === "PLAYING" &&
      currentPlayer.isBot &&
      !winner &&
      !isRolling &&
      !isMoving
    ) {
      const timer = setTimeout(() => rollDice(), 1500);
      return () => clearTimeout(timer);
    }
  }, [
    currentPlayerIndex,
    gameState,
    winner,
    isRolling,
    isMoving,
    rollDice,
    currentPlayer.isBot,
  ]);

  const getCoords = (pos: number) => {
    const adjustedPos = pos - 1;
    const row = Math.floor(adjustedPos / BOARD_SIZE);
    let col = adjustedPos % BOARD_SIZE;
    if (row % 2 !== 0) col = BOARD_SIZE - 1 - col;
    return { row: BOARD_SIZE - 1 - row, col };
  };

  const getPieceOffset = (playerIndex: number, currentPos: number) => {
    const othersOnSameSquare = players.filter(
      (p, i) => p.position === currentPos && i < playerIndex,
    ).length;
    return {
      x: othersOnSameSquare * 8 - 8,
      y: othersOnSameSquare * 8 - 8,
    };
  };

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className="flex items-center justify-center w-full mb-4">
        <button
          onClick={onBack}
          className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all mr-6"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            ARENA
            <span className="text-blue-500 not-italic flex-shrink-0">DECK</span>
          </h1>
          <p className="text-slate-500 font-black text-[8px] uppercase tracking-[0.5em]">
            Tactic Module Active
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowRules(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 p-8 rounded-[2.5rem] max-w-sm w-full border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-black mb-6 text-blue-500 uppercase tracking-tighter flex items-center gap-2">
                <Info size={24} /> MISSION SETUP
              </h2>
              <div className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                <p className="bg-white/5 p-4 rounded-2xl flex items-center gap-3">
                  <span className="text-blue-500">01</span> Roll to Advance
                </p>
                <p className="bg-white/5 p-4 rounded-2xl flex items-center gap-3 text-green-400">
                  🚀 Reach Ladders for Altitude
                </p>
                <p className="bg-white/5 p-4 rounded-2xl flex items-center gap-3 text-red-400">
                  🐍 Avoid Snake Ambush Points
                </p>
                <p className="bg-white/5 p-4 rounded-2xl flex items-center gap-3">
                  <span className="text-yellow-500">WIN</span> Reach Square 100
                </p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full mt-8 bg-white text-slate-900 py-4 rounded-2xl font-black hover:scale-105 transition-all"
              >
                CONFIRMED
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {gameState === "MENU" ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg text-center space-y-12"
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-blue-600 bg-opacity-20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <h1 className="text-8xl md:text-9xl font-black italic tracking-tighter uppercase leading-[0.8] mb-4 drop-shadow-[0_10px_30px_rgba(37,99,235,0.3)]">
                SNAKE
                <br />
                <span className="text-blue-500 not-italic">LADDER</span>
              </h1>
              <div className="flex items-center justify-center gap-3 text-slate-500 font-black uppercase tracking-[0.4em] text-xs">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Local Operation // سلم وثعبان
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={selectSolo}
                className="bg-white/5 hover:bg-blue-600 p-10 rounded-[2.5rem] border border-white/5 transition-all flex flex-col items-center gap-4 group"
              >
                <Cpu className="w-12 h-12 mb-2 group-hover:scale-125 transition-transform" />
                <span className="font-black text-2xl uppercase tracking-tighter">
                  Solo Mission
                </span>
                <span className="text-[10px] opacity-40 font-black uppercase tracking-widest">
                  VS Tactical AI
                </span>
              </button>
              <button
                onClick={selectMulti}
                className="bg-white/5 hover:bg-blue-600 p-10 rounded-[2.5rem] border border-white/5 transition-all flex flex-col items-center gap-4 group"
              >
                <UserPlus className="w-12 h-12 mb-2 group-hover:scale-125 transition-transform" />
                <span className="font-black text-2xl uppercase tracking-tighter">
                  Squad Ops
                </span>
                <span className="text-[10px] opacity-40 font-black uppercase tracking-widest">
                  Local Multi
                </span>
              </button>
            </div>

            <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.5em]">
              System Version 2.0 // Arena Deployment Ready
            </p>
          </motion.div>
        ) : (
          <div
            className={`flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 w-full max-w-7xl mx-auto items-start ${gameState === "PLAYING" ? "justify-center" : ""}`}
          >
            {/* Game Board Section */}
            <div className="flex flex-col items-center w-full gap-4 lg:flex-1 relative">
              <div
                className={`relative aspect-square w-full bg-slate-800 rounded-2xl md:rounded-3xl p-1 sm:p-2 md:p-3 shadow-[0_0_100px_rgba(0,0,0,0.6)] border border-white/5 overflow-hidden self-center ${gameState === "PLAYING" ? "max-w-[min(90vw,70vh)] lg:max-w-[min(80vw,80vh)]" : "max-w-[340px] sm:max-w-[420px]"}`}
              >
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="grid grid-cols-10 grid-rows-10 h-full w-full">
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div key={i} className="border border-white/10" />
                    ))}
                  </div>
                </div>

                {/* Commands HUD - ONLY IN PLAYING */}
                {gameState === "PLAYING" && (
                  <div className="w-full max-w-[min(90vw,500px)] lg:w-80 lg:absolute lg:right-4 lg:bottom-4 z-50 mt-4 lg:mt-0">
                    {/* Compact Squad List */}
                    <div className="flex -space-x-3 hover:space-x-1 transition-all">
                      {players.map((p, i) => (
                        <div
                          key={p.id}
                          className={`w-12 h-12 rounded-full border-2 border-slate-900 overflow-hidden shadow-xl transition-all ${currentPlayerIndex === i ? "ring-2 ring-blue-500 scale-110 z-10" : "opacity-40"}`}
                        >
                          <img
                            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.avatarSeed}`}
                            className="w-full h-full"
                            alt="p"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Compact Dice Pod */}
                    <div className="bg-slate-900 bg-opacity-90 backdrop-blur-xl p-4 rounded-3xl border border-white border-opacity-10 shadow-2xl flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-left">
                          <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest">
                            {currentPlayer.name}
                          </p>
                          <p className="text-[10px] font-black text-white italic uppercase">
                            {isMoving ? "ADVANCING..." : "YOUR MOVE"}
                          </p>
                        </div>
                        <div className={isRolling ? "animate-pulse" : ""}>
                          <DiceFace
                            value={diceValue || 1}
                            isRolling={isRolling}
                          />
                        </div>
                      </div>

                      <button
                        onClick={rollDice}
                        disabled={
                          isRolling ||
                          isMoving ||
                          !!winner ||
                          currentPlayer.isBot ||
                          !!possibleMoves
                        }
                        className="w-full bg-blue-600 disabled:opacity-20 text-[8px] font-black py-2 rounded-xl uppercase tracking-widest overflow-hidden relative group"
                      >
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={
                              isRolling
                                ? "rolling"
                                : possibleMoves
                                  ? "deciding"
                                  : "idle"
                            }
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            exit={{ y: -20 }}
                            className="block"
                          >
                            {isRolling
                              ? "CALCULATING TRAJECTORY..."
                              : possibleMoves
                                ? "SELECT OPTION"
                                : currentPlayer.isBot
                                  ? "PROCESSING..."
                                  : "INITIATE ROLL"}
                          </motion.span>
                        </AnimatePresence>
                      </button>

                      {possibleMoves && !currentPlayer.isBot && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-2 gap-2 mt-1"
                        >
                          {possibleMoves.map((roll, idx) => (
                            <button
                              key={idx}
                              onClick={() => selectManualMove(roll)}
                              className="bg-blue-600 bg-opacity-20 hover:bg-blue-600 p-2 rounded-xl border border-blue-500 border-opacity-30 flex flex-col items-center gap-1 transition-all group animate-pulse hover:animate-none"
                            >
                              <span className="text-[6px] text-blue-400 font-black uppercase tracking-tighter">
                                Path {idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <DiceFace value={roll} isRolling={false} />
                                <div className="text-left">
                                  <p className="text-xs font-black leading-none text-white">
                                    +{roll}
                                  </p>
                                  <p className="text-[5px] text-blue-200 font-bold uppercase">
                                    DEPLOY
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    <button
                      onClick={resetToMenu}
                      className="self-end p-2 bg-white/5 rounded-full text-slate-500 hover:text-white transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-10 grid-rows-10 h-full w-full gap-0.5 relative z-10 rounded-xl overflow-hidden">
                  {Array.from({ length: TOTAL_SQUARES }).map((_, i) => {
                    const row = Math.floor(i / BOARD_SIZE);
                    const col = i % BOARD_SIZE;
                    let squareNum =
                      row % 2 === 0
                        ? (BOARD_SIZE - row) * BOARD_SIZE - col
                        : (BOARD_SIZE - row - 1) * BOARD_SIZE + col + 1;
                    const isLadder = LADDERS[squareNum];
                    const isSnake = SNAKES[squareNum];

                    return (
                      <div
                        key={squareNum}
                        className={`flex flex-col items-center justify-center rounded-sm text-[8px] md:text-xs font-black transition-all relative ${isLadder ? "shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]" : ""} ${isSnake ? "shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]" : ""}`}
                        style={{
                          backgroundColor:
                            squareNum % 2 === 0
                              ? boardTheme.evenColor
                              : boardTheme.oddColor,
                        }}
                      >
                        <span className="opacity-20 absolute top-0.5 left-0.5 font-mono text-[6px]">
                          {squareNum}
                        </span>
                        {isLadder && (
                          <div className="w-full h-full animate-pulse">
                            <LadderIcon
                              color={boardTheme.ladderColor}
                              style={boardTheme.visualStyle}
                            />
                          </div>
                        )}
                        {isSnake && (
                          <div className="w-full h-full animate-pulse">
                            <SnakeIcon
                              color={boardTheme.snakeColor}
                              style={boardTheme.visualStyle}
                            />
                          </div>
                        )}

                        {/* Grid highlighting for active player destination potentially, but let's keep it simple for now */}
                      </div>
                    );
                  })}

                  {players.map((p, idx) => {
                    const { row, col } = getCoords(p.position);
                    const offset = getPieceOffset(idx, p.position);
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        transition={{
                          type: "spring",
                          stiffness: 150,
                          damping: 20,
                        }}
                        className="absolute z-20 flex items-center justify-center p-0.5 pointer-events-none"
                        style={{
                          width: "10%",
                          height: "10%",
                          top: `${row * 10}%`,
                          left: `${col * 10}%`,
                        }}
                      >
                        <motion.div
                          animate={{ x: offset.x, y: offset.y }}
                          className="w-7 h-7 md:w-12 md:h-12 rounded-full shadow-2xl flex items-center justify-center relative border border-white/20"
                          style={{ backgroundColor: p.color }}
                        >
                          {currentPlayerIndex === idx &&
                            gameState === "PLAYING" && (
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{
                                  scale: [1, 1.8, 1],
                                  opacity: [0.5, 0.2, 0.5],
                                }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 rounded-full bg-white blur-md"
                              />
                            )}
                          <img
                            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.avatarSeed}&backgroundColor=transparent`}
                            alt="avatar"
                            className="w-full h-full p-0.5 z-10"
                          />
                          {currentPlayerIndex === idx &&
                            gameState === "PLAYING" && (
                              <motion.div
                                layoutId="active-indicator"
                                className="absolute -top-1 -right-1 w-2 h-2 md:w-3 md:h-3 bg-white rounded-full shadow-[0_0_10px_#fff] z-20"
                                animate={{ scale: [1, 1.4, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                              />
                            )}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panel - ONLY IN SETUP */}
            {gameState === "SETUP" && (
              <div className="flex flex-col w-full max-w-[340px] md:max-w-[380px] gap-4 mb-8 lg:mb-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="setup"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="bg-slate-800 bg-opacity-80 p-5 sm:p-6 md:p-7 rounded-2xl md:rounded-[2.5rem] border border-white border-opacity-5 shadow-2xl h-full flex flex-col justify-between"
                  >
                    <div className="mb-4 sm:mb-6 flex justify-between items-start">
                      <button
                        onClick={resetToMenu}
                        className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="text-right">
                        <h1 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter">
                          SQUAD
                        </h1>
                        <p className="text-[8px] text-blue-500 font-black tracking-widest leading-none">
                          CONFIG
                        </p>
                      </div>
                    </div>
                    <div className="mb-4 flex-1 space-y-2 overflow-y-auto touch-auto pr-1 max-h-[300px] sm:space-y-3 md:max-h-none">
                      {players.map((p) => (
                        <div
                          key={p.id}
                          className="bg-slate-900 bg-opacity-90 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white border-opacity-5 flex items-center gap-3 sm:gap-4 group/item relative"
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10 flex-shrink-0 overflow-hidden relative group/av">
                            <img
                              src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.avatarSeed}`}
                              className="w-full h-full"
                              alt="av"
                            />
                            <button
                              onClick={() =>
                                updatePlayerAvatar(
                                  p.id,
                                  Math.random().toString(),
                                )
                              }
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover/av:opacity-100 flex items-center justify-center transition-opacity text-white"
                            >
                              <Shuffle size={14} />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block text-[6px] font-black uppercase text-blue-500 tracking-[0.2em] mb-0.5">
                              Callsign
                            </span>
                            <input
                              type="text"
                              value={p.name}
                              maxLength={10}
                              onChange={(e) =>
                                updatePlayerName(p.id, e.target.value)
                              }
                              className="bg-transparent border-none p-0 text-sm sm:text-base font-black uppercase italic tracking-tight focus:ring-0 w-full mb-1 text-white"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex gap-1">
                                {COLORS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => updatePlayerColor(p.id, c)}
                                    className={`w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full border border-white border-opacity-20 transition-all ${p.color === c ? "scale-125 border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "opacity-40 hover:opacity-100"}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={p.isBot}
                                  onChange={() => togglePlayerType(p.id)}
                                  className="sr-only peer"
                                />
                                <div className="w-5 h-2.5 bg-slate-700 rounded-full peer-checked:bg-blue-600 transition-colors relative">
                                  <div
                                    className={`absolute left-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full transition-transform ${p.isBot ? "translate-x-2.5" : ""}`}
                                  />
                                </div>
                                <span className="text-[6px] font-black uppercase text-slate-600">
                                  {p.isBot ? "Bot" : "Pro"}
                                </span>
                              </label>
                            </div>
                          </div>
                          {players.length > 2 && (
                            <button
                              onClick={() => removePlayer(p.id)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors opacity-20 hover:opacity-100"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      {players.length < 4 && (
                        <button
                          onClick={addPlayer}
                          className="w-full border-2 border-dashed border-white border-opacity-10 py-3 sm:py-5 rounded-2xl md:rounded-[2rem] text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 hover:border-blue-500 transition-all"
                        >
                          + Recruit Operative
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-900 bg-opacity-60 p-4 sm:p-5 rounded-2xl md:rounded-[2rem] border border-white border-opacity-5 mb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Palette size={14} className="text-blue-400" />
                          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white">
                            Arena Styling
                          </span>
                        </div>
                        <div className="flex gap-1 overflow-x-auto">
                          {Object.entries(BOARD_PRESETS).map(([name]) => (
                            <button
                              key={name}
                              onClick={() =>
                                setBoardTheme((prev) => ({
                                  ...prev,
                                  ...BOARD_PRESETS[
                                    name as keyof typeof BOARD_PRESETS
                                  ],
                                }))
                              }
                              className={`px-2 py-1 text-[5px] sm:text-[6px] font-black rounded transition-all uppercase ${boardTheme.evenColor === BOARD_PRESETS[name as keyof typeof BOARD_PRESETS].evenColor ? "bg-blue-600 text-white" : "bg-white bg-opacity-5 text-slate-400"}`}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                        <div className="space-y-1">
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">
                            Even Tiles
                          </p>
                          <input
                            type="color"
                            value={boardTheme.evenColor.slice(0, 7)}
                            onChange={(e) =>
                              setBoardTheme((prev) => ({
                                ...prev,
                                evenColor: e.target.value + "66",
                              }))
                            }
                            className="w-full h-8 rounded-lg bg-transparent p-0 border-0 cursor-pointer overflow-hidden"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">
                            Odd Tiles
                          </p>
                          <input
                            type="color"
                            value={boardTheme.oddColor.slice(0, 7)}
                            onChange={(e) =>
                              setBoardTheme((prev) => ({
                                ...prev,
                                oddColor: e.target.value + "33",
                              }))
                            }
                            className="w-full h-8 rounded-lg bg-transparent p-0 border-0 cursor-pointer overflow-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={startGame}
                      className="w-full bg-blue-600 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] font-black text-base sm:text-lg uppercase tracking-widest hover:bg-blue-500 active:scale-95 transition-all"
                    >
                      Engage Deployment
                    </button>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-green-600 p-12 rounded-[5rem] border-[12px] border-white/5 shadow-2xl flex flex-col items-center max-w-lg w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl">
                <img
                  src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${winner.avatarSeed}`}
                  className="w-24 h-24"
                  alt="winner"
                />
              </div>
              <Trophy className="absolute bottom-12 right-12 w-24 h-24 text-white/10 -rotate-12" />
              <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none mb-3">
                VICTORY
              </h2>
              <p className="text-xl font-black uppercase text-white/80 tracking-widest mb-10">
                {winner.name} SECURED THE MATCH
              </p>
              <button
                onClick={resetToMenu}
                className="w-full bg-white text-green-900 py-8 rounded-[2rem] font-black text-2xl uppercase tracking-widest hover:scale-105 active:scale-95 shadow-2xl transition-all"
              >
                RETURN TO BASE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- BUS COMPLETE COMPONENT ---
function BusCompleteGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<"IDLE" | "PLAYING" | "SCORING">("IDLE");
  const [currentLetter, setCurrentLetter] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, number>>({});
  const [totalScore, setTotalScore] = useState(0);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (phase === "PLAYING") {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  const startRound = () => {
    const randomLetter =
      ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)];
    setCurrentLetter(randomLetter);
    setAnswers({});
    setResults({});
    setTimer(0);
    setPhase("PLAYING");
  };

  const stopBus = () => {
    setPhase("SCORING");
    calculateScores();
  };

  const calculateScores = () => {
    const newResults: Record<string, number> = {};
    let roundScore = 0;

    BUS_CATEGORIES.forEach((cat) => {
      const ans = answers[cat.id]?.trim();
      if (ans && ans.startsWith(currentLetter)) {
        newResults[cat.id] = 10;
        roundScore += 10;
      } else {
        newResults[cat.id] = 0;
      }
    });

    setResults(newResults);
    setTotalScore((prev) => prev + roundScore);
  };

  const handleInputChange = (catId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [catId]: value }));
  };

  return (
    <div className="w-full max-w-4xl flex flex-col gap-4 sm:gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 bg-opacity-50 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white border-opacity-5 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="p-2 sm:p-3 bg-white/5 rounded-xl sm:rounded-2xl text-slate-400 hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center px-2">
          <h1 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase leading-none">
            BUS<span className="text-green-500 not-italic">COMPLETE</span>
          </h1>
          <p className="text-slate-500 font-black text-[6px] sm:text-[8px] uppercase tracking-[0.3em] sm:tracking-[0.5em]">
            Linguistic Logistics // اتوبيس كومبليت
          </p>
        </div>
        <div className="flex flex-col items-end min-w-[60px]">
          <p className="text-[6px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
            Fleet Score
          </p>
          <p className="text-lg sm:text-2xl font-black text-green-500 font-mono tracking-tighter">
            {totalScore}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "IDLE" ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-6 sm:gap-8 py-8 sm:py-12"
          >
            <div className="w-32 h-32 sm:w-48 sm:h-48 bg-green-500 bg-opacity-10 rounded-full flex items-center justify-center relative">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-full blur-3xl"
              />
              <Bus
                size={60}
                className="text-green-500 sm:w-[80px] sm:h-[80px]"
              />
            </div>
            <div className="text-center space-y-2 sm:space-y-4 px-4">
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-2">
                Initialize Round
              </h2>
              <p className="text-slate-500 font-black text-[8px] sm:text-[10px] uppercase tracking-widest">
                A random letter will be deployed to all stations.
              </p>
            </div>
            <button
              onClick={startRound}
              className="bg-green-600 hover:bg-green-500 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl sm:rounded-[2.5rem] font-black text-lg sm:text-xl uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(22,163,74,0.3)] transition-all active:scale-95"
            >
              Start Deployment
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col md:grid md:grid-cols-3 gap-6"
          >
            {/* Round Control Panel */}
            <div className="md:col-span-1 space-y-4 sm:space-y-6">
              <div className="bg-slate-900 bg-opacity-50 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-white border-opacity-5 flex flex-row md:flex-col items-center justify-between md:justify-center text-center gap-4">
                <div className="flex flex-col items-center">
                  <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em]">
                    Active Letter
                  </p>
                  <div className="w-20 h-20 sm:w-32 sm:h-32 bg-green-600 rounded-2xl sm:rounded-[2.5rem] flex items-center justify-center shadow-[0_15px_40px_rgba(22,163,74,0.4)] mt-2">
                    <span className="text-4xl sm:text-7xl font-black text-white leading-none mt-1 sm:mt-2">
                      {currentLetter}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Timer size={20} />
                  <span className="font-mono font-black text-xl sm:text-2xl">
                    {timer}s
                  </span>
                </div>
              </div>

              <div className="bg-slate-900 bg-opacity-50 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white border-opacity-5 space-y-4">
                <div className="text-center hidden md:block">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Status
                  </p>
                  <p className="text-xs font-black text-green-500 uppercase tracking-widest animate-pulse">
                    In Pursuit...
                  </p>
                </div>
                <button
                  onClick={stopBus}
                  className="w-full bg-slate-100 text-slate-900 py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl uppercase tracking-widest active:scale-95 transition-all shadow-xl group overflow-hidden relative"
                >
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "linear",
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    STOP THE BUS! <Zap size={20} />
                  </span>
                </button>
              </div>
            </div>

            {/* Input Area */}
            <div className="md:col-span-2 flex flex-col gap-3 sm:gap-4 overflow-y-auto touch-auto">
              {BUS_CATEGORIES.map((cat) => (
                <motion.div
                  key={cat.id}
                  layout
                  className={`bg-slate-900 bg-opacity-50 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white border-opacity-5 flex flex-col gap-1 sm:gap-2 transition-all ${answers[cat.id] ? "border-green-500 border-opacity-30" : ""}`}
                >
                  <div className="flex justify-between items-center">
                    <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1 h-1 bg-green-500 rounded-full" />
                      {cat.label}
                    </label>
                    {phase === "SCORING" && (
                      <span
                        className={`text-[10px] sm:text-xs font-black ${results[cat.id] > 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        +{results[cat.id]}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={phase === "SCORING"}
                      placeholder={cat.placeholder}
                      value={answers[cat.id] || ""}
                      onChange={(e) =>
                        handleInputChange(cat.id, e.target.value)
                      }
                      className={`w-full bg-slate-800 bg-opacity-50 border-2 border-white border-opacity-5 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none transition-all ${phase === "SCORING" ? "opacity-50" : "focus:border-green-500 border-opacity-50"}`}
                    />
                    {answers[cat.id] && phase === "PLAYING" && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 scale-75 sm:scale-100">
                        <Zap size={18} fill="currentColor" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {phase === "SCORING" && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={startRound}
                  className="w-full bg-green-600 py-4 sm:py-6 rounded-2xl sm:rounded-[2.5rem] font-black text-lg sm:text-xl uppercase tracking-widest text-white shadow-2xl hover:bg-green-500 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                >
                  New Round Deployment{" "}
                  <RotateCcw size={20} className="sm:w-[24px] sm:h-[24px]" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
