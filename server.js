import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";
import Stripe from "stripe";
import { waitUntil } from "@vercel/functions";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Clients ────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MAX_HISTORY_TURNS = 20; // keep last 20 exchanges to avoid huge context

// ─── System prompt – נינה ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `אתה נינה – יועצת שינה AI מקצועית לתינוקות ופעוטות.
את מדברת עברית בלבד. את חמה, אמפתית, מקצועית ולא שיפוטית.

הידע שלך:
• גישה התנהגותית (CIO/Ferber) – מגיל 6 חודשים
• גישה עדינה (Fading / Chair Method) – מגיל 4 חודשים
• גישת שגרה וסביבה – מתאים לכולם
• גישה היקשרותית (Attachment-based) – ללא גיל מינימום

יכולות שלך:
1. לנתח הרגלי שינה ולספק אבחון ראשוני
2. לבנות תוכנית שינה אישית לפי גיל, טמפרמנט ואורח חיי המשפחה
3. לנתח שגרות הרדמה שהורים מתארים ולתת פידבק מעשי
4. לבנות דוח לילה יומי אם ההורה שולח נתוני לילה
5. לתת עצות לסביבת שינה (חדר, רעש לבן, טמפרטורה, תאורה)
6. לענות על שאלות בשעה 3 בלילה בסבלנות ובאהבה

כללים:
- תמיד שאלי על גיל התינוק אם לא ידוע לך
- אל תמליצי על שיטה מסוימת לפני שהבנת את הצרכים
- ציני תמיד שאת לא מחליפה רופא ילדים לגבי שאלות רפואיות
- שמרי על תשובות קצרות וברורות – הורים עייפים לא קוראים טקסטים ארוכים
- השתמשי באמוג'ים מינימלי ורק כשזה עוזר להבהיר
- אם ההורה מתאר מצב דחוף או מסוכן – הפני מיד לרופא`;

// ─── Supabase helpers ────────────────────────────────────────────────────────

async function loadHistory(phone) {
  const { data, error } = await supabase
    .from("conversations")
    .select("messages")
    .eq("phone_number", phone)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found – that's fine, it's a new user
    throw error;
  }

  return data?.messages ?? [];
}

async function saveHistory(phone, messages) {
  // Trim to last MAX_HISTORY_TURNS pairs before saving
  const maxMessages = MAX_HISTORY_TURNS * 2;
  const trimmed = messages.length > maxMessages
    ? messages.slice(messages.length - maxMessages)
    : messages;

  const { error } = await supabase
    .from("conversations")
    .upsert(
      { phone_number: phone, messages: trimmed },
      { onConflict: "phone_number" }
    );

  if (error) throw error;
}

// ─── Claude ──────────────────────────────────────────────────────────────────

async function askClaude(phone, userMessage) {
  const history = await loadHistory(phone);

  history.push({ role: "user", content: userMessage });

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const assistantText = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  history.push({ role: "assistant", content: assistantText });

  await saveHistory(phone, history);

  return assistantText;
}

async function sendWhatsApp(to, body) {
  await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to,
    body,
  });
}

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Static Files ──────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get("/auth.html", (req, res) => {
  res.sendFile(join(__dirname, 'auth.html'));
});

app.get("/quiz.html", (req, res) => {
  res.sendFile(join(__dirname, 'quiz.html'));
});

app.get("/payment.html", (req, res) => {
  res.sendFile(join(__dirname, 'payment.html'));
});

app.get("/success.html", (req, res) => {
  res.sendFile(join(__dirname, 'success.html'));
});

// ─── Public Config Endpoint ────────────────────────────────────────────────

app.get("/config", (req, res) => {
  // Return public Stripe config
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  });
});

// ─── Stripe Checkout ───────────────────────────────────────────────────────

app.post("/stripe-checkout", async (req, res) => {
  const { email, userId } = req.body;

  if (!email || !userId) {
    return res.status(400).json({ message: "Missing email or userId" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // Monthly subscription price ID
          quantity: 1,
        },
      ],
      success_url: `https://ninababysleep.com/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VERCEL_URL || "http://localhost:3000"}/payment.html`,
      metadata: {
        userId: userId,
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Twilio WhatsApp webhook
app.post("/webhook", async (req, res) => {
  // Twilio sends the webhook as URL-encoded form data
  const incomingMsg = req.body.Body?.trim();
  const from = req.body.From; // e.g. "whatsapp:+972501234567"

  if (!incomingMsg || !from) {
    return res.status(400).send("Missing Body or From");
  }

  console.log(`[${new Date().toISOString()}] 📨 ${from}: ${incomingMsg}`);

  // Respond immediately with empty TwiML so Twilio doesn't retry
  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");

  // waitUntil keeps the Vercel function alive after the response is sent
  // so Claude can finish processing without hitting the 5s timeout
  waitUntil(
    (async () => {
      try {
        const reply = await askClaude(from, incomingMsg);
        console.log(`[${new Date().toISOString()}] 🌙 נינה → ${from}: ${reply.slice(0, 80)}...`);
        await sendWhatsApp(from, reply);
      } catch (err) {
        console.error("Error processing message:", err);
        try {
          await sendWhatsApp(
            from,
            "מצטערת, נתקלתי בבעיה טכנית. נסי שוב בעוד כמה דקות 🌙"
          );
        } catch (sendErr) {
          console.error("Failed to send error message:", sendErr);
        }
      }
    })()
  );
});

// Reset conversation
app.post("/reset/:phone", async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("phone_number", phone);

  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, message: `שיחה אופסה עבור ${phone}` });
});

// Active conversations status
app.get("/status", async (_req, res) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("phone_number, messages, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return res.status(500).json({ ok: false, error: error.message });

  const stats = data.map((row) => ({
    phone: row.phone_number,
    turns: row.messages.length / 2,
    lastActivity: row.updated_at,
  }));

  res.json({ activeConversations: stats.length, conversations: stats });
});

// ─── Start ────────────────────────────────────────────────────────────────────

// On Vercel we export the app; locally we call listen()
if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🌙 נינה פועלת על פורט ${PORT}`);
    console.log(`   Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`   Status:      http://localhost:${PORT}/status\n`);
  });
}

export default app;
