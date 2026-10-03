import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import CandidateCard from "./components/CandidateCard";
import {
  ArrowUp,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  Copy,
  GraduationCap,
  Menu,
  Sparkles,
  User,
  X,
} from "lucide-react";

import "./App.css";


const uploadResume = async (file) => {

  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {

    setLoading(true);

    const response = await fetch(
      "https://hiremeai-backend-mm0t.onrender.com/upload-resume",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Resume upload failed");
    }

    // Save this HR's session
    setSessionId(data.session_id);

    console.log("Candidate loaded:", data.candidate);

    // Load suggested questions for this candidate
    await loadSuggestedQuestions(data.session_id);

  } catch (error) {

    console.error("Resume upload error:", error);

  } finally {

    setLoading(false);

  }
};


<div className="mb-6">
  <label className="mb-2 block text-sm font-medium text-slate-300">
    Upload Candidate Resume
  </label>

  <input
    type="file"
    accept=".pdf"
    onChange={(e) => uploadResume(e.target.files[0])}
    className="block w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300"
  />
</div>


const loadSuggestedQuestions = async (id = sessionId) => {
  if (!id) return;

  try {
    setLoadingQuestions(true);

    const response = await fetch(
      `https://hiremeai-backend-mm0t.onrender.com/interview-questions?session_id=${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: interviewMode,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to generate questions");
    }

    setSuggestedQuestions(data.questions || []);

  } catch (error) {
    console.error("Question generation error:", error);
    setSuggestedQuestions([]);
  } finally {
    setLoadingQuestions(false);
  }
};


useEffect(() => {
  if (sessionId) {
    loadSuggestedQuestions(sessionId);
  }
}, [interviewMode, sessionId]);

function App() {
  const [interviewMode, setInterviewMode] = useState("HR Interview");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidate, setCandidate] = useState(null);
  const [candidateLoading, setCandidateLoading] = useState(true);
  const [candidateError, setCandidateError] = useState(false);  const [input, setInput] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  

     

 

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hello! I'm HireMe AI. Ask me anything about the candidate's experience, projects, skills, education, or background.",
    },
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const chatEndRef = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);


  useEffect(() => {
  async function checkBackend() {
    try {
      const response = await fetch("https://hiremeai-backend-mm0t.onrender.com/");

      setBackendOnline(response.ok);
    } catch (error) {
      setBackendOnline(false);
    }
  }

  checkBackend();

  const interval = setInterval(checkBackend, 10000);

  return () => clearInterval(interval);
}, []);

  // Fetch  information
 useEffect(() => {
  async function fetchCandidate() {
    try {
      setCandidateLoading(true);
      setCandidateError(false);

      const response = await fetch("https://hiremeai-backend-mm0t.onrender.com/candidate");

      if (!response.ok) {
        throw new Error("Failed to fetch candidate");
      }

      const data = await response.json();

      setCandidate(data);
    } catch (error) {
      console.error("Could not load candidate:", error);
      setCandidateError(true);
    } finally {
      setCandidateLoading(false);
    }
  }

  fetchCandidate();
}, []);

  // Ask question to backend
  async function askQuestion(customQuestion) {
    const finalQuestion = (customQuestion ?? question).trim();

    if (!finalQuestion || loading) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: finalQuestion,
    };

    setMessages((previous) => [...previous, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("https://hiremeai-backend-mm0t.onrender.com/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
  question: finalQuestion,
  history: messages,
  mode: interviewMode,
}),
});

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(error);

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
  "I'm unable to connect right now. Please make sure the HireMe AI backend is running and try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    askQuestion();
  }

  function clearChat() {
  setMessages([
    {
      id: Date.now(),
      role: "assistant",
      content:
        "Hello! I'm HireMe AI. Ask me anything about the candidate's experience, projects, skills, education, or background.",
    },
  ]);
}


  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askQuestion();
    }
  }

  return (
    <div className="app-background">
      <div className="glow glow-blue" />
      <div className="glow glow-purple" />

      {/* NAVBAR */}
      <header className="relative z-20 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
              <Bot size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                HireMe <span className="text-blue-400">AI</span>
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                AI Candidate Interview Assistant
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-4 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              AI Online
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
              Powered by Groq
            </div>
          </div>

          <button
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 sm:hidden"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">

        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-xs text-blue-300">
            <Sparkles size={14} />
            Intelligent Resume-Based Interviews
          </div>

          <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
            Meet the candidate's
            <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              AI interview assistant.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Ask questions about the candidate's experience, projects,
            skills, education and background. HireMe AI answers using
            information from the candidate's resume.
          </p>
        </motion.section>

        {/* CANDIDATE CARD */}
        {candidate && (
          <div className="mx-auto mt-8 max-w-4xl">
            {candidateLoading ? (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-400">
    Loading candidate profile...
  </div>
) : candidateError ? (
  <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-center text-red-300">
  <p>
    Unable to load candidate profile. Make sure the backend is running.
  </p>

  <button
    onClick={() => window.location.reload()}
    className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-400/20"
  >
    Retry
  </button>
</div>
) : (
  <CandidateCard candidate={candidate} />
)}
          </div>
        )}

        {/* CHAT */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-10 max-w-4xl"
        >
          <div className="glass overflow-hidden rounded-3xl shadow-2xl shadow-black/30">

            {/* CHAT HEADER */}
<div className="flex items-center justify-between border-b border-white/10 px-5 py-4">

  <div className="flex items-center gap-3">

    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
      <Bot size={20} />
    </div>

    <div>
      <p className="text-sm font-semibold text-white">
        Candidate AI
      </p>

      {/* BACKEND STATUS */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`h-2 w-2 rounded-full ${
            backendOnline ? "bg-green-400" : "bg-red-400"
          }`}
        />

        <span className={backendOnline ? "text-green-400" : "text-red-400"}>
          {backendOnline ? "Backend Online" : "Backend Offline"}
        </span>
      </div>
    </div>

  </div>

  {/* CLEAR CHAT */}
  <button
    onClick={clearChat}
    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
  >
    Clear Chat
  </button>

  <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
    <CheckCircle2
      size={15}
      className="text-emerald-400"
    />
    Resume loaded
  </div>

</div>

            {/* MESSAGES */}
            <div className="chat-scroll h-[430px] overflow-y-auto px-4 py-6 sm:px-6">
              <div className="space-y-6">
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                  />
                ))}

                {loading && <TypingIndicator />}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* SUGGESTIONS */}
            <div className="border-t border-white/10 px-4 py-4 sm:px-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                Suggested Questions
              </p>

              {loadingQuestions ? (
                <p className="text-sm text-slate-400">
                  Generating questions...
                </p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => askQuestion(question)}
                      disabled={loading}
                      className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-400/10 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4 flex items-center gap-3">
  <label className="text-sm font-medium text-slate-300">
    Interview Mode
  </label>

  <select
    value={interviewMode}
    onChange={(e) => setInterviewMode(e.target.value)}
    className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
  >
    <option className="bg-slate-900 text-white">
      HR Interview
    </option>

    <option className="bg-slate-900 text-white">
      Technical Interview
    </option>

    <option className="bg-slate-900 text-white">
      Project Interview
    </option>

    <option className="bg-slate-900 text-white">
      Resume Interview
    </option>
  </select>
</div>

            {/* INPUT */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-white/10 p-4 sm:p-5"
            >
              <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-2 focus-within:border-blue-500/50">
                <textarea
                  value={question}
                  onChange={(event) =>
                    setQuestion(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Ask an interview question..."
                  rows={1}
                  disabled={loading}
                  className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!question.trim() || loading}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                >
                  <ArrowUp size={19} />
                </button>
              </div>

              <p className="mt-2 text-center text-[11px] text-slate-600">
                Press Enter to send • Shift + Enter for a new line
              </p>
            </form>
          </div>
        </motion.section>

        {/* FEATURES */}
        <section className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Feature
            icon={CheckCircle2}
            title="Resume Grounded"
            description="Answers are based on the candidate's resume."
          />

          <Feature
            icon={Sparkles}
            title="AI Powered"
            description="Powered by a modern large language model."
          />

          <Feature
            icon={BriefcaseBusiness}
            title="Recruiter Ready"
            description="Designed around real interview questions."
          />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-slate-600 sm:flex-row">
          <p>© 2026 HireMe AI</p>

          <p>Built with React • FastAPI • Groq</p>
        </div>
      </footer>
    </div>
  );
}

function Message({ message }) {
  const isUser = message.role === "user";

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      console.log("Could not copy message");
    }
  }

  return (
    <div
      className={`message-enter flex gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
          <Bot size={17} />
        </div>
      )}

      <div
        className={`group max-w-[82%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            isUser
              ? "rounded-br-md bg-blue-600 text-white"
              : message.error
              ? "rounded-bl-md border border-red-400/20 bg-red-400/10 text-red-200"
              : "rounded-bl-md border border-white/10 bg-white/5 text-slate-300"
          }`}
        >
          {<ReactMarkdown
  components={{
    p: ({ children }) => (
      <p className="mb-2 last:mb-0">
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-white">
        {children}
      </strong>
    ),
    ul: ({ children }) => (
      <ul className="my-2 list-disc space-y-1 pl-5">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-decimal space-y-1 pl-5">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li>{children}</li>
    ),
  }}
>
  {message.content}
</ReactMarkdown>}
        </div>

        {!isUser && !message.error && (
          <button
            onClick={copyMessage}
            className="mt-2 flex items-center gap-1 text-[11px] text-slate-600 opacity-0 transition hover:text-slate-400 group-hover:opacity-100"
          >
            <Copy size={12} />
            Copy
          </button>
        )}
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <User size={17} className="text-slate-400" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
        <Bot size={17} />
      </div>

      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-4">
        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" />
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, description }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
        <Icon size={18} />
      </div>

      <h3 className="text-sm font-semibold text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </motion.div>
  );
}

export default App;