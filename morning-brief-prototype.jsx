import { useState, useEffect, useRef, useCallback } from "react";
import { briefAPI, conversationAPI, authAPI, memoryAPI, scratchpadAPI } from "./src/services/api";

/* ═══ AI AGENT CONFIGURATION ═══ */
// Set to true to use AI, false for rule-based fallback
const USE_AI = true;

// AI response function
const getAIResponse = async (userMessage, conversationHistory, context) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
  
  if (!USE_AI || !apiKey) {
    console.log("AI disabled or no API key:", { USE_AI, hasKey: !!apiKey });
    return null; // Fall back to rule-based
  }

  try {
    console.log("Calling OpenAI API...");
    
    // Build context about current brief item (passed from context)
    const currentItem = context.currentItem || null;
    let currentItemContext = "";
    if (currentItem) {
      if (currentItem.type === "item") {
        currentItemContext = `\n\nCurrent brief item: ${currentItem.text || ""}`;
        if (currentItem.blocked) {
          currentItemContext += `\nBlocked by: ${currentItem.blocked.map(b => b.n).join(", ")}`;
        }
        if (currentItem.draft) {
          currentItemContext += `\nDraft reply available: ${currentItem.draft}`;
        }
      } else if (currentItem.type === "calendar") {
        currentItemContext = `\n\nCurrently showing: ${currentItem.text || "Today's calendar"}`;
      }
    }
    
    // Include pending Slack message context if exists
    let slackContext = "";
    if (context.pendingSlackMessage) {
      slackContext = `\n\nThere's a pending Slack message to ${context.pendingSlackMessage.recipient}: "${context.pendingSlackMessage.content}". The user might want to edit or send it.`;
    }
    
    const systemPrompt = `You are Glean, an AI assistant helping the user go through their morning brief. You present items from their work apps (Slack, GitHub, Jira, Calendar) and help them take action.

IMPORTANT CONTEXT:
${currentItemContext}${slackContext}

CONVERSATION RULES:
1. Stay focused on the current brief item being discussed. Don't make up new items or tasks.
2. If the user asks a vague question like "what", refer back to the current brief item shown above.
3. If there's a pending Slack message, help edit it when asked.
4. Keep responses short (1-2 sentences max) and action-oriented.
5. Don't hallucinate or invent tasks, people, or deadlines that aren't in the conversation.
6. If you don't know something, say so instead of making it up.

Your role is to help the user process their morning brief items, not to create new work items.`;

    // Send full conversation history (not just last 6)
    const fullHistory = conversationHistory.map(msg => ({
      role: msg.type === "user" ? "user" : "assistant",
      content: msg.text || msg.content || ""
    }));
    
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...fullHistory,
      {
        role: "user",
        content: userMessage
      }
    ];
    
    console.log("Sending to OpenAI:", {
      messageCount: messages.length,
      currentItem: currentItem?.type,
      hasPendingSlack: !!context.pendingSlackMessage
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using cheaper model for prototype
        messages: messages,
        temperature: 0.3, // Lower temperature to reduce hallucinations
        max_tokens: 150 // Shorter responses to stay focused
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices[0]?.message?.content || null;
    console.log("OpenAI response received:", aiText);
    return aiText;
  } catch (error) {
    console.error("AI API error:", error);
    return null; // Fall back to rule-based
  }
};

/* ═══ TOKENS ═══ */
const C = {
  bg: "#FAFAF8", bgW: "#FFFFFF", bgS: "#F3F2EE",
  txt: "#1C1C1A", tx2: "#6B6963", txM: "#9C978E", txL: "#C4BFB5",
  blue: "#2563EB", blueS: "#EFF4FF", blueT: "#1E4FBB",
  grn: "#16834A", grnS: "#EDFCF2",
  org: "#C2760A", orgS: "#FFF8EB",
  red: "#D4321C", redS: "#FFF0ED",
  pur: "#7929D0", purS: "#F6F0FF",
  bdr: "#E8E5DE", bdrL: "#F0EDE6",
  acc: "#1A1A18",
};

/* ═══ ATOMS ═══ */
const Fade = ({ d = 0, children }) => {
  const [v, setV] = useState(false);
  useEffect(() => { const t = setTimeout(() => setV(true), d); return () => clearTimeout(t); }, [d]);
  return <div style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(6px)", transition: "opacity .4s ease, transform .4s ease" }}>{children}</div>;
};
const Pill = ({ c, bg, children }) => <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: c, background: bg, letterSpacing: ".01em" }}>{children}</span>;
const Av = ({ name, s = 24 }) => {
  const cols = ["#2563EB", "#16834A", "#7929D0", "#C2760A", "#D4321C", "#0891B2"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % cols.length;
  return <div style={{ width: s, height: s, borderRadius: "50%", background: cols[idx], display: "flex", alignItems: "center", justifyContent: "center", fontSize: s * .42, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{name[0]}</div>;
};
const GIcon = ({ s = 32 }) => (
  <div style={{ width: s, height: s, borderRadius: s * .28, background: C.acc, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <span style={{ fontSize: s * .44, fontWeight: 800, color: "#fff" }}>G</span>
  </div>
);

/* ═══ TOOL LOGOS (inline SVG) ═══ */
const SlackLogo = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
    <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
  </svg>
);

const CalendarLogo = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4"/>
    <path d="M3 8h18M8 3v5M16 3v5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="6" y="11" width="3" height="2" rx=".5" fill="#fff"/>
    <rect x="10.5" y="11" width="3" height="2" rx=".5" fill="#fff"/>
    <rect x="15" y="11" width="3" height="2" rx=".5" fill="#fff"/>
    <rect x="6" y="15" width="3" height="2" rx=".5" fill="#fff"/>
    <rect x="10.5" y="15" width="3" height="2" rx=".5" fill="#fff"/>
    <rect x="15" y="15" width="3" height="2" rx=".5" fill="#fff"/>
  </svg>
);

const JiraLogo = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.571 2.25c-.321 0-.604.13-.804.33L.33 13.447c-.2.2-.33.483-.33.804 0 .321.13.604.33.804l4.63 4.63c.2.2.483.33.804.33.321 0 .604-.13.804-.33l10.437-10.437c.2-.2.33-.483.33-.804 0-.321-.13-.604-.33-.804l-4.63-4.63c-.2-.2-.483-.33-.804-.33z" fill="#2684FF"/>
    <path d="M11.571 10.09c-.321 0-.604.13-.804.33L6.867 14.22c-.2.2-.33.483-.33.804 0 .321.13.604.33.804l4.63 4.63c.2.2.483.33.804.33.321 0 .604-.13.804-.33l3.9-3.9c.2-.2.33-.483.33-.804 0-.321-.13-.604-.33-.804l-4.63-4.63c-.2-.2-.483-.33-.804-.33z" fill="url(#jira_a)"/>
    <path d="M11.571 14.54c-.321 0-.604.13-.804.33l-4.43 4.43c-.2.2-.33.483-.33.804 0 .321.13.604.33.804l4.63 4.63c.2.2.483.33.804.33.321 0 .604-.13.804-.33l4.42-4.42c.2-.2.33-.483.33-.804 0-.321-.13-.604-.33-.804l-4.63-4.63c-.2-.2-.483-.33-.804-.33z" fill="url(#jira_b)"/>
    <defs>
      <linearGradient id="jira_a" x1="11.08" y1="10.36" x2="7.46" y2="14.16" gradientUnits="userSpaceOnUse"><stop stopColor="#0052CC"/><stop offset="1" stopColor="#2684FF"/></linearGradient>
      <linearGradient id="jira_b" x1="11.24" y1="14.84" x2="7.73" y2="18.17" gradientUnits="userSpaceOnUse"><stop stopColor="#0052CC"/><stop offset="1" stopColor="#2684FF"/></linearGradient>
    </defs>
  </svg>
);

const GitHubLogo = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" fill="#24292F"/>
  </svg>
);

const TranscriptLogo = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="3" width="20" height="18" rx="3" fill="#8E24AA"/>
    <path d="M7 8h10M7 12h8M7 16h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="18" cy="16" r="2.5" fill="#CE93D8"/>
  </svg>
);

const TOOL_LOGOS = { slack: SlackLogo, cal: CalendarLogo, jira: JiraLogo, gh: GitHubLogo, mt: TranscriptLogo };

/* ═══ TABS ═══ */
const TABS = [
  { id: "day0", l: "Setup", i: "🚀" },
  { id: "brief", l: "Morning Brief", i: "☀️" },
  { id: "pad", l: "Scratchpad", i: "📝" },
  { id: "memory", l: "Memory", i: "🧠" },
  { id: "slack", l: "Slack", i: "💬" },
];

function Nav({ a, set, padCount }) {
  // Connected apps - these would normally come from props or state
  const connectedApps = [
    { id: "slack", name: "Slack" },
    { id: "cal", name: "Calendar" },
    { id: "jira", name: "Jira" },
    { id: "gh", name: "GitHub" },
  ];

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(250,250,248,.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", padding: "0 20px", height: 48 }}>
      <GIcon s={26} />
      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.txt, margin: "0 16px 0 8px", letterSpacing: "-.01em" }}>Morning Brief</span>
      <div style={{ display: "flex", gap: 2 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => set(t.id)} style={{
            padding: "7px 13px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
            background: a === t.id ? C.acc : "transparent", color: a === t.id ? "#fff" : C.tx2, transition: "all .15s",
            position: "relative",
          }}>
            {t.i} {t.l}
            {t.id === "pad" && padCount > 0 && a !== "pad" && (
              <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: 8, background: C.red, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{padCount}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      {/* Connected Apps */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
        {connectedApps.map(app => {
          const Logo = TOOL_LOGOS[app.id];
          return Logo ? (
            <div 
              key={app.id} 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                width: 32, 
                height: 32, 
                borderRadius: 8, 
                background: C.bgW,
                border: `1px solid ${C.bdr}`,
                cursor: "pointer",
                transition: "all .2s ease",
                position: "relative",
                boxShadow: "0 1px 2px rgba(0,0,0,.04)"
              }} 
              title={app.name}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.bgS;
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.bgW;
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,.04)";
              }}
            >
              <Logo s={18} />
            </div>
          ) : null;
        })}
      </div>
      <span style={{ fontSize: 10.5, color: C.txL, letterSpacing: ".02em" }}>PROTOTYPE</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   SCRATCHPAD — the shared living document
   Pre-populated with agent notes from throughout the day
   ═══════════════════════════════════════ */
