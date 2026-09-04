import { useState, useRef, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "home" | "chat" | "progress" | "social";

interface Action {
  id: string;
  weaknessId: string;
  weaknessLabel: string;
  content: string;
  frequency: string;
  timing: string;
  difficulty: number;
  logs: ActionLog[];
}

interface ActionLog {
  date: string;
  done: boolean;
  reason?: string;
}

interface Message {
  role: "user" | "ai";
  text: string;
}

interface GroupMember {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  streak: number;
  rate: number;
  actions: number;
  isMe?: boolean;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
const d = (offset: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - offset);
  return dt.toISOString().slice(0, 10);
};

const initialActions: Action[] = [
  {
    id: "a1",
    weaknessId: "w1",
    weaknessLabel: "夜のSNS過多",
    content: "21時以降はスマホをベッドから離す",
    frequency: "毎日",
    timing: "夜",
    difficulty: 2,
    logs: [
      { date: d(6), done: true },
      { date: d(5), done: true },
      { date: d(4), done: false, reason: "忘れていた" },
      { date: d(3), done: true },
      { date: d(2), done: true },
      { date: d(1), done: true },
    ],
  },
  {
    id: "a2",
    weaknessId: "w1",
    weaknessLabel: "夜のSNS過多",
    content: "SNS閲覧を1日30分に制限するアプリを設定する",
    frequency: "毎日",
    timing: "朝",
    difficulty: 1,
    logs: [
      { date: d(6), done: true },
      { date: d(5), done: false, reason: "やる気が出なかった" },
      { date: d(4), done: true },
      { date: d(3), done: true },
      { date: d(2), done: false, reason: "忙しかった" },
      { date: d(1), done: true },
    ],
  },
  {
    id: "a3",
    weaknessId: "w2",
    weaknessLabel: "先延ばし癖",
    content: "タスク着手前に「机に3分座る」だけを目標にする",
    frequency: "週5回",
    timing: "午前",
    difficulty: 1,
    logs: [
      { date: d(5), done: true },
      { date: d(4), done: true },
      { date: d(3), done: true },
      { date: d(2), done: true },
      { date: d(1), done: false, reason: "忘れていた" },
    ],
  },
];

const ACTIONS_STORAGE_KEY = "weakness-support-actions-v1";
const CHAT_STORAGE_KEY = "weakness-support-chat-v1";

function loadActions(): Action[] {
  try {
    const saved = localStorage.getItem(ACTIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) as Action[] : initialActions;
  } catch {
    return initialActions;
  }
}

function loadMessages(): Message[] {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    return saved ? JSON.parse(saved) as Message[] : [{ role: "ai", text: aiResponses[0] }];
  } catch {
    return [{ role: "ai", text: aiResponses[0] }];
  }
}

const groupMembers: GroupMember[] = [
  { id: "me", name: "あなた", initials: "私", avatarBg: "#EAE8FF", avatarColor: "#4F46E5", streak: 12, rate: 83, actions: 3, isMe: true },
  { id: "u1", name: "田中 蓮", initials: "田", avatarBg: "#DBEAFE", avatarColor: "#2563EB", streak: 18, rate: 91, actions: 2 },
  { id: "u2", name: "佐藤 葵", initials: "佐", avatarBg: "#D1FAE5", avatarColor: "#059669", streak: 7, rate: 71, actions: 4 },
  { id: "u3", name: "山田 陽斗", initials: "山", avatarBg: "#FEF3C7", avatarColor: "#D97706", streak: 21, rate: 95, actions: 2 },
  { id: "u4", name: "鈴木 ひな", initials: "鈴", avatarBg: "#FFE4E6", avatarColor: "#E11D48", streak: 5, rate: 60, actions: 3 },
];

const progressData = [
  { week: "3週前", rate: 45, sns: 90 },
  { week: "2週前", rate: 62, sns: 70 },
  { week: "先週", rate: 74, sns: 52 },
  { week: "今週", rate: 83, sns: 38 },
];

// ── AI conversation ───────────────────────────────────────────────────────────