const INITIAL_PAD = [
  { from: "agent", text: "Marcus asked about architecture decision again in #eng-backend", time: "Yesterday 4:32 PM", type: "observation" },
  { from: "agent", text: "Noticed 3 sprint tickets haven't moved since Monday — might need attention", time: "Yesterday 6:00 PM", type: "observation" },
  { from: "agent", text: "Meeting transcript: you committed to sharing revised timeline by Thursday", time: "Yesterday 2:45 PM", type: "followup" },
  { from: "agent", text: "Dev Patel's PR has been open 26 hours with you as sole reviewer", time: "Today 7:15 AM", type: "observation" },
  { from: "agent", text: "Priya from recruiting sent interview panel request — needs response today", time: "Today 8:02 AM", type: "observation" },
  { from: "user", text: "Need to bring up headcount ask in manager 1:1", time: "Yesterday 5:10 PM", type: "user" },
  { from: "agent", text: "Carryover: API versioning proposal — Lisa commented, still open", time: "From Feb 10 brief", type: "carryover" },
];

/* ═══════════════════════════════════════
   THE CONVERSATION
   ═══════════════════════════════════════ */
const CONVO = [
  // 0: Greeting
  {
    type: "assistant",
    text: "Good morning, Meghesh. I've been watching your apps overnight and jotting notes to the scratchpad. 19 items came through — 8 need you, 3 are urgent. Let me walk you through them.",
  },
  // 1: Calendar
  {
    type: "calendar",
    source: "cal",
    text: "Here's your schedule. I've connected the dots between your meetings and what's come in.",
    events: [
      { t: "9:30", n: "Standup", d: "30m" },
      { t: "10:00", n: "Sprint Planning", d: "1h", flag: "3 tickets at risk · migration thread unresolved" },
      { t: "11:30", n: "1:1 with Sarah", d: "30m", flag: "Unread design doc she shared yesterday" },
      { t: "1:00", n: "Focus Time", d: "1h30m", focus: true },
      { t: "2:30", n: "1:1 with Manager", d: "30m", flag: "You noted: bring up headcount ask" },
    ],
    actions: [{ label: "Got it, what's urgent?", next: true }],
  },
  // 2: Marcus — urgent, blocking
  {
    type: "item", urgency: "urgent", source: "slack",
    text: "This is your most pressing thing. Marcus and two engineers have been waiting 3 days for your architecture decision — event sourcing vs. CQRS for the payment service. Their sprint work is completely blocked.",
    blocked: [{ n: "Marcus Chen", d: "3 days" }, { n: "Anil Gupta", d: "3 days" }, { n: "Wei Zhang", d: "2 days" }],
    cascade: "If this isn't resolved today, the payment milestone slips to next sprint.",
    why: "Marcus is one of your key collaborators, and this is blocking 3 engineers — that's why it's urgent even though you usually skim these threads.",
    draft: "I've reviewed both approaches. Let's go with event sourcing — better auditability for compliance, and CQRS complexity isn't justified at our scale. Happy to discuss in standup.",
    padNote: "Decided: event sourcing for payment service. Replied to Marcus.",
    actions: [
      { label: "Send this reply", type: "send", id: 1 },
      { label: "Remind me later", type: "later", id: 1 },
      { label: "Skip", type: "skip", id: 1 },
    ],
  },
  // 3: Follow-up from transcript
  {
    type: "item", urgency: "followup", source: "mt",
    text: "This one's from yesterday's 1:1 with your manager. You said you'd share the revised platform migration timeline by Thursday. You didn't write it down — but your meeting transcript caught it. I already noted it on your scratchpad yesterday.",
    isFollowUp: true,
    why: "I caught this from yesterday's meeting transcript — you mentioned it but didn't write it down anywhere. That's why it's here even though it's not in Jira or your calendar.",
    padNote: "Still open: share revised timeline with manager by Thursday",
    actions: [
      { label: "On it — remind me during focus block", type: "later", id: 2 },
      { label: "Already done", type: "done", id: 2 },
      { label: "Skip", type: "skip", id: 2 },
    ],
  },
  // 4: PR review
  {
    type: "item", urgency: "urgent", source: "gh",
    text: "Dev Patel needs your review on a PR — auth token refresh logic. 240 lines across 4 files. It's blocking the login reliability epic, which is a sprint commitment.",
    blocked: [{ n: "Dev Patel", d: "1 day" }],
    cascade: "If this doesn't merge by Wednesday, the login reliability epic is at risk.",
    why: "This PR is blocking a sprint commitment, and I noticed you've only approved 2 of 8 PRs recently — so I'm surfacing this one even though PRs usually take you longer.",
    prSummary: "Token refresh with exponential backoff and rotation. Adds retry logic for expired tokens. Good test coverage. No security concerns. Well-scoped changes.",
    prStats: { add: 180, del: 60, files: 4 },
    padNote: "Approved Dev's auth token refresh PR",
    actions: [
      { label: "Approve PR", type: "approve", id: 3 },
      { label: "Review during focus block", type: "later", id: 3 },
      { label: "Skip", type: "skip", id: 3 },
    ],
  },
  // 5: Jira ticket
  {
    type: "item", urgency: "attention", source: "jira",
    text: "Your API rate limiting ticket — PLATFORM-2847 — is due Friday and still in To Do. This was a sprint commitment. No progress logged.",
    padNote: "PLATFORM-2847 still in To Do — due Friday, needs focus time",
    actions: [
      { label: "Work on this during focus block", type: "later", id: 4 },
      { label: "Skip", type: "skip", id: 4 },
    ],
  },
  // 6: Org signal — team health
  {
    type: "item", urgency: "org", source: "jira",
    text: "Here's something nobody flagged to you, but you should know: three of your engineers have tickets past estimates with no updates this week. Your team's sprint is at risk.",
    isOrg: true,
    orgDetail: [
      { n: "Dev Patel", t: "Auth token refresh", risk: "Blocked on your PR review" },
      { n: "Jamie Lee", t: "CI matrix builds", risk: "2 days over estimate" },
      { n: "Alex Rivera", t: "Search indexing", risk: "Not started, due Monday" },
    ],
    why: "Your team's sprint is at risk — 3 of 6 tickets are behind. As the engineering manager, you should know about this even though nobody directly flagged it to you.",
    padNote: "Sprint health: 3 of 6 tickets at risk. Check in at sprint planning.",
    actions: [
      { label: "Bring up in sprint planning", type: "ack", id: 5 },
      { label: "Skip", type: "skip", id: 5 },
    ],
  },
  // 7: Thread
  {
    type: "item", urgency: "fyi", source: "slack",
    text: "The deployment pipeline thread you started in #eng-platform has 4 new replies. Jamie proposed switching to matrix builds. The team's waiting for your take before making changes.",
    draft: "Matrix builds make sense for our use case. Jamie, can you scope it and share an estimate this sprint?",
    padNote: "Replied to pipeline thread — Jamie scoping matrix builds",
    actions: [
      { label: "Send this reply", type: "send", id: 6 },
      { label: "Remind me later", type: "later", id: 6 },
      { label: "Skip", type: "skip", id: 6 },
    ],
  },
  // 8: Priya
  {
    type: "item", urgency: "fyi", source: "slack",
    text: "Priya from Recruiting asked if you can join an interview panel next Tuesday for a senior backend role. She needs a yes or no by end of day.",
    draft: "Happy to help! Tuesday works. Send over the resume and I'll review beforehand.",
    padNote: "Committed to interview panel next Tuesday",
    actions: [
      { label: "Send this reply", type: "send", id: 7 },
      { label: "Decline", type: "skip", id: 7 },
    ],
  },
  // 9: Lisa — low priority
  {
    type: "item", urgency: "fyi", source: "slack",
    text: "Last one. Lisa Wang left a comment on your API versioning doc asking about backwards compatibility for v1 clients. Non-blocking — she'd appreciate a response when you get a chance.",
    padNote: "Lisa's doc comment still open — respond when free",
    actions: [
      { label: "Handle later", type: "later", id: 8 },
      { label: "Skip", type: "skip", id: 8 },
    ],
  },
  // 10: Closing
  {
    type: "closing",
    text: "That's everything I thought mattered today. 8 items across Slack, Jira, GitHub, your calendar, and yesterday's transcript.",
    subtext: "I also reviewed 11 other things and filtered them out. Want to see what didn't make the cut?",
    actions: [
      { label: "Show me what you filtered", type: "showfilter", id: 99 },
      { label: "I trust you — let's wrap up", type: "next", id: 99 },
    ],
  },
  // 11-13: Filtered batches
  { type: "filtered", text: "Here's what I set aside. I'll be quick.", batch: "slack", batchLabel: "Slack — no action needed",
    items: [
      { ch: "#eng-watercooler", desc: "12 messages — social chat", reason: "No @mentions or action items" },
      { ch: "#company-announcements", desc: "VP Sales posted Q1 wins", reason: "Not relevant to your projects" },
      { ch: "#design-reviews", desc: "3 messages on mobile nav", reason: "Not your project" },
      { ch: "#eng-backend", desc: "4 other threads", reason: "No @mentions for you" },
    ],
    actions: [{ label: "Got it, what else?", type: "next", id: 100 }, { label: "Pull in a thread", type: "pullin_slack", id: 100 }],
  },
  { type: "filtered", text: "A few things already handled or not needing you yet.", batch: "resolved", batchLabel: "Resolved or assigned to others",
    items: [
      { ch: "PLATFORM-2830", desc: "DB index optimization", reason: "Closed by Jamie" },
      { ch: "PR #487", desc: "CSS cleanup", reason: "Approved by Sarah" },
      { ch: "PLATFORM-2819", desc: "Timezone bug", reason: "Alex's — not blocked" },
      { ch: "Issue #203", desc: "Rate limit dashboard", reason: "Open discussion, no decision needed" },
    ],
    actions: [{ label: "Makes sense, next?", type: "next", id: 101 }, { label: "Pull one in", type: "pullin_code", id: 101 }],
  },
  { type: "filtered", text: "And some low-signal notifications.", batch: "noise", batchLabel: "Automated & informational",
    items: [
      { ch: "Google Workspace", desc: "Storage: 72% used", reason: "Automated" },
      { ch: "Onboarding Guide v3", desc: "2 HR edits", reason: "You're a viewer" },
      { ch: "All-hands recording", desc: "Posted to Drive", reason: "No action needed" },
    ],
    actions: [{ label: "All good — let's wrap up", type: "next", id: 102 }],
  },
  // 14: Complete
  { type: "complete" },
];

const FILTERED_COUNT = 11;

/* ═══════════════════════════════════════
   CONVERSATION BRIEF
   ═══════════════════════════════════════ */
function ConversationBrief({ pad, setPad, user = null }) {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [pulledIn, setPulledIn] = useState({});
  const [inputText, setInputText] = useState("");
  const [pendingSlackMessage, setPendingSlackMessage] = useState(null);
  const [briefItems, setBriefItems] = useState([]);
  const [loadingBrief, setLoadingBrief] = useState(true);
  const endRef = useRef(null);
  const initializedRef = useRef(false);
  const allDone = messages.some(m => m.type === "complete");

  const scrollToBottom = useCallback(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  // Load brief items from API
  useEffect(() => {
    const loadBrief = async () => {
      try {
        setLoadingBrief(true);
        // First try to generate brief (in case it's empty)
        await briefAPI.generate();
        // Then fetch items
        const items = await briefAPI.get(50);
        setBriefItems(items);
        
        // Convert backend items to CONVO format for display
        if (items.length > 0) {
          // Create greeting message
          const greeting = {
            type: "assistant",
            text: `Good morning, ${user?.name || 'there'}. I've been watching your apps and found ${items.length} items that need your attention. Let me walk you through them.`
          };
          
          // Convert brief items to conversation format
          const convoItems = items.map(item => ({
            ...item,
            type: item.type,
            source: item.source,
            urgency: item.urgency,
            text: item.text,
            metadata: item.metadata || {},
            blocked: item.metadata?.blocked || [],
            draft: item.metadata?.draft,
            cascade: item.metadata?.cascade,
            why: item.metadata?.why,
            actions: [
              { label: "Got it", type: "ack", id: item.id },
              { label: "Remind me later", type: "later", id: item.id },
              { label: "Skip", type: "skip", id: item.id }
            ]
          }));
          
          // Add calendar item if exists
          const calendarItem = items.find(i => i.type === 'calendar');
          const itemMessages = items.filter(i => i.type === 'item');
          
          setMessages([greeting]);
          if (calendarItem) {
            setTimeout(() => {
              setMessages(m => [...m, calendarItem]);
              setStep(1);
            }, 1500);
          }
          
          // Show first item after calendar
          if (itemMessages.length > 0) {
            setTimeout(() => {
              setMessages(m => [...m, itemMessages[0]]);
              setStep(calendarItem ? 2 : 1);
            }, calendarItem ? 3000 : 2000);
          }
        } else {
          // No items - show empty state
          setMessages([{
            type: "assistant",
            text: "Good morning! No urgent items right now. Connect your integrations (Slack, GitHub, Jira, Calendar) to see your brief items here."
          }]);
        }
      } catch (error) {
        console.error("Failed to load brief:", error);
        // Show error message instead of placeholder data
        const err = error || {};
        const errorMsg = err.response?.status === 401 
          ? "Please log in to see your brief items."
          : err.response?.status === 404
          ? "Backend API not found. Please check your API URL configuration."
          : err.message?.includes('Network Error') || err.code === 'ERR_NETWORK'
          ? `Cannot connect to backend API. Check that:\n1. Backend is running at ${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}\n2. VITE_API_URL is set in Vercel environment variables\n3. Backend CORS is configured correctly`
          : `Failed to load brief: ${err.message || 'Unknown error'}`;
        
        setMessages([{
          type: "assistant",
          text: errorMsg
        }]);
        setStep(0);
      } finally {
        setLoadingBrief(false);
        setTyping(false);
      }
    };
    
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Try to load brief (will fall back to CONVO if API fails)
      setTyping(true);
      loadBrief();
    }
  }, []);

  useEffect(scrollToBottom, [messages, typing, showActions]);
  useEffect(() => {
    if (messages.length > 0) { setShowActions(false); const t = setTimeout(() => setShowActions(true), 400); return () => clearTimeout(t); }
  }, [messages.length]);

  const addToPad = (text, type = "decision") => {
    const now = new Date();
    const time = `Today ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;
    setPad(p => [...p, { from: "agent", text, time, type }]);
  };

  // Helper to advance to next item automatically
  const advanceToNextItem = () => {
    const closingIdx = CONVO.findIndex(c => c.type === "closing");
    const firstFilterIdx = CONVO.findIndex(c => c.type === "filtered");
    const completeIdx = CONVO.findIndex(c => c.type === "complete");
    
    // Find the next item (skip calendar if we're at step 0 or 1)
    let nextStep;
    if (step < 2) {
      nextStep = step + 1; // Move from greeting to calendar, or calendar to first item
    } else if (step >= firstFilterIdx && step < completeIdx - 1) {
      nextStep = step + 1; // Continue through filtered items
    } else if (step < closingIdx) {
      nextStep = step + 1; // Move to next item
    } else if (step === closingIdx) {
      nextStep = completeIdx; // Move to complete
    } else {
      return; // Already at the end
    }

    if (nextStep < CONVO.length) {
      setTimeout(() => {
        setTyping(true);
        scrollToBottom();
        setTimeout(() => {
          setMessages(m => [...m, CONVO[nextStep]]);
          setStep(nextStep);
          setTyping(false);
        }, 600 + Math.random() * 400);
      }, 1500); // Wait 1.5s after action confirmation before showing next item
    }
  };

  const advance = (actionLabel, actionType, itemId) => {
    const currentItem = briefItems.find(item => item.id === itemId) || messages[messages.length - 1];

    // Agent writes to scratchpad based on what happened
    if (actionType === "send" || actionType === "approve") {
      if (currentItem?.padNote) addToPad(currentItem.padNote, "decision");
    } else if (actionType === "later") {
      const shortText = currentItem?.text?.slice(0, 50) || "item";
      addToPad(`Remind later: ${shortText}…`, "reminder");
    } else if (actionType === "ack") {
      if (currentItem?.padNote) addToPad(currentItem.padNote, "decision");
    } else if (actionType === "done") {
      addToPad("Confirmed done: revised timeline shared", "decision");
    }

    // User message
    setMessages(m => [...m, { type: "user", text: actionLabel }]);
    setShowActions(false);

    setTimeout(() => {
      setTyping(true);
      scrollToBottom();
      let nextStep;
      const closingIdx = CONVO.findIndex(c => c.type === "closing");
      const firstFilterIdx = CONVO.findIndex(c => c.type === "filtered");
      const completeIdx = CONVO.findIndex(c => c.type === "complete");

      if (actionType === "showfilter") nextStep = firstFilterIdx;
      else if (step === closingIdx && actionType === "next") nextStep = completeIdx;
      else if (step >= firstFilterIdx && step < completeIdx - 1) nextStep = step + 1;
      else nextStep = step + (step === 0 ? 2 : 1);

      setTimeout(() => {
        if (nextStep < CONVO.length) { setMessages(m => [...m, CONVO[nextStep]]); setStep(nextStep); }
        setTyping(false);
      }, 600 + Math.random() * 400);
    }, 300);
  };

  // Helper to extract context from recent messages
  const getConversationContext = () => {
    const recentMessages = messages.slice(-5).filter(m => m.type === "user" || m.type === "freeresponse" || m.type === "assistant");
    return recentMessages.map(m => {
      if (m.type === "user") return `User: ${m.text}`;
      if (m.type === "freeresponse") return `Assistant: ${m.text}`;
      if (m.type === "assistant") return `Assistant: ${m.text}`;
      return "";
    }).join("\n");
  };

  // Helper to detect Slack message intent and extract details
  const detectSlackMessageIntent = (text) => {
    const lower = text.toLowerCase();
    const slackKeywords = ["slack", "message", "send", "tell", "dm", "direct message", "text"];
    const actionKeywords = ["create", "write", "draft", "compose"];
    const hasSlackIntent = slackKeywords.some(kw => lower.includes(kw)) || actionKeywords.some(kw => lower.includes(kw));
    
    if (!hasSlackIntent) {
      return null;
    }

    // Extract recipient name (common names in the system)
    const names = ["priya", "marcus", "dev", "sarah", "anil", "wei", "jamie", "alex", "lisa"];
    let recipient = null;
    for (const name of names) {
      if (lower.includes(name)) {
        recipient = name.charAt(0).toUpperCase() + name.slice(1);
        break;
      }
    }

    // Extract key information - out of office pattern
    const outOfOfficeMatch = lower.match(/out of office|ooo|out|unavailable|not available|won't be/);
    const dayMatch = lower.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tue|mon|wed|thu|fri|tues)/);
    const alternateSlotsMatch = lower.match(/(alternate|alternative|other|different).*(slot|time|date|day|option)/);
    const sendSlotsMatch = lower.match(/(send|share|give|provide).*(slot|time|date|day|alternate|option)/);

    // Build message content
    let messageContent = "";
    if (outOfOfficeMatch && dayMatch) {
      const day = dayMatch[1];
      // Format day nicely
      const dayFormatted = day.length <= 3 ? day.charAt(0).toUpperCase() + day.slice(1) + "day" : day.charAt(0).toUpperCase() + day.slice(1);
      messageContent = `Hi ${recipient || "there"}, I'm out of office on ${dayFormatted}.`;
      if (alternateSlotsMatch || sendSlotsMatch) {
        messageContent += " Could you please send me some alternate slots?";
      }
    } else {
      // Try to extract the actual message content from various patterns
      // Pattern 1: "tell [person] that [message]"
      let messageMatch = text.match(/(?:tell|say|write|message|send).*?(?:that|:)?\s*(.+)/i);
      if (!messageMatch) {
        // Pattern 2: "create a message to [person] saying [message]"
        messageMatch = text.match(/(?:to|for)\s+(\w+).*?(?:saying|that|:)?\s*(.+)/i);
        if (messageMatch && !recipient) {
          recipient = messageMatch[1].charAt(0).toUpperCase() + messageMatch[1].slice(1);
          messageContent = messageMatch[2].trim();
        }
      } else {
        messageContent = messageMatch[1].trim();
      }
      
      if (!messageContent) {
        // Pattern 3: Extract after "that" or colon
        const thatMatch = text.match(/(?:that|:)\s*(.+)/i);
        if (thatMatch) {
          messageContent = thatMatch[1].trim();
        } else {
          // Fallback: use the text after removing command words
          messageContent = text.replace(/^(create|write|send|tell|message|draft|compose).*?(?:to|that|:)?\s*/i, "").trim();
          // Remove recipient name if it's at the start
          if (recipient && messageContent.toLowerCase().startsWith(recipient.toLowerCase())) {
            messageContent = messageContent.substring(recipient.length).trim();
          }
        }
      }
    }

    // Clean up message content
    if (messageContent) {
      // Remove trailing punctuation that might be from the command
      messageContent = messageContent.replace(/[.,;]+$/, "");
      // Capitalize first letter
      messageContent = messageContent.charAt(0).toUpperCase() + messageContent.slice(1);
    }

    return {
      recipient: recipient || "them",
      content: messageContent || text,
      channel: recipient ? "DM" : "channel"
    };
  };

  const sendFreeText = async () => {
    const text = inputText.trim();
    if (!text || typing) return;
    setInputText("");
    setMessages(m => [...m, { type: "user", text }]);
    setShowActions(false);

    setTyping(true);
    scrollToBottom();
    const lower = text.toLowerCase();
    let response;

      // Check for Slack message creation intent
      const slackIntent = detectSlackMessageIntent(text);
      if (slackIntent) {
        // Show preview of the message
        setPendingSlackMessage({
          recipient: slackIntent.recipient,
          content: slackIntent.content,
          channel: slackIntent.channel
        });
        response = {
          type: "slackpreview",
          recipient: slackIntent.recipient,
          content: slackIntent.content,
          channel: slackIntent.channel
        };
        setTimeout(() => { setMessages(m => [...m, response]); setTyping(false); }, 700 + Math.random() * 500);
        return;
      }

      // Try AI first (but skip for initial Slack message creation which is handled above)
      // However, if there's a pending Slack message and user wants to edit it, let AI handle that
      const isSlackIntent = detectSlackMessageIntent(text);
      const wantsToEditSlack = pendingSlackMessage && (lower.includes("edit") || lower.includes("change") || lower.includes("update") || lower.includes("revise") || lower.includes("make it"));
      
      // Use AI for general conversation OR for editing Slack messages
      if (!isSlackIntent || wantsToEditSlack) {
        // Build full conversation history including all message types
        // Format: Include brief items as context so AI knows what was shown
        const conversationHistory = messages
          .filter(m => m.type === "user" || m.type === "freeresponse" || m.type === "assistant" || m.type === "item" || m.type === "calendar" || m.type === "slackpreview")
          .map(m => {
            if (m.type === "user") {
              return { type: "user", text: m.text };
            } else if (m.type === "freeresponse" || m.type === "assistant") {
              return { type: "assistant", text: m.text || m.content || "" };
            } else if (m.type === "item") {
              // Format brief items clearly for context
              const itemText = `[Brief Item] ${m.text || ""}`;
              return { type: "assistant", text: itemText };
            } else if (m.type === "calendar") {
              return { type: "assistant", text: `[Calendar] ${m.text || "Today's schedule"}` };
            } else if (m.type === "slackpreview") {
              return { type: "assistant", text: `[Slack Preview] Message to ${m.recipient}: "${m.content}"` };
            }
            return null;
          })
          .filter(Boolean);
        
        // Get current item for context
        const currentItem = briefItems.find(item => item.id === messages[messages.length - 1]?.id) || null;
        
        console.log("Attempting AI call for:", text, "with", conversationHistory.length, "messages in history");
        const aiResponse = await getAIResponse(text, conversationHistory, { 
          step, 
          pad, 
          pendingSlackMessage,
          currentItem 
        });
        
        if (aiResponse) {
          console.log("AI response received:", aiResponse);
          
          // If user wants to edit Slack message and AI responded, try to extract the new message
          if (wantsToEditSlack && aiResponse && pendingSlackMessage) {
            // Look for quoted text or message content in the AI response
            // Pattern 1: Text in quotes
            const quotedMatch = aiResponse.match(/"([^"]+)"/);
            // Pattern 2: Text after "say" or "write" or colon
            const sayMatch = aiResponse.match(/(?:say|write|message|tell|make it|change it to).*?(?:that|:)?\s*["']?([^"'.!?]+)["']?/i);
            
            let newContent = null;
            if (quotedMatch && quotedMatch[1].length > 5) {
              newContent = quotedMatch[1].trim();
            } else if (sayMatch && sayMatch[1] && sayMatch[1].length > 5) {
              newContent = sayMatch[1].trim();
            }
            
            if (newContent) {
              setPendingSlackMessage({
                ...pendingSlackMessage,
                content: newContent
              });
              response = {
                type: "slackpreview",
                recipient: pendingSlackMessage.recipient,
                content: newContent,
                channel: pendingSlackMessage.channel
              };
            } else {
              // AI responded but didn't provide new message content - show response as text
              response = { type: "freeresponse", text: aiResponse };
            }
          } else {
            response = { type: "freeresponse", text: aiResponse };
          }
          
          setMessages(m => [...m, response]);
          setTyping(false);
          return;
        } else {
          console.log("AI call failed or returned null, using fallback");
        }
      }

      // Fall back to improved rule-based responses (more conversational)

      // Handle pending Slack message confirmation
      if (pendingSlackMessage && (lower.includes("yes") || lower.includes("send") || lower.includes("confirm") || lower.includes("ok") || lower === "y")) {
        setPendingSlackMessage(null);
        addToPad(`Sent Slack message to ${pendingSlackMessage.recipient}: "${pendingSlackMessage.content}"`, "decision");
        response = { type: "freeresponse", text: `✓ Sent to ${pendingSlackMessage.recipient} on Slack.` };
        setTimeout(() => { 
          setMessages(m => [...m, response]); 
          setTyping(false);
          // Automatically advance to next item after sending
          advanceToNextItem();
        }, 700 + Math.random() * 500);
        return;
      }

      if (pendingSlackMessage && (lower.includes("no") || lower.includes("cancel") || lower === "n")) {
        setPendingSlackMessage(null);
        response = { type: "freeresponse", text: "Got it, I won't send it. Want to revise the message or move on?" };
        setTimeout(() => { setMessages(m => [...m, response]); setTyping(false); }, 700 + Math.random() * 500);
        return;
      }

      // Handle editing pending Slack message
      if (pendingSlackMessage && (lower.includes("edit") || lower.includes("change") || lower.includes("update") || lower.includes("revise"))) {
        // Try to extract new content
        const editMatch = text.match(/(?:edit|change|update|revise|make it|say|write).*?(?:that|:)?\s*(.+)/i);
        if (editMatch && editMatch[1].length > 5) {
          // Update the pending message
          setPendingSlackMessage({
            ...pendingSlackMessage,
            content: editMatch[1].trim()
          });
          response = {
            type: "slackpreview",
            recipient: pendingSlackMessage.recipient,
            content: editMatch[1].trim(),
            channel: pendingSlackMessage.channel
          };
        } else {
          response = { type: "freeresponse", text: "Sure, tell me what you'd like to change in the message. For example, 'change it to say...' or 'make it more formal'." };
        }
        setTimeout(() => { setMessages(m => [...m, response]); setTyping(false); }, 700 + Math.random() * 500);
        return;
      }

      // Get conversation context for better responses
      const context = getConversationContext();
      const hasRecentContext = context.length > 0;

      // Improved rule-based responses (more conversational)
      if (lower.includes("marcus") || lower.includes("who is blocked") || lower.includes("who's blocked")) {
        response = { type: "freeresponse", text: "Marcus Chen is the tech lead on payment migration. He and two engineers (Anil, Wei) have been waiting since Monday for your architecture call. They can't start the event sourcing implementation until you decide. Marcus pinged you twice on Slack." };
      } else if (lower.includes("edit") || lower.includes("change") || lower.includes("rewrite") || lower.includes("rephrase")) {
        // This case is already handled above for pending Slack messages
        if (!pendingSlackMessage) {
          response = { type: "freeresponse", text: "Sure — tell me what you'd like to change and I'll revise the draft. Or type your reply directly and I'll send it as-is." };
        } else {
          // Shouldn't reach here, but fallback
          response = { type: "freeresponse", text: "What would you like to change in the message? I can update it and show you a new preview." };
        }
      } else if (lower.includes("more") || lower.includes("detail") || lower.includes("context") || lower.includes("tell me about") || lower.includes("explain")) {
        const current = briefItems.find(item => item.id === messages[messages.length - 1]?.id) || null;
        if (current?.blocked) {
          response = { type: "freeresponse", text: "Here's the full picture: Marcus originally proposed event sourcing for its audit trail benefits. Anil pushed back with CQRS for read/write separation. The team discussed it in #eng-backend but couldn't agree without your call. Three sprint tickets are parked. Want me to pull up the Slack thread?" };
        } else if (current?.prSummary) {
          response = { type: "freeresponse", text: "Dev's PR touches auth token lifecycle. Main changes: refresh token rotation with exponential backoff (1s to 30s), handles concurrent refresh edge cases, 12 new tests. Clean code, no security concerns. You're the only requested reviewer." };
        } else {
          response = { type: "freeresponse", text: "Let me pull more context. Want me to look at the people involved, the timeline, or the downstream impact?" };
        }
      } else if (lower.includes("skip") || lower.includes("next") || lower.includes("move on") || lower.includes("continue")) {
        setTimeout(() => {
          const nextStep = step + 1;
          if (nextStep < CONVO.length) { setMessages(m => [...m, CONVO[nextStep]]); setStep(nextStep); }
          setTyping(false);
        }, 500);
        return;
      } else if (lower.includes("scratchpad") || lower.includes("pad") || lower.includes("notes")) {
        response = { type: "freeresponse", text: `Your scratchpad has ${pad.length} entries. You can check it anytime using the 📝 tab above. Want to add something?` };
      } else if (lower.includes("how many") || lower.includes("left") || lower.includes("remaining")) {
        const closingIdx = CONVO.findIndex(c => c.type === "closing");
        const itemsLeft = Math.max(0, closingIdx - step - 1);
        response = { type: "freeresponse", text: itemsLeft > 0 ? `${itemsLeft} more to go. Let's continue.` : "We've covered everything. Ready to wrap up?" };
      } else if (lower.includes("add to scratchpad") || lower.includes("note:") || lower.includes("jot down") || lower.includes("remember")) {
        const note = text.replace(/^(add to scratchpad|note:|jot down|remember):?\s*/i, "").trim();
        if (note) {
          const now = new Date();
          const time = `Today ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;
          setPad(p => [...p, { from: "user", text: note, time, type: "user" }]);
          response = { type: "freeresponse", text: `Added to your scratchpad: "${note}". I'll keep that in mind.` };
        } else {
          response = { type: "freeresponse", text: "What would you like me to add to the scratchpad?" };
        }
      } else if (text.length > 30 && !hasRecentContext) {
        // If it's a longer message but we don't have clear context, ask for clarification
        response = { type: "freeresponse", text: "I want to make sure I understand — are you asking me to send this as a message, or is this a question for me? If it's a message, who should I send it to?" };
      } else if (text.length > 30) {
        // Use context to provide a more relevant response
        response = { type: "freeresponse", text: "Got it. Based on our conversation, I'll handle that. Want me to show you what I'm planning to do first, or should I proceed?" };
      } else {
        // More conversational fallback responses
        if (hasRecentContext && (lower.includes("what") || lower.includes("how") || lower.includes("why"))) {
          response = { type: "freeresponse", text: "Let me check the context from our conversation. " + (pendingSlackMessage ? "We were just discussing a Slack message. " : "") + "Can you clarify what specifically you'd like to know?" };
        } else if (lower.includes("?") || lower.startsWith("what") || lower.startsWith("how") || lower.startsWith("why") || lower.startsWith("when") || lower.startsWith("where")) {
          // Questions get more helpful responses
          response = { type: "freeresponse", text: "That's a good question. " + (pendingSlackMessage ? "We have a Slack message pending — should I handle that first, or do you want to continue with your question? " : "Let me help you with that. Can you give me a bit more context?") };
        } else {
          response = { type: "freeresponse", text: "Noted. " + (pendingSlackMessage ? "We still have a Slack message pending — want to send it or edit it? " : "Want to keep going through your brief?") };
        }
      }

      setTimeout(() => { setMessages(m => [...m, response]); setTyping(false); }, 700 + Math.random() * 500);
  };

  const urgColors = {
    urgent: [C.red, C.redS, "Urgent"], followup: [C.pur, C.purS, "Follow-up"],
    attention: [C.org, C.orgS, "Needs attention"], org: [C.org, C.orgS, "Org signal"], fyi: [C.blue, C.blueS, "For awareness"],
  };
  const lastMsg = messages[messages.length - 1];
  const isLast = (i) => i === messages.length - 1;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Subheader */}
      <div style={{ background: "rgba(250,250,248,.95)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.bdr}`, padding: "14px 0", position: "sticky", top: 48, zIndex: 10 }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx2 }}>☀️ Wednesday, February 11</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11.5, color: C.grn, fontWeight: 600 }}>🔥 Day 12</span>
            <Pill c={C.tx2} bg={C.bgS}>📝 {pad.length} notes</Pill>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 24px 160px" }}>
        {messages.map((msg, i) => {
          // User bubble
          if (msg.type === "user") return (
            <Fade key={i}><div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <div style={{ background: C.acc, color: "#fff", borderRadius: "14px 14px 2px 14px", padding: "9px 16px", fontSize: 13.5, fontWeight: 500, maxWidth: "70%" }}>{msg.text}</div>
            </div></Fade>
          );

          // Free-text assistant response
          if (msg.type === "freeresponse") return (
            <Fade key={i} d={100}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
              <GIcon /><div style={{ flex: 1 }}>
                <div style={{ background: C.bgW, borderRadius: "2px 16px 16px 16px", padding: "13px 18px", border: `1px solid ${C.bdr}` }}>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: C.txt }}>{msg.text}</div>
                </div>
              </div>
            </div></Fade>
          );

          // Slack message preview
          if (msg.type === "slackpreview") return (
            <Fade key={i} d={100}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
              <GIcon /><div style={{ flex: 1 }}>
                <div style={{ background: C.bgW, borderRadius: "2px 16px 16px 16px", padding: "13px 18px", border: `1px solid ${C.bdr}` }}>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: C.txt, marginBottom: 12 }}>
                    I've drafted a Slack message for you. Here's what I'm planning to send:
                  </div>
                  <div style={{ background: "#2F3136", borderRadius: 10, padding: "14px 16px", border: "1px solid #383A3E", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <SlackLogo s={16} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#DCDDDE" }}>To: {msg.recipient}</span>
                      <span style={{ fontSize: 11, color: "#72767D" }}>· {msg.channel}</span>
                    </div>
                    <div style={{ color: "#DCDDDE", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
                  </div>
                  <div style={{ fontSize: 13, color: C.tx2, lineHeight: 1.5, marginBottom: 10 }}>
                    Does this look good? Type "send" or "yes" to send it, or "edit" to make changes.
                  </div>
                  {isLast(i) && <Fade d={200}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => {
                      setPendingSlackMessage(null);
                      addToPad(`Sent Slack message to ${msg.recipient}: "${msg.content}"`, "decision");
                      setMessages(m => [...m, { type: "freeresponse", text: `✓ Sent to ${msg.recipient} on Slack.` }]);
                      // Automatically advance to next item after sending
                      setTimeout(() => advanceToNextItem(), 1500);
                    }} style={{ padding: "8px 18px", borderRadius: 20, border: "none", background: C.acc, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>Send</button>
                    <button onClick={() => {
                      setMessages(m => [...m, { type: "freeresponse", text: "Sure, tell me what you'd like to change in the message." }]);
                    }} style={{ padding: "8px 18px", borderRadius: 20, border: `1px solid ${C.bdr}`, background: C.bgW, color: C.tx2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => {
                      setPendingSlackMessage(null);
                      setMessages(m => [...m, { type: "freeresponse", text: "Got it, I won't send it. Want to revise the message or move on?" }]);
                    }} style={{ padding: "8px 18px", borderRadius: 20, border: `1px solid ${C.bdr}`, background: C.bgW, color: C.tx2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  </div></Fade>}
                </div>
              </div>
            </div></Fade>
          );

          // Closing
          if (msg.type === "closing") return (
            <Fade key={i} d={200}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
              <GIcon /><div style={{ flex: 1 }}>
                <div style={{ background: C.bgW, borderRadius: "2px 16px 16px 16px", padding: "13px 18px", border: `1px solid ${C.bdr}` }}>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: C.txt }}>{msg.text}</div>
                  <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.6, color: C.tx2 }}>{msg.subtext}</div>
                </div>
                {isLast(i) && showActions && <Fade d={200}><div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {msg.actions.map((a, j) => (
                    <button key={j} onClick={() => advance(a.label, a.type, a.id)} style={{ padding: "8px 18px", borderRadius: 20, border: j === 0 ? "none" : `1px solid ${C.bdr}`, background: j === 0 ? C.acc : C.bgW, color: j === 0 ? "#fff" : C.tx2, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: j === 0 ? "0 2px 8px rgba(0,0,0,.12)" : "none" }}>{a.label}</button>
                  ))}
                </div></Fade>}
              </div>
            </div></Fade>
          );

          // Filtered batch
          if (msg.type === "filtered") return (
            <Fade key={i} d={100}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
              <GIcon /><div style={{ flex: 1 }}>
                <div style={{ background: C.bgW, borderRadius: "2px 16px 16px 16px", padding: "13px 18px", border: `1px solid ${C.bdr}` }}>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: C.txt, marginBottom: 8 }}>{msg.text}</div>
                  <div style={{ padding: "10px 12px", background: C.bgS, borderRadius: 10 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.tx2, marginBottom: 6, letterSpacing: ".02em" }}>{msg.batchLabel.toUpperCase()}</div>
                    {msg.items.map((f, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0", borderTop: j > 0 ? `1px solid ${C.bdrL}` : "none" }}>
                        <span style={{ color: C.txL, fontSize: 11, marginTop: 2 }}>·</span>
                        <div><span style={{ fontSize: 12.5, color: C.txt, fontWeight: 500 }}>{f.ch}</span><span style={{ fontSize: 12, color: C.txM }}> — {f.desc}</span>
                          <div style={{ fontSize: 11, color: C.txL, fontStyle: "italic" }}>{f.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {isLast(i) && showActions && <Fade d={200}><div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {msg.actions.map((a, j) => {
                    const isPull = a.type.startsWith("pullin");
                    if (isPull && pulledIn[msg.batch]) return <span key={j} style={{ fontSize: 12, color: C.grn, fontWeight: 600, padding: "8px 0" }}>✓ Noted — I'll weight these higher</span>;
                    return <button key={j} onClick={() => { if (isPull) { setPulledIn(p => ({ ...p, [msg.batch]: true })); return; } advance(a.label, a.type, a.id); }} style={{ padding: "8px 18px", borderRadius: 20, border: j === 0 ? "none" : `1px solid ${C.bdr}`, background: j === 0 ? C.acc : C.bgW, color: j === 0 ? "#fff" : C.tx2, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: j === 0 ? "0 2px 8px rgba(0,0,0,.12)" : "none" }}>{a.label}</button>;
                  })}
                </div></Fade>}
              </div>
            </div></Fade>
          );

          // Complete
          if (msg.type === "complete") return (
            <Fade key={i} d={200}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
              <GIcon /><div style={{ flex: 1 }}>
                <div style={{ background: C.bgW, borderRadius: "2px 16px 16px 16px", padding: "16px 20px", border: `1px solid ${C.bdr}`, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.txt, marginBottom: 4, fontFamily: "'Source Serif 4', serif" }}>Brief complete.</div>
                  <div style={{ fontSize: 13.5, color: C.tx2, lineHeight: 1.5 }}>
                    Reviewed {8 + FILTERED_COUNT} items. {pad.length} notes on your scratchpad. It'll carry into tomorrow's brief.
                  </div>
                </div>
                <Fade d={400}>
                  <div style={{ marginTop: 12, padding: "12px 16px", background: C.blueS, borderRadius: 12, border: `1px solid #D6E4FF`, textAlign: "center" }}>
                    <span style={{ fontSize: 13, color: C.blueT }}>📝 Your scratchpad is live in the tab above — jot notes throughout the day. I'll use them for tomorrow's brief.</span>
                  </div>
                </Fade>
              </div>
            </div></Fade>
          );

          // Item messages (calendar, items with urgency)
          const urg = msg.urgency ? urgColors[msg.urgency] : null;
          // Show source logo for calendar type too
          const showSourceLogo = msg.source || msg.type === "calendar";
          const sourceKey = msg.source || (msg.type === "calendar" ? "cal" : null);
          const SourceLogo = sourceKey ? TOOL_LOGOS[sourceKey] : null;
          
          return (
            <Fade key={i} d={100}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
              {showSourceLogo && SourceLogo ? (
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  width: 32, 
                  height: 32, 
                  borderRadius: 8,
                  background: C.bgS,
                  border: `1px solid ${C.bdr}`,
                  flexShrink: 0
                }}>
                  <SourceLogo s={20} />
                </div>
              ) : <GIcon />}
              <div style={{ flex: 1 }}>
                <div style={{
                  background: msg.isFollowUp ? "linear-gradient(135deg, #F6F0FF, #EFF4FF)" : msg.isOrg ? "#FFFDF5" : C.bgW,
                  borderRadius: "2px 16px 16px 16px", padding: "13px 18px",
                  border: `1px solid ${msg.isFollowUp ? "#E0D4F5" : msg.isOrg ? "#F0E4C4" : C.bdr}`,
                }}>
                  {urg && <div style={{ marginBottom: 6, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Source Logo */}
                    {msg.source && (() => {
                      const SourceLogo = TOOL_LOGOS[msg.source];
                      return SourceLogo ? (
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          width: 20, 
                          height: 20, 
                          borderRadius: 4,
                          flexShrink: 0
                        }}>
                          <SourceLogo s={16} />
                        </div>
                      ) : null;
                    })()}
                    <Pill c={urg[0]} bg={urg[1]}>{urg[2]}</Pill>
                    {msg.isFollowUp && <Pill c={C.pur} bg={C.purS}>✨ From transcript</Pill>}
                    {msg.isOrg && <Pill c={C.org} bg={C.orgS}>🏢 Enterprise Graph</Pill>}
                  </div>}
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: C.txt }}>{msg.text}</div>

                  {msg.events && <div style={{ marginTop: 10 }}>
                    {msg.events.map((ev, j) => (
                      <div key={j} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: j > 0 ? `1px solid ${C.bdrL}` : "none" }}>
                        <span style={{ width: 44, fontSize: 12.5, fontWeight: 600, color: C.txt, flexShrink: 0 }}>{ev.t}</span>
                        <div>
                          <span style={{ fontSize: 13, color: ev.focus ? C.blue : C.txt, fontWeight: 500 }}>{ev.n}</span>
                          {ev.focus && <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}> — protect this</span>}
                          {ev.flag && <div style={{ fontSize: 11.5, color: C.org, marginTop: 1 }}>⚡ {ev.flag}</div>}
                        </div>
                      </div>
                    ))}
                  </div>}

                  {msg.blocked && <div style={{ marginTop: 10, padding: "8px 12px", background: C.redS, borderRadius: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: C.red }}>Blocked:</span>
                    {msg.blocked.map(b => <div key={b.n} style={{ display: "flex", alignItems: "center", gap: 4 }}><Av name={b.n} s={20} /><span style={{ fontSize: 12, color: C.txt, fontWeight: 500 }}>{b.n.split(" ")[0]}</span><span style={{ fontSize: 10.5, color: C.txM }}>· {b.d}</span></div>)}
                  </div>}
                  {msg.cascade && <div style={{ marginTop: 6, fontSize: 12, color: C.red, fontWeight: 600 }}>⚠️ {msg.cascade}</div>}

                  {msg.orgDetail && <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.bdrL}` }}>
                    {msg.orgDetail.map((o, j) => <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderBottom: j < 2 ? `1px solid ${C.bdrL}` : "none", background: "#fff" }}>
                      <Av name={o.n} s={22} /><div style={{ flex: 1 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: C.txt }}>{o.n}</span><span style={{ fontSize: 11.5, color: C.txM, marginLeft: 6 }}>{o.t}</span></div><Pill c={C.org} bg={C.orgS}>{o.risk}</Pill>
                    </div>)}
                  </div>}

                  {msg.draft && <div style={{ marginTop: 10, padding: "10px 14px", background: C.bgS, borderRadius: 10, border: `1px solid ${C.bdrL}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 3, letterSpacing: ".02em" }}>DRAFT REPLY</div>
                    <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.55 }}>{msg.draft}</div>
                  </div>}

                  {msg.prSummary && <div style={{ marginTop: 10, padding: "10px 14px", background: C.grnS, borderRadius: 10, border: `1px solid #D1F0DD` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.grn, marginBottom: 3, letterSpacing: ".02em" }}>AI CHANGE SUMMARY</div>
                    <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.55 }}>{msg.prSummary}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12 }}>
                      <span style={{ color: C.grn, fontWeight: 600 }}>+{msg.prStats.add}</span>
                      <span style={{ color: C.red, fontWeight: 600 }}>-{msg.prStats.del}</span>
                      <span style={{ color: C.txM }}>{msg.prStats.files} files</span>
                    </div>
                  </div>}

                  {msg.why && <div style={{ marginTop: 10, padding: "8px 12px", background: C.blueS, borderRadius: 8, fontSize: 12, color: C.blueT, lineHeight: 1.5 }}>
                    <strong>Why I'm showing this:</strong> {msg.why}
                  </div>}
                </div>

                {isLast(i) && msg.actions && showActions && <Fade d={200}><div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {msg.actions.map((a, j) => (
                    <button key={j} onClick={() => advance(a.label, a.type || "next", a.id)} style={{
                      padding: "8px 18px", borderRadius: 20,
                      border: j === 0 ? "none" : `1px solid ${C.bdr}`,
                      background: j === 0 ? C.acc : C.bgW, color: j === 0 ? "#fff" : C.tx2,
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      boxShadow: j === 0 ? "0 2px 8px rgba(0,0,0,.12)" : "none",
                    }}>{a.label}</button>
                  ))}
                </div></Fade>}
              </div>
            </div></Fade>
          );
        })}

        {typing && <Fade><div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <GIcon /><div style={{ display: "flex", gap: 4, padding: "12px 16px", background: C.bgW, borderRadius: "2px 14px 14px 14px", border: `1px solid ${C.bdr}` }}>
            {[0, 1, 2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: C.txL, animation: `blink 1.2s ease ${j * .2}s infinite` }} />)}
          </div>
        </div></Fade>}
        <style>{`@keyframes blink{0%,100%{opacity:.3;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}`}</style>
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      {!allDone && <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20, background: "rgba(250,250,248,.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.bdr}`, padding: "12px 0" }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bgW, border: `1px solid ${C.bdr}`, borderRadius: 24, padding: "4px 4px 4px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
            <input value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFreeText(); } }}
              placeholder={typing ? "Glean is typing…" : "Ask questions, edit drafts, or type a reply…"}
              disabled={typing}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: C.txt, fontFamily: "'DM Sans', sans-serif", padding: "8px 0" }} />
            <button onClick={sendFreeText} disabled={!inputText.trim() || typing}
              style={{ width: 36, height: 36, borderRadius: 20, border: "none", background: inputText.trim() && !typing ? C.acc : C.bgS, color: inputText.trim() && !typing ? "#fff" : C.txL, cursor: inputText.trim() && !typing ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all .15s" }}>↑</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

/* ═══════════════════════════════════════
   SCRATCHPAD TAB — full page view
   ═══════════════════════════════════════ */
function ScratchpadView({ pad, setPad }) {
  const [input, setInput] = useState("");
  const addNote = () => {
    if (!input.trim()) return;
    const now = new Date();
    const time = `Today ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;
    setPad(p => [...p, { from: "user", text: input.trim(), time, type: "user" }]);
    setInput("");
  };

  const typeIcons = { observation: "👁", followup: "↩", carryover: "📌", decision: "✓", reminder: "⏰", user: "✎" };
  const typeColors = { observation: C.tx2, followup: C.pur, carryover: C.org, decision: C.grn, reminder: C.blue, user: C.blue };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "68px 24px 120px" }}>
        <Fade>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.txt, margin: "0 0 4px", fontFamily: "'Source Serif 4', serif" }}>📝 Scratchpad</h2>
            <p style={{ fontSize: 13.5, color: C.tx2, margin: 0, lineHeight: 1.5 }}>
              A shared space between you and Glean. The agent jots observations throughout the day. You can add your own notes. Everything here feeds into tomorrow's brief.
            </p>
          </div>
        </Fade>

        {/* Input at top */}
        <Fade d={100}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addNote(); }}
              placeholder="Jot a note — it'll carry into tomorrow's brief…"
              style={{ flex: 1, padding: "10px 16px", borderRadius: 12, border: `1px solid ${C.bdr}`, background: C.bgW, fontSize: 14, color: C.txt, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
            <button onClick={addNote} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: input.trim() ? C.acc : C.bgS, color: input.trim() ? "#fff" : C.txL, fontSize: 13, fontWeight: 600, cursor: input.trim() ? "pointer" : "default", transition: "all .15s" }}>Add</button>
          </div>
        </Fade>

        {/* Entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[...pad].reverse().map((p, i) => (
            <Fade key={i} d={i < 3 ? i * 80 : 0}>
              <div style={{
                display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10,
                background: p.from === "user" ? C.blueS : C.bgW,
                border: `1px solid ${p.from === "user" ? "#D6E4FF" : C.bdr}`,
              }}>
                <span style={{ fontSize: 14, marginTop: 1 }}>{typeIcons[p.type] || "·"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.5 }}>{p.text}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 11, color: C.txM }}>
                    <span style={{ color: typeColors[p.type] || C.txM, fontWeight: 600 }}>{p.from === "user" ? "You" : "Glean"}</span>
                    <span>{p.time}</span>
                  </div>
                </div>
              </div>
            </Fade>
          ))}
        </div>

        {/* Footer */}
        <Fade d={200}>
          <div style={{ marginTop: 20, padding: "12px 16px", background: C.bgS, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: C.txM, lineHeight: 1.5 }}>
              This scratchpad feeds into your long-term memory. Over time, patterns here — what you track, what you ignore, what you note — shape how your brief is prioritized.
            </div>
          </div>
        </Fade>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SLACK
   ═══════════════════════════════════════ */
function Slack() {
  const [replied, setReplied] = useState({});
  return (
    <div style={{ minHeight: "100vh", background: "#1A1D21", color: "#D1D2D3" }}>
      <div style={{ background: "#1A1D21", borderBottom: "1px solid #383A3E", padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
        <GIcon s={22} /><span style={{ fontWeight: 900, color: "#fff", fontSize: 14, fontFamily: "'Lato',sans-serif" }}>Glean</span><Pill c="#B9BBBE" bg="rgba(255,255,255,.06)">APP</Pill>
      </div>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px", fontFamily: "'Lato',sans-serif" }}>
        <Fade d={200}><div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <GIcon s={34} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontWeight: 900, color: "#fff", fontSize: 14 }}>Glean</span><span style={{ fontSize: 11.5, color: "#72767D" }}>9:00 AM</span>
            </div>
            <div style={{ color: "#DCDDDE", fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
              ☀️ Good morning! Your brief is ready — 3 urgent items. Here's the quick version:
            </div>
            <div style={{ background: "#2F3136", borderRadius: 8, borderLeft: "4px solid #ED4245", padding: "12px 16px", marginBottom: 8 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Marcus is blocked (3 days)</div>
              <div style={{ color: "#B9BBBE", fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>3 engineers stuck on your architecture decision.</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>{["Marcus", "Anil", "Wei"].map(n => <Av key={n} name={n} s={18} />)}</div>
              {!replied[1] ? <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setReplied(r => ({ ...r, 1: true }))} style={{ padding: "6px 14px", borderRadius: 4, border: "none", background: "#5865F2", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Send drafted reply</button>
                <button style={{ padding: "6px 14px", borderRadius: 4, border: "1px solid #4F545C", background: "transparent", color: "#B9BBBE", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Later</button>
              </div> : <span style={{ color: "#3BA55D", fontSize: 12, fontWeight: 700 }}>✓ Sent to #eng-backend</span>}
            </div>
            <div style={{ background: "#2F3136", borderRadius: 8, borderLeft: "4px solid #A78BFA", padding: "12px 16px", marginBottom: 8 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 2 }}>✨ Follow-up from your 1:1</div>
              <div style={{ color: "#B9BBBE", fontSize: 13, lineHeight: 1.5 }}>Share revised timeline by Thursday. Caught from transcript.</div>
            </div>
            <div style={{ background: "#2F3136", borderRadius: 8, borderLeft: "4px solid #ED4245", padding: "12px 16px", marginBottom: 8 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 2 }}>PR blocking sprint</div>
              <div style={{ color: "#B9BBBE", fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>Dev's auth token refresh — 240 lines.</div>
              {!replied[3] ? <button onClick={() => setReplied(r => ({ ...r, 3: true }))} style={{ padding: "6px 14px", borderRadius: 4, border: "none", background: "#3BA55D", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓ Approve</button>
                : <span style={{ color: "#3BA55D", fontSize: 12, fontWeight: 700 }}>✓ Approved</span>}
            </div>
            <div style={{ color: "#72767D", fontSize: 12.5, marginTop: 8 }}>5 more items in your <a href="#" style={{ color: "#00AFF4", textDecoration: "none" }} onClick={e => e.preventDefault()}>full brief →</a></div>
          </div>
        </div></Fade>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   DAY 0 — Setup + Memory Reveal
   ═══════════════════════════════════════ */
function Day0({ onDone }) {
  const [step, setStep] = useState("intro");
  const [tools, setTools] = useState([
    { id: "slack", n: "Slack", on: true }, { id: "cal", n: "Google Calendar", on: true },
    { id: "jira", n: "Jira", on: true }, { id: "gh", n: "GitHub", on: true },
    { id: "mt", n: "Meeting Transcripts", on: false },
  ]);
  const [progress, setProgress] = useState(0);
  const [revIdx, setRevIdx] = useState(0);

  useEffect(() => {
    if (step === "build") {
      const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setTimeout(() => setStep("reveal"), 500); return 100; } return p + 1.5; }), 60);
      return () => clearInterval(iv);
    }
  }, [step]);

  useEffect(() => {
    if (step === "reveal" && revIdx < 3) { const t = setTimeout(() => setRevIdx(i => i + 1), 500); return () => clearTimeout(t); }
  }, [step, revIdx]);

  const mem = [
    { i: "🧠", t: "Personal Memory", v: "Key people, projects, work rhythm, and your response patterns", src: "Built from 30 days of activity across all your tools", layer: "Personal" },
    { i: "🏢", t: "Team Memory", v: "Your team structure, sprint health, and cross-team dependencies", src: "From Enterprise Graph and Jira tracking", layer: "Team" },
    { i: "📅", t: "Recent Activity", v: "Yesterday's meetings, open follow-ups, and active threads", src: "Updated daily from Calendar, transcripts, and Slack", layer: "Recent" },
  ];

  const stages = ["Scanning Slack messages…", "Analyzing calendar patterns…", "Reading Jira activity…", "Mapping GitHub contributions…", "Building your memory profile…"];

  if (step === "intro") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Fade><div style={{ textAlign: "center", maxWidth: 440, padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><GIcon s={48} /></div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.txt, margin: "0 0 8px", fontFamily: "'Source Serif 4', serif", lineHeight: 1.2 }}>Start every day<br />knowing what matters.</h1>
        <p style={{ color: C.tx2, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 28px" }}>A 10-minute conversation with Glean every morning. It learns your work, surfaces what needs you, and helps you handle it — all without leaving.</p>
        <button onClick={() => setStep("tools")} style={{ padding: "11px 28px", borderRadius: 24, border: "none", background: C.acc, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>Get Started</button>
      </div></Fade>
    </div>
  );

  if (step === "tools") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Fade><div style={{ maxWidth: 440, padding: "0 24px", width: "100%" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.txt, margin: "0 0 4px", textAlign: "center", fontFamily: "'Source Serif 4', serif" }}>Your tools are connected</h2>
        <p style={{ color: C.tx2, fontSize: 13.5, margin: "0 0 24px", textAlign: "center" }}>We'll read 30 days of activity to build your memory profile.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
          {tools.map(t => {
            const Logo = TOOL_LOGOS[t.id];
            return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "11px 14px", borderRadius: 10, background: C.bgW, border: `1px solid ${C.bdr}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: C.bgS, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, flexShrink: 0 }}>
                {Logo && <Logo s={18} />}
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.txt, flex: 1 }}>{t.n}</span>
              {t.on ? <span style={{ color: C.grn, fontSize: 12, fontWeight: 600 }}>✓ Connected</span>
                : <button onClick={() => setTools(ts => ts.map(x => x.id === t.id ? { ...x, on: true } : x))} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.bdr}`, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.tx2 }}>Connect</button>}
            </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center" }}>
          <button onClick={() => setStep("build")} style={{ padding: "10px 24px", borderRadius: 20, border: "none", background: C.acc, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Build My Memory →</button>
        </div>
      </div></Fade>
    </div>
  );

  if (step === "build") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Fade><div style={{ maxWidth: 380, textAlign: "center", padding: "0 24px" }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: C.bgS, border: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: `3px solid ${C.blue}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.txt, margin: "0 0 4px" }}>Building your memory</h2>
        <p style={{ color: C.tx2, fontSize: 13, margin: "0 0 20px" }}>Analyzing 30 days of activity across your tools.</p>
        <div style={{ height: 3, background: C.bdrL, borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: C.acc, borderRadius: 2, transition: "width .2s" }} />
        </div>
        <p style={{ fontSize: 12, color: C.txM }}>{stages[Math.min(Math.floor(progress / 20), stages.length - 1)]}</p>
      </div></Fade>
    </div>
  );

  // Reveal
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 480, padding: "0 24px", width: "100%" }}>
        <Fade><div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.txt, margin: "0 0 4px", fontFamily: "'Source Serif 4', serif" }}>🧠 Here's your memory profile</h2>
          <p style={{ color: C.tx2, fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>This is what the agent knows about you. It uses this to decide what shows up in your brief — and what doesn't. You can edit anytime.</p>
        </div></Fade>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {mem.map((m, i) => (
            <Fade key={i} d={i * 400}>
              <div style={{ padding: "14px 16px", borderRadius: 12, background: revIdx > i ? C.bgW : C.bgS, border: `1px solid ${revIdx > i ? C.bdr : "transparent"}`, opacity: revIdx > i ? 1 : .12, transition: "all .5s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{m.i}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>{m.t}</span>
                  <Pill c={C.blue} bg={C.blueS}>{m.layer}</Pill>
                </div>
                <div style={{ fontSize: 13.5, color: C.txt, fontWeight: 500, marginBottom: 4 }}>{m.v}</div>
                <div style={{ fontSize: 11, color: C.txM, lineHeight: 1.4 }}>{m.src}</div>
              </div>
            </Fade>
          ))}
        </div>
        {revIdx >= 3 && <Fade d={200}>
          <div style={{ padding: "12px 16px", background: C.blueS, borderRadius: 10, marginBottom: 16, textAlign: "center" }}>
            <span style={{ fontSize: 12.5, color: C.blueT, lineHeight: 1.5 }}>This memory is already seeding your first scratchpad. Tomorrow's brief will be personalized from day one.</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <button onClick={onDone} style={{ padding: "10px 24px", borderRadius: 20, border: "none", background: C.acc, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Show Me My Brief →</button>
          </div>
        </Fade>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MEMORY VIEW — see what the system knows
   ═══════════════════════════════════════ */
function MemoryView() {
  const [editing, setEditing] = useState(null);
  const [memory, setMemory] = useState([
    { 
      id: "personal", 
      name: "Personal Memory", 
      icon: "🧠", 
      color: C.blue, 
      bg: C.blueS, 
      desc: "What I know about you — your work patterns, priorities, and habits.", 
      items: [
        { id: "people", label: "Key people", value: "Marcus Chen, Sarah Kim, Dev Patel, Priya Sharma, Alex Rivera", source: "Communication frequency across Slack, Calendar, Docs" },
        { id: "projects", label: "Active projects", value: "Payment Migration, Platform Reliability, Q2 Roadmap", source: "Jira boards, Slack channels, edited Docs" },
        { id: "rhythm", label: "Work rhythm", value: "Busiest Tue/Wed, lightest Thu, deep work 1–3 PM", source: "Calendar density + Slack response times" },
        { id: "patterns", label: "Response patterns", value: "DMs: 12 min, PRs: 8 hours, Doc comments: 2 days", source: "Measured across all apps" },
        { id: "priorities", label: "Your priorities", value: "You consistently note manager prep items — elevated in brief ordering", source: "Scratchpad pattern analysis" },
      ]
    },
    { 
      id: "team", 
      name: "Team Memory", 
      icon: "🏢", 
      color: C.grn, 
      bg: C.grnS, 
      desc: "Your team structure and health signals.", 
      items: [
        { id: "structure", label: "Your team", value: "6 direct reports, Eng Backend, under VP Engineering", source: "Enterprise Graph org structure" },
        { id: "health", label: "Sprint health", value: "3 of 6 tickets at risk — crossed threshold", source: "Jira sprint tracking + team rollup" },
        { id: "dependencies", label: "Cross-team", value: "Payment migration depends on Platform team's API release", source: "Dependency graph from Jira + Slack" },
      ]
    },
    { 
      id: "recent", 
      name: "Recent Activity", 
      icon: "📅", 
      color: C.org, 
      bg: C.orgS, 
      desc: "What happened yesterday and today.", 
      items: [
        { id: "meetings", label: "Yesterday's meetings", value: "4 meetings — 1:1 with Sarah, Sprint Review, 1:1 with Manager, Team Standup", source: "Calendar + transcript extraction" },
        { id: "followups", label: "Open follow-ups", value: "Share revised timeline (from manager 1:1), review Sarah's design doc", source: "Meeting transcript action items" },
        { id: "threads", label: "Active threads", value: "3 Slack threads with new replies since yesterday", source: "Slack activity monitoring" },
      ]
    },
  ]);

  const handleEdit = (layerId, itemId, newValue) => {
    setMemory(m => m.map(layer => 
      layer.id === layerId 
        ? { ...layer, items: layer.items.map(item => item.id === itemId ? { ...item, value: newValue } : item) }
        : layer
    ));
    setEditing(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "68px 24px 40px" }}>
        <Fade>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.txt, margin: "0 0 4px", fontFamily: "'Source Serif 4', serif" }}>🧠 Your Memory Profile</h2>
          <p style={{ fontSize: 13.5, color: C.tx2, margin: "0 0 6px", lineHeight: 1.5 }}>This is what I know about you. I use this to decide what appears in your brief and in what order. Click any value to edit it.</p>
          <div style={{ padding: "10px 14px", background: C.blueS, borderRadius: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: C.blueT }}>💡 Memory → Brief: Each item in your brief is prioritized using this memory. The "Why this is here" box explains my reasoning.</span>
          </div>
        </Fade>

        {memory.map((layer, i) => (
          <Fade key={i} d={i * 100}>
            <div style={{ marginBottom: 16, background: C.bgW, borderRadius: 14, border: `1px solid ${C.bdr}`, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: layer.bg, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{layer.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.txt }}>{layer.name}</div>
                  <div style={{ fontSize: 11, color: C.tx2 }}>{layer.desc}</div>
                </div>
              </div>
              <div style={{ padding: "8px 16px 12px" }}>
                {layer.items.map((item, j) => {
                  const editKey = `${layer.id}-${item.id}`;
                  const isEditing = editing === editKey;
                  return (
                    <div key={j} style={{ padding: "8px 0", borderTop: j > 0 ? `1px solid ${C.bdrL}` : "none" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 2 }}>{item.label}</div>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                          <input
                            type="text"
                            defaultValue={item.value}
                            onBlur={(e) => handleEdit(layer.id, item.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleEdit(layer.id, item.id, e.target.value);
                              } else if (e.key === "Escape") {
                                setEditing(null);
                              }
                            }}
                            autoFocus
                            style={{ 
                              flex: 1, 
                              padding: "6px 10px", 
                              borderRadius: 6, 
                              border: `1px solid ${C.blue}`, 
                              background: C.bgW, 
                              fontSize: 13, 
                              color: C.txt,
                              outline: "none",
                              fontFamily: "inherit"
                            }}
                          />
                          <button
                            onClick={() => setEditing(null)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              border: `1px solid ${C.bdr}`,
                              background: C.bgW,
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.tx2,
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div 
                          style={{ 
                            fontSize: 13, 
                            color: C.txt, 
                            lineHeight: 1.4,
                            cursor: "pointer",
                            padding: "4px 6px",
                            borderRadius: 4,
                            margin: "-4px -6px",
                            transition: "background .15s"
                          }}
                          onClick={() => setEditing(editKey)}
                          onMouseEnter={(e) => e.currentTarget.style.background = C.bgS}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          title="Click to edit"
                        >
                          {item.value}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: C.txL, marginTop: 2 }}>{item.source}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Fade>
        ))}

        <Fade d={300}>
          <div style={{ padding: "14px 16px", background: C.bgS, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 12.5, color: C.txM, lineHeight: 1.6 }}>
              Memory updates automatically as you use the brief. You can edit anything above to correct or refine what I know about you.
            </div>
          </div>
        </Fade>
      </div>
    </div>
  );
}

/* ═══ LOGIN VIEW ═══ */
function LoginView({ onLogin }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        const data = await authAPI.login(email, password || undefined);
        onLogin(data.user);
      } else {
        const data = await authAPI.register(email, name, password || undefined);
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "'DM Sans', -apple-system, sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ 
        maxWidth: 400, 
        width: "100%",
        margin: "20px",
        padding: 40, 
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700, color: "#1a1a1a" }}>
          {isLogin ? "Welcome back" : "Get started"}
        </h2>
        <p style={{ marginBottom: 32, fontSize: 14, color: "#666" }}>
          {isLogin ? "Sign in to your account" : "Create a new account to continue"}
        </p>
        {error && (
          <div style={{ 
            padding: 12, 
            marginBottom: 20, 
            background: "#fee", 
            border: "1px solid #fcc",
            borderRadius: 6,
            color: "#c33",
            fontSize: 14
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ 
                width: "100%", 
                padding: 12, 
                marginBottom: 12, 
                borderRadius: 6, 
                border: "1px solid #ddd",
                fontSize: 14,
                boxSizing: "border-box"
              }}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ 
              width: "100%", 
              padding: 12, 
              marginBottom: 12, 
              borderRadius: 6, 
              border: "1px solid #ddd",
              fontSize: 14,
              boxSizing: "border-box"
            }}
          />
          <input
            type="password"
            placeholder="Password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: "100%", 
              padding: 12, 
              marginBottom: 20, 
              borderRadius: 6, 
              border: "1px solid #ddd",
              fontSize: 14,
              boxSizing: "border-box"
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: "100%", 
              padding: 14, 
              background: loading ? "#999" : "#667eea", 
              color: "#fff", 
              border: "none", 
              borderRadius: 6, 
              cursor: loading ? "not-allowed" : "pointer", 
              fontWeight: 600,
              fontSize: 15,
              transition: "background 0.2s"
            }}
          >
            {loading ? "Loading..." : (isLogin ? "Sign in" : "Create account")}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{ 
            marginTop: 20, 
            background: "transparent", 
            border: "none", 
            color: "#667eea", 
            cursor: "pointer",
            fontSize: 14,
            textDecoration: "underline"
          }}
        >
          {isLogin ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

/* ═══ APP ═══ */
export default function App() {
  const [tab, setTab] = useState("day0");
  const [pad, setPad] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await authAPI.getMe();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (err) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        fontFamily: "'DM Sans', -apple-system, sans-serif"
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={(userData) => { 
      setUser(userData); 
      setIsAuthenticated(true); 
    }} />;
  }

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=DM+Sans:wght@400;500;600;700&family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
      <Nav a={tab} set={setTab} padCount={pad.length} />
      <div style={{ paddingTop: 48 }}>
        {tab === "day0" && <Day0 onDone={() => setTab("brief")} />}
        {tab === "brief" && <ConversationBrief pad={pad} setPad={setPad} user={user} />}
        {tab === "pad" && <ScratchpadView pad={pad} setPad={setPad} />}
        {tab === "memory" && <MemoryView />}
        {tab === "slack" && <Slack />}
      </div>
    </div>
  );
}