const aiResponses: Record<number, string> = {
  0: "こんにちは。今日はどんなことを話したいですか？最近、自分について気になっていることや、うまくいかないと感じていることがあれば、気軽に教えてください。",
  1: "なるほど、ありがとうございます。もう少し具体的に聞かせてください。それはどんな場面で特に起こりやすいですか？たとえば、時間帯や状況など。",
  2: "そういう状況があるんですね。その時、どんな気持ちや感情があると思いますか？「やらなきゃ」という焦り、それとも面倒くさいという感覚、どちらが近いですか？",
  3: "話を整理すると、こんなことが見えてきました。\n\n言語化できた弱点\n具体的な状況での行動パターンが習慣化している\n\n考えられる原因\n・環境的なトリガーが存在する\n・感情的な逃避のパターン\n\n次の一歩（候補）\n・まず「気づいた瞬間」を記録する\n・環境を小さく変える\n\nこの内容で対策を設計してみましょうか？",
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconToday({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#4F46E5" : "#C4C2CB"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      {active && <path d="M8 14l2.5 2.5L16 12" strokeWidth="2" stroke="#4F46E5" />}
    </svg>
  );
}

function IconChat({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#4F46E5" : "none"} stroke={active ? "#4F46E5" : "#C4C2CB"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconProgress({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#4F46E5" : "#C4C2CB"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconSocial({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#4F46E5" : "#C4C2CB"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ member, size = 36 }: { member: GroupMember; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: member.avatarBg,
        color: member.avatarColor,
        fontSize: size * 0.38,
      }}
    >
      {member.initials}
    </div>
  );
}

// ── Week dots ─────────────────────────────────────────────────────────────────

function WeekDots({ logs }: { logs: ActionLog[] }) {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = d(6 - i);
    const log = logs.find((l) => l.date === date);
    return { date, log };
  });
  return (
    <div className="flex gap-1 mt-2">
      {days.map(({ date, log }) => {
        const state = log ? (log.done ? "done" : "fail") : "empty";
        return (
          <div
            key={date}
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: state === "done" ? "#4F46E5" : state === "fail" ? "#FFE4E6" : "#F0EFE9",
            }}
          >
            {state === "done" && (
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {state === "fail" && (
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#E11D48" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── HomeTab ────────────────────────────────────────────────────────────────────

function HomeTab({
  actions,
  onToggle,
}: {
  actions: Action[];
  onToggle: (id: string, done: boolean, reason?: string) => void;
}) {
  const [failModal, setFailModal] = useState<string | null>(null);
  const [failReason, setFailReason] = useState("");
  const reasons = ["忙しかった", "忘れていた", "やる気が出なかった", "体調が悪かった"];

  const todayDone = (a: Action) => a.logs.find((l) => l.date === today)?.done;

  const handleFail = (id: string) => {
    setFailModal(id);
    setFailReason("");
  };

  const confirmFail = () => {
    if (failModal) onToggle(failModal, false, failReason || "未記入");
    setFailModal(null);
  };

  const streak = (() => {
    let s = 0;
    const allDone = (date: string) =>
      actions.every((a) => {
        const log = a.logs.find((l) => l.date === date);
        return !log || log.done;
      });
    for (let i = 1; i <= 30; i++) {
      if (allDone(d(i))) s++;
      else break;
    }
    return s;
  })();

  const doneCount = actions.filter((a) => todayDone(a) === true).length;
  const totalCount = actions.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  const dateStr = new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-8 pb-5">
        <p className="text-xs font-medium" style={{ color: "#9391A0", letterSpacing: "0.02em" }}>{dateStr}</p>
        <div className="flex items-end justify-between mt-1.5">
          <h1 className="text-[22px] font-bold tracking-tight">今日のアクション</h1>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "#FFF3DC" }}
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="#D97706">
              <path d="M10 2C10 2 6 7 6 11a4 4 0 0 0 8 0c0-4-4-9-4-9z" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: "#D97706", fontFamily: "'DM Mono', monospace" }}>
              {streak + doneCount}日
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium" style={{ color: "#9391A0" }}>
              {doneCount}/{totalCount} 完了
            </span>
            <span className="text-xs font-semibold" style={{ color: "#4F46E5", fontFamily: "'DM Mono', monospace" }}>
              {pct}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "#EEECEA" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "#4F46E5" }}
            />
          </div>
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: "#E8E7E2" }} />

      {/* Action list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {actions.map((action) => {
          const log = action.logs.find((l) => l.date === today);
          const isDone = log?.done === true;
          const isFailed = log?.done === false;

          return (
            <div
              key={action.id}
              className="rounded-2xl p-4 transition-all"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${isDone ? "#C7D2FE" : "#E8E7E2"}`,
              }}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => {
                    if (!isDone && !isFailed) onToggle(action.id, true);
                    else if (isDone) setFailModal(action.id);
                  }}
                  className="mt-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: isDone ? "#4F46E5" : "transparent",
                    border: isDone ? "none" : "1.8px solid #C4C2CB",
                  }}
                >
                  {isDone && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6l2.5 2.5L9.5 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: "#4F46E5", letterSpacing: "0.08em" }}
                  >
                    {action.weaknessLabel}
                  </span>
                  <p
                    className="text-[14px] font-medium leading-snug mt-0.5"
                    style={{
                      color: isDone ? "#C4C2CB" : "#141318",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    {action.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px]" style={{ color: "#9391A0" }}>
                      {action.frequency}
                    </span>
                    <span style={{ color: "#E8E7E2" }}>·</span>
                    <span className="text-[11px]" style={{ color: "#9391A0" }}>
                      {action.timing}
                    </span>
                  </div>
                  <WeekDots logs={action.logs} />
                  {isFailed && (
                    <p
                      className="text-[11px] mt-2 px-2 py-1 rounded-lg inline-block font-medium"
                      style={{ background: "#FFE4E6", color: "#E11D48" }}
                    >
                      {log?.reason}
                    </p>
                  )}
                </div>
              </div>
              {!isDone && !isFailed && (
                <div className="flex gap-2 mt-3 ml-[34px]">
                  <button
                    onClick={() => onToggle(action.id, true)}
                    className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
                    style={{ background: "#4F46E5", color: "#fff" }}
                  >
                    実行した
                  </button>
                  <button
                    onClick={() => handleFail(action.id)}
                    className="flex-1 py-2 rounded-xl text-[13px] font-medium transition-all"
                    style={{ background: "#F0EFE9", color: "#9391A0" }}
                  >
                    できなかった
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div className="h-4" />
      </div>

      {/* Fail modal */}
      {failModal && (
        <div
          className="absolute inset-0 flex items-end"
          style={{ background: "#00000060", zIndex: 50 }}
          onClick={() => setFailModal(null)}
        >
          <div
            className="w-full rounded-t-3xl p-6 space-y-4"
            style={{ background: "#FFFFFF" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "#E8E7E2" }} />
            <h3 className="font-bold text-[17px] mt-2">できなかった理由は？</h3>
            <p className="text-[13px]" style={{ color: "#9391A0" }}>
              正直に記録することが、次への糸口になります。
            </p>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setFailReason(r)}
                  className="py-3 px-3 rounded-2xl text-[13px] text-left font-medium transition-all"
                  style={{
                    background: failReason === r ? "#EAE8FF" : "#F7F6F3",
                    border: `1px solid ${failReason === r ? "#4F46E5" : "#E8E7E2"}`,
                    color: failReason === r ? "#4F46E5" : "#141318",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              className="w-full text-[13px] px-4 py-3 rounded-2xl outline-none"
              style={{
                background: "#F7F6F3",
                border: "1px solid #E8E7E2",
                color: "#141318",
              }}
              placeholder="その他（自由記述）"
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
            />
            <button
              onClick={confirmFail}
              className="w-full py-3.5 rounded-2xl font-bold text-[14px]"
              style={{ background: "#141318", color: "#fff" }}
            >
              記録する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ChatTab ────────────────────────────────────────────────────────────────────

function ChatTab() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [turn, setTurn] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setIsTyping(true);
    const nextTurn = Math.min(turn + 1, Object.keys(aiResponses).length - 1);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((m) => [...m, { role: "ai", text: aiResponses[nextTurn] }]);
      setTurn(nextTurn);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#F7F6F3" }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "#EAE8FF" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-[17px] leading-tight">AIと相談する</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
            <p className="text-[11px] font-medium" style={{ color: "#10B981" }}>オンライン</p>
          </div>
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: "#E8E7E2" }} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
            {msg.role === "ai" && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#EAE8FF" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            )}
            <div
              className="max-w-[78%] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-line"
              style={{
                background: msg.role === "user" ? "#141318" : "#FFFFFF",
                color: msg.role === "user" ? "#fff" : "#141318",
                borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                border: msg.role === "ai" ? "1px solid #E8E7E2" : "none",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#EAE8FF" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div
              className="px-4 py-3 rounded-[20px] rounded-bl-[4px]"
              style={{ background: "#FFFFFF", border: "1px solid #E8E7E2" }}
            >
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#C4C2CB",
                      animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div
          className="flex items-end gap-2 rounded-2xl px-4 py-3"
          style={{ background: "#FFFFFF", border: "1px solid #E8E7E2" }}
        >
          <textarea
            className="flex-1 text-[14px] resize-none outline-none max-h-24 leading-relaxed"
            style={{ background: "transparent", color: "#141318" }}
            placeholder="メッセージを入力..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-30"
            style={{ background: "#141318" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ProgressTab ────────────────────────────────────────────────────────────────

function ProgressTab({ actions }: { actions: Action[] }) {
  const [range, setRange] = useState<"week" | "month">("week");

  const comparisons = [
    { label: "夜のSNS閲覧時間", before: "90分", after: "38分", icon: "📱", improvement: true },
    { label: "先延ばし回数", before: "週8回", after: "週3回", icon: "⏰", improvement: true },
    { label: "アクション実行率", before: "45%", after: "83%", icon: "✓", improvement: false },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#F7F6F3" }}>
      <div className="px-5 pt-8 pb-5">
        <h2 className="text-[22px] font-bold tracking-tight">振り返り</h2>
        <p className="text-[13px] mt-1" style={{ color: "#9391A0" }}>
          3週間前との変化を見てみましょう
        </p>
      </div>

      <div className="h-px mx-5" style={{ background: "#E8E7E2" }} />

      <div className="px-5 py-5 space-y-5">
        {/* Range toggle */}
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "#EEECEA" }}
        >
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: range === r ? "#FFFFFF" : "transparent",
                color: range === r ? "#141318" : "#9391A0",
                boxShadow: range === r ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {r === "week" ? "週次" : "月次"}
            </button>
          ))}
        </div>

        {/* Execution rate chart */}
        <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E8E7E2" }}>
          <p className="text-[13px] font-semibold mb-4">アクション実行率の推移</p>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={progressData}>
              <XAxis
                dataKey="week"
                tick={{ fill: "#9391A0", fontSize: 11, fontFamily: "Noto Sans JP" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9391A0", fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E7E2",
                  borderRadius: 12,
                  color: "#141318",
                  fontSize: 12,
                  fontFamily: "Noto Sans JP",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(v: number) => [`${v}%`, "実行率"]}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={{ fill: "#4F46E5", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#4F46E5" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* SNS time chart */}
        <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E8E7E2" }}>
          <p className="text-[13px] font-semibold mb-4">夜のSNS閲覧時間（分）</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={progressData} barSize={24}>
              <XAxis
                dataKey="week"
                tick={{ fill: "#9391A0", fontSize: 11, fontFamily: "Noto Sans JP" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9391A0", fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E7E2",
                  borderRadius: 12,
                  color: "#141318",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(v: number) => [`${v}分`, "SNS時間"]}
              />
              <Bar dataKey="sns" radius={[6, 6, 0, 0]}>
                {progressData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === progressData.length - 1 ? "#E11D48" : "#EEECEA"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Before / After */}
        <div>
          <p className="text-[13px] font-semibold mb-3">3週間前 → 今の変化</p>
          <div className="space-y-2">
            {comparisons.map((c) => (
              <div
                key={c.label}
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: "#FFFFFF", border: "1px solid #E8E7E2" }}
              >
                <div>
                  <p className="text-[12px] font-medium mb-2" style={{ color: "#9391A0" }}>{c.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold" style={{ color: "#C4C2CB", fontFamily: "'DM Mono', monospace" }}>{c.before}</span>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="#C4C2CB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[15px] font-bold" style={{ color: "#141318", fontFamily: "'DM Mono', monospace" }}>{c.after}</span>
                  </div>
                </div>
                <div className="ml-auto">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#D1FAE5" }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 10L8 5l5 5" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-action rates */}
        <div>
          <p className="text-[13px] font-semibold mb-3">対策別の実行率</p>
          <div className="space-y-2">
            {actions.map((a) => {
              const total = a.logs.length;
              const done = a.logs.filter((l) => l.done).length;
              const rate = total ? Math.round((done / total) * 100) : 0;
              const color = rate >= 80 ? "#4F46E5" : rate >= 50 ? "#D97706" : "#E11D48";
              return (
                <div
                  key={a.id}
                  className="rounded-2xl p-4"
                  style={{ background: "#FFFFFF", border: "1px solid #E8E7E2" }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[13px] font-medium flex-1 pr-3 leading-snug">{a.content}</p>
                    <span
                      className="text-[14px] font-bold flex-shrink-0"
                      style={{ color, fontFamily: "'DM Mono', monospace" }}
                    >
                      {rate}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "#EEECEA" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${rate}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ── SocialTab ──────────────────────────────────────────────────────────────────

function SocialTab() {
  const [rankBy, setRankBy] = useState<"streak" | "rate">("streak");
  const sorted = [...groupMembers].sort((a, b) =>
    rankBy === "streak" ? b.streak - a.streak : b.rate - a.rate
  );

  const rankColors = ["#D97706", "#6B7280", "#92400E"];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#F7F6F3" }}>
      <div className="px-5 pt-8 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-bold tracking-tight">みんなの進捗</h2>
            <p className="text-[13px] mt-1" style={{ color: "#9391A0" }}>
              TMCグループ · {groupMembers.length}人
            </p>
          </div>
          <button
            className="text-[13px] px-3.5 py-2 rounded-full font-semibold transition-all"
            style={{ background: "#141318", color: "#fff" }}
          >
            招待
          </button>
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: "#E8E7E2" }} />

      <div className="px-5 py-5 space-y-5">
        {/* Rank toggle */}
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "#EEECEA" }}
        >
          <button
            onClick={() => setRankBy("streak")}
            className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all"
            style={{
              background: rankBy === "streak" ? "#FFFFFF" : "transparent",
              color: rankBy === "streak" ? "#141318" : "#9391A0",
              boxShadow: rankBy === "streak" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            継続日数
          </button>
          <button
            onClick={() => setRankBy("rate")}
            className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all"
            style={{
              background: rankBy === "rate" ? "#FFFFFF" : "transparent",
              color: rankBy === "rate" ? "#141318" : "#9391A0",
              boxShadow: rankBy === "rate" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            実行率
          </button>
        </div>

        {/* Leaderboard */}
        <div className="space-y-2">
          {sorted.map((member, i) => (
            <div
              key={member.id}
              className="rounded-2xl p-4 flex items-center gap-3 transition-all"
              style={{
                background: member.isMe ? "#EAE8FF" : "#FFFFFF",
                border: `1px solid ${member.isMe ? "#C7D2FE" : "#E8E7E2"}`,
              }}
            >
              {/* Rank number */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: i < 3 ? rankColors[i] : "#C4C2CB",
                  background: i < 3 ? `${rankColors[i]}18` : "transparent",
                }}
              >
                {i + 1}
              </div>

              {/* Avatar */}
              <Avatar member={member} size={36} />

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[14px] truncate">{member.name}</p>
                  {member.isMe && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "#4F46E5", color: "#fff" }}
                    >
                      自分
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px]" style={{ color: "#9391A0", fontFamily: "'DM Mono', monospace" }}>
                    {member.streak}日連続
                  </span>
                  <span className="text-[11px]" style={{ color: "#9391A0", fontFamily: "'DM Mono', monospace" }}>
                    {member.rate}%
                  </span>
                </div>
              </div>

              {/* Primary metric */}
              <div className="text-right flex-shrink-0">
                <p
                  className="text-[20px] font-bold leading-none"
                  style={{
                    color: i === 0 ? rankColors[0] : member.isMe ? "#4F46E5" : "#141318",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {rankBy === "streak" ? member.streak : member.rate}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#9391A0" }}>
                  {rankBy === "streak" ? "日" : "%"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", border: "1px solid #E8E7E2" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9391A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-[13px] font-semibold">プライバシー設定</p>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "#9391A0" }}>
            進捗（実行率・継続日数）のみ共有中。弱点の内容は非公開。
          </p>
          <button
            className="mt-3 text-[12px] font-semibold"
            style={{ color: "#4F46E5" }}
          >
            共有範囲を変更
          </button>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [actions, setActions] = useState<Action[]>(loadActions);

  useEffect(() => {
    localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actions));
  }, [actions]);

  const handleToggle = (id: string, done: boolean, reason?: string) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const filtered = a.logs.filter((l) => l.date !== today);
        return {
          ...a,
          logs: [...filtered, { date: today, done, reason }],
        };
      })
    );
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "home", label: "今日" },
    { id: "chat", label: "相談" },
    { id: "progress", label: "振り返り" },
    { id: "social", label: "みんな" },
  ];

  return (
    <div
      className="relative flex flex-col"
      style={{
        height: "100%",
        maxWidth: 430,
        margin: "0 auto",
        background: "#F7F6F3",
      }}
    >
      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {tab === "home" && <HomeTab actions={actions} onToggle={handleToggle} />}
        {tab === "chat" && <ChatTab />}
        {tab === "progress" && <ProgressTab actions={actions} />}
        {tab === "social" && <SocialTab />}
      </div>

      {/* Bottom nav */}
      <div
        className="flex-shrink-0"
        style={{
          background: "#FFFFFF",
          borderTop: "1px solid #E8E7E2",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex px-2">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center gap-1.5 pt-3 pb-3 transition-all"
              >
                {t.id === "home" && <IconToday active={active} />}
                {t.id === "chat" && <IconChat active={active} />}
                {t.id === "progress" && <IconProgress active={active} />}
                {t.id === "social" && <IconSocial active={active} />}
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: active ? "#4F46E5" : "#C4C2CB" }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
